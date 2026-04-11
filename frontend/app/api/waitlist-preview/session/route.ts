import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { WAITLIST_LAYERING_LIFETIME_LIMIT } from "@/lib/waitlist/groqLayering";
import { enrichQuizRecommendationsWithImages } from "@/lib/waitlist/enrichQuizRecommendationImages";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { normalizeWaitlistEmail } from "@/lib/waitlist/emailValidation";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

/** Avoid CDN/browser serving stale quiz state after submit or retake. */
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  "CDN-Cache-Control": "private, no-store",
  "Vercel-CDN-Cache-Control": "private, no-store",
} as const;

type QuizResultRec = {
  id: string;
  slug?: string | null;
  brand: string;
  name: string;
  image_url?: string | null;
  match_score?: number;
  match_reasons?: string[];
};

/**
 * Map stored recommendation_snapshot rows to the quiz results panel shape.
 *
 * Args:
 *   snap: JSON from ``waitlist_quiz_preferences.recommendation_snapshot``.
 *
 * Returns:
 *   List of recommendation objects with stable ids.
 */
function mapRecommendationSnapshot(snap: unknown): QuizResultRec[] {
  if (!Array.isArray(snap)) {
    return [];
  }
  const out: QuizResultRec[] = [];
  for (const item of snap) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : "";
    if (!id) {
      continue;
    }
    const fromPrimary =
      typeof o.primary_image_url === "string" ? o.primary_image_url : null;
    const fromImage = typeof o.image_url === "string" ? o.image_url : null;
    const imageUrl = (fromImage || fromPrimary)?.trim() || null;
    const matchReasonsRaw = o.match_reasons;
    const match_reasons = Array.isArray(matchReasonsRaw)
      ? matchReasonsRaw.filter((x): x is string => typeof x === "string")
      : undefined;

    out.push({
      id,
      slug: typeof o.slug === "string" ? o.slug : null,
      brand: typeof o.brand === "string" ? o.brand : "",
      name: typeof o.name === "string" ? o.name : "Fragrance",
      image_url: imageUrl,
      match_score:
        typeof o.match_score === "number" ? o.match_score : undefined,
      match_reasons:
        match_reasons && match_reasons.length ? match_reasons : undefined,
    });
  }
  return out;
}

/**
 * Session summary for preview UI (layering tries left, quiz done).
 */
export async function GET(req: Request) {
  try {
    const sessionEmail = await getWaitlistEmailFromRequest(req);
    const email = sessionEmail ? normalizeWaitlistEmail(sessionEmail) : null;
    if (!email) {
      return NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }

    const { data: waitlistRow } = await supabase
      .from("waitlist")
      .select("full_name")
      .eq("email", email)
      .maybeSingle();
    const wl = waitlistRow as { full_name?: string | null } | null;
    const display_name =
      (typeof wl?.full_name === "string" && wl.full_name.trim()) ||
      email.split("@")[0] ||
      "there";

    const { count } = await supabase
      .from("waitlist_layering_events")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .eq("success", true);

    const { data: quizRows } = await supabase
      .from("waitlist_quiz_preferences")
      .select(
        "answers, recommendation_snapshot, scent_profile, preference_analytics",
      )
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1);

    const quizRow = quizRows?.[0] as
      | {
          answers?: unknown;
          recommendation_snapshot?: unknown;
          scent_profile?: unknown;
          preference_analytics?: unknown;
        }
      | undefined;

    const quiz_completed = Boolean(quizRows?.length);
    let quiz_result: {
      answers: unknown;
      recommendations: QuizResultRec[];
      scent_profile: unknown;
      preference_analytics: unknown;
    } | null = null;
    if (quiz_completed && quizRow) {
      const mapped = mapRecommendationSnapshot(
        quizRow.recommendation_snapshot,
      );
      const recommendations = await enrichQuizRecommendationsWithImages(
        supabase,
        mapped,
      );
      quiz_result = {
        answers: quizRow.answers,
        recommendations,
        scent_profile: quizRow.scent_profile ?? null,
        preference_analytics: quizRow.preference_analytics ?? null,
      };
    }

    const { data: giftRows, error: giftSelErr } = await supabase
      .from("waitlist_gift_preferences")
      .select(
        "derived_quiz_answers, recommendation_snapshot, scent_profile, preference_analytics",
      )
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (giftSelErr) {
      console.warn("waitlist_gift_preferences session load:", giftSelErr.message);
    }

    const giftRow =
      !giftSelErr && giftRows?.length
        ? (giftRows[0] as {
            derived_quiz_answers?: unknown;
            recommendation_snapshot?: unknown;
            scent_profile?: unknown;
            preference_analytics?: unknown;
          })
        : undefined;

    const gift_completed = Boolean(!giftSelErr && giftRows?.length);
    let gift_result: {
      answers: unknown;
      recommendations: QuizResultRec[];
      scent_profile: unknown;
      preference_analytics: unknown;
    } | null = null;
    if (giftRow) {
      const mapped = mapRecommendationSnapshot(
        giftRow.recommendation_snapshot,
      );
      const recommendations = await enrichQuizRecommendationsWithImages(
        supabase,
        mapped,
      );
      gift_result = {
        answers: giftRow.derived_quiz_answers,
        recommendations,
        scent_profile: giftRow.scent_profile ?? null,
        preference_analytics: giftRow.preference_analytics ?? null,
      };
    }

    const used = count ?? 0;
    return NextResponse.json(
      {
        email,
        display_name,
        quiz_completed,
        quiz_result,
        gift_completed,
        gift_result,
        layering_used: used,
        layering_remaining: Math.max(0, WAITLIST_LAYERING_LIFETIME_LIMIT - used),
        layering_limit: WAITLIST_LAYERING_LIFETIME_LIMIT,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { detail: "Session error", code: "ERROR" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
