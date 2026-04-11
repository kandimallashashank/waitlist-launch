import { NextResponse } from "next/server";

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import {
  parseWaitlistGiftAnswersInput,
  waitlistGiftAnswersToQuizPayload,
} from "@/lib/waitlist/giftToQuizPayload";
import { mergeGiftAnchorPerfumesIntoPayload } from "@/lib/waitlist/mergeGiftAnchorIntoPayload";
import { saveWaitlistGiftPreferences } from "@/lib/waitlist/quizPreferencesDb";
import { touchPilotQuizCompleted } from "@/lib/waitlist/pilotFollowupState";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { generatePreferenceKpiSummaryGroq } from "@/lib/waitlist/quizKpiGroqSummary";
import { runWaitlistQuizSupabasePipeline } from "@/lib/waitlist/quizSupabaseVectorPipeline";
import { normalizeWaitlistEmail } from "@/lib/waitlist/emailValidation";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

export const dynamic = "force-dynamic";

/** Embeddings cold start + optional Groq KPI summary; match quiz submit ceiling. */
export const maxDuration = 120;

/**
 * Gift recommendations: same vector pipeline as the scent quiz, optional anchor notes
 * (quiz step 2 parity), Groq KPI blurb. Persists to ``waitlist_gift_preferences`` (not quiz prefs).
 */
export async function POST(req: Request) {
  try {
    const sessionEmail = await getWaitlistEmailFromRequest(req);
    const email = sessionEmail ? normalizeWaitlistEmail(sessionEmail) : null;
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
      answers?: unknown;
    };
    const giftAnswers = parseWaitlistGiftAnswersInput(body.answers);
    if (!giftAnswers) {
      return NextResponse.json(
        {
          detail: "Invalid body: complete gift answers required",
          code: "VALIDATION",
        },
        { status: 400 },
      );
    }

    let quizPayload = waitlistGiftAnswersToQuizPayload(giftAnswers);
    quizPayload = await mergeGiftAnchorPerfumesIntoPayload(
      supabase,
      quizPayload,
      giftAnswers.anchor_perfume_ids ?? [],
    );

    const {
      recommendations: recommendationsFull,
      scent_profile,
      preference_analytics: kpiBase,
      recommendation_snapshot,
    } = await runWaitlistQuizSupabasePipeline(supabase, quizPayload);

    const aiSummary = await generatePreferenceKpiSummaryGroq(kpiBase, {
      voice: "gift_recipient",
      giftAnswers: quizPayload,
      giftQuizInput: giftAnswers,
    });
    const preference_analytics: PreferenceAnalyticsData = {
      ...kpiBase,
      ai_summary: aiSummary,
      computed_at: new Date().toISOString(),
    };

    const recommendations = recommendationsFull.slice(0, 12).map((r) => ({
      id: r.id,
      slug: r.slug ?? null,
      brand: r.brand,
      name: r.name,
      image_url: r.image_url,
      match_score: r.match_score,
    }));

    try {
      await saveWaitlistGiftPreferences(
        supabase,
        email,
        giftAnswers,
        quizPayload,
        recommendation_snapshot,
        {
          scent_profile,
          preference_analytics,
        },
      );
      try {
        await touchPilotQuizCompleted(supabase, email);
      } catch (touchErr) {
        console.warn("waitlist gift: pilot followup touch failed", touchErr);
      }
    } catch (persistErr) {
      console.error("waitlist gift persist failed:", persistErr);
      return NextResponse.json(
        { detail: "Could not save gift results", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      recommendations,
      preference_analytics,
      scent_profile,
      answers: quizPayload,
      pipeline: "next_supabase_vector_gift_groq",
      preferences_saved: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gift recommendations failed";
    console.error("waitlist gift recommend:", err);
    return NextResponse.json(
      { detail: msg, code: "GIFT_ERROR" },
      { status: 500 },
    );
  }
}
