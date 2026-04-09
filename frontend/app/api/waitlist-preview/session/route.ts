import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { WAITLIST_LAYERING_LIFETIME_LIMIT } from "@/lib/waitlist/groqLayering";
import { enrichQuizRecommendationsWithImages } from "@/lib/waitlist/enrichQuizRecommendationImages";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

type QuizResultRec = {
  id: string;
  slug?: string | null;
  brand: string;
  name: string;
  image_url?: string | null;
  match_score?: number;
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
    out.push({
      id,
      slug: typeof o.slug === "string" ? o.slug : null,
      brand: typeof o.brand === "string" ? o.brand : "",
      name: typeof o.name === "string" ? o.name : "Fragrance",
      image_url: imageUrl,
      match_score:
        typeof o.match_score === "number" ? o.match_score : undefined,
    });
  }
  return out;
}

/**
 * Session summary for preview UI (layering tries left, quiz done).
 */
export async function GET(req: Request) {
  try {
    const email = await getWaitlistEmailFromRequest(req);
    if (!email) {
      return NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500 },
      );
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

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

    const used = count ?? 0;
    return NextResponse.json({
      email,
      quiz_completed,
      quiz_result,
      layering_used: used,
      layering_remaining: Math.max(0, WAITLIST_LAYERING_LIFETIME_LIMIT - used),
      layering_limit: WAITLIST_LAYERING_LIFETIME_LIMIT,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { detail: "Session error", code: "ERROR" },
      { status: 500 },
    );
  }
}
