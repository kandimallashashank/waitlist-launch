import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import {
  WAITLIST_LAYERING_LIFETIME_LIMIT,
  analyzeLayeringWithGroq,
} from "@/lib/waitlist/groqLayering";
import { touchPilotLayeringSuccess } from "@/lib/waitlist/pilotFollowupState";
import { getWaitlistQuizAnswersJson } from "@/lib/waitlist/quizPreferencesDb";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

/**
 * Waitlist layering analyze: Groq + lifetime cap per email.
 */
export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => ({}))) as {
      fragrance_ids?: string[];
    };
    const ids = Array.isArray(body.fragrance_ids)
      ? body.fragrance_ids.filter((x): x is string => typeof x === "string")
      : [];
    if (ids.length < 1 || ids.length > 3) {
      return NextResponse.json(
        { detail: "Provide 1–3 fragrance_ids", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const { count, error: countErr } = await supabase
      .from("waitlist_layering_events")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .eq("success", true);

    if (countErr) {
      console.error(countErr);
      return NextResponse.json(
        { detail: "Could not check rate limit", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    const used = count ?? 0;
    if (used >= WAITLIST_LAYERING_LIFETIME_LIMIT) {
      return NextResponse.json(
        {
          detail: `Pilot limit: ${WAITLIST_LAYERING_LIFETIME_LIMIT} layering analyses per waitlist signup. Thanks for testing full limits at launch.`,
          code: "waitlist_layering_lifetime_limit",
        },
        { status: 429 },
      );
    }

    const quizAnswers = await getWaitlistQuizAnswersJson(supabase, email);
    const userContext =
      quizAnswers != null ? JSON.stringify(quizAnswers).slice(0, 6000) : undefined;

    const result = (await analyzeLayeringWithGroq(ids, userContext)) as Record<
      string,
      unknown
    >;

    const harmony_score = Number(result.harmony_score) || 0;
    const summary =
      typeof result.summary === "string"
        ? result.summary.slice(0, 500)
        : "";
    const harmony_label =
      typeof result.harmony_label === "string" ? result.harmony_label : null;

    await supabase.from("waitlist_layering_events").insert({
      email,
      fragrance_ids: ids,
      success: true,
      harmony_score,
      harmony_label: harmony_label,
      summary_snippet: summary.slice(0, 280),
      response_snapshot: result,
    });

    await touchPilotLayeringSuccess(supabase, email);

    const remaining = Math.max(0, WAITLIST_LAYERING_LIFETIME_LIMIT - used - 1);
    result.rate_limit = {
      limit: WAITLIST_LAYERING_LIFETIME_LIMIT,
      remaining,
      resets_at_utc: new Date(Date.now() + 86400e6).toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analyze failed";
    console.error("waitlist layering:", err);
    return NextResponse.json(
      { detail: msg, code: "LAYERING_ERROR" },
      { status: 500 },
    );
  }
}
