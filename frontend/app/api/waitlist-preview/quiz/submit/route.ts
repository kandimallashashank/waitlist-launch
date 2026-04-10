import { NextResponse } from "next/server";

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { generatePreferenceKpiSummaryGroq } from "@/lib/waitlist/quizKpiGroqSummary";
import { touchPilotQuizCompleted } from "@/lib/waitlist/pilotFollowupState";
import { saveWaitlistQuizPreferences } from "@/lib/waitlist/quizPreferencesDb";
import { runWaitlistQuizSupabasePipeline } from "@/lib/waitlist/quizSupabaseVectorPipeline";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

export const dynamic = "force-dynamic";

/** Embeddings cold start + Groq KPI summary; Vercel Hobby still caps at 10s. */
export const maxDuration = 120;

/**
 * Waitlist quiz submit: embeddings in Node (all-mpnet-base-v2) + Supabase ``search_fragrances_full``.
 * Persists answers, recommendations, scent profile, KPI analytics, and optional Groq ``ai_summary``.
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
      answers?: Record<string, unknown>;
    };
    if (!body.answers || typeof body.answers !== "object") {
      return NextResponse.json(
        { detail: "Invalid body: answers required", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const answers = body.answers as QuizAnswersPayload;

    // ── Idempotency: if this email already has results, return them directly ──
    const { data: existingRows } = await supabase
      .from("waitlist_quiz_preferences")
      .select("answers, recommendation_snapshot, scent_profile, preference_analytics")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1);

    const existingRow = existingRows?.[0] as
      | { answers?: unknown; recommendation_snapshot?: unknown; scent_profile?: unknown; preference_analytics?: unknown }
      | undefined;

    if (existingRow?.recommendation_snapshot) {
      const snap = existingRow.recommendation_snapshot;
      const recommendations = Array.isArray(snap)
        ? snap.slice(0, 12).map((r: Record<string, unknown>) => ({
            id: String(r.id ?? ""),
            slug: typeof r.slug === "string" ? r.slug : null,
            brand: typeof r.brand === "string" ? r.brand : "",
            name: typeof r.name === "string" ? r.name : "Fragrance",
            image_url: typeof r.image_url === "string" ? r.image_url : null,
            match_score: typeof r.match_score === "number" ? r.match_score : undefined,
          }))
        : [];
      return NextResponse.json({
        recommendations,
        preference_analytics: existingRow.preference_analytics ?? null,
        scent_profile: existingRow.scent_profile ?? null,
        pipeline: "cached",
      });
    }
    // ── End idempotency check ──

    const {
      recommendations: recommendationsFull,
      scent_profile,
      preference_analytics: kpiBase,
      recommendation_snapshot,
    } = await runWaitlistQuizSupabasePipeline(supabase, answers);

    const aiSummary = await generatePreferenceKpiSummaryGroq(kpiBase);
    const preference_analytics: PreferenceAnalyticsData = {
      ...kpiBase,
      ai_summary: aiSummary,
      computed_at: new Date().toISOString(),
    };

    await saveWaitlistQuizPreferences(
      supabase,
      email,
      body.answers,
      recommendation_snapshot,
      {
        scent_profile,
        preference_analytics,
      },
    );
    await touchPilotQuizCompleted(supabase, email);

    const recommendations = recommendationsFull.slice(0, 12).map((r) => ({
      id: r.id,
      slug: r.slug ?? null,
      brand: r.brand,
      name: r.name,
      image_url: r.image_url,
      match_score: r.match_score,
    }));

    return NextResponse.json({
      recommendations,
      preference_analytics,
      scent_profile,
      pipeline: "next_supabase_vector",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Quiz failed";
    console.error("waitlist quiz submit:", err);
    return NextResponse.json(
      { detail: msg, code: "QUIZ_ERROR" },
      { status: 500 },
    );
  }
}
