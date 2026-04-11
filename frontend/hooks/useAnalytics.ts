"use client";

/**
 * PostHog events for the waitlist pilot (dedicated project; see ``NEXT_PUBLIC_WAITLIST_POSTHOG_KEY``).
 *
 * Canonical names for dashboards:
 * - Funnel: waitlist_quiz_started → waitlist_quiz_step_viewed → waitlist_quiz_completed
 * - Gift: waitlist_gift_quiz_started → waitlist_gift_quiz_step_viewed → waitlist_gift_quiz_completed
 * - Layering: layering_lab_analyzed, layering_lab_blend_saved, layering_lab_banner_viewed, layering_lab_cta_clicked
 * - Catalog: product_viewed, shop_all_filter_applied
 * - Pilot feedback: waitlist_pilot_survey_submitted | waitlist_pilot_survey_skipped
 * - Errors: waitlist_quiz_submit_failed, waitlist_gift_quiz_submit_failed
 *
 * Every event includes ``app_surface: waitlist_pilot`` for filtering if keys are ever shared.
 */

import { useMemo } from "react";

import {
  initWaitlistPosthogClient,
  posthog,
} from "@/lib/posthogWaitlist";

const BASE_PROPS = { app_surface: "waitlist_pilot" as const };

function capture(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  initWaitlistPosthogClient();
  if (!posthog.__loaded) return;
  posthog.capture(event, { ...BASE_PROPS, ...properties });
}

export type WaitlistQuizFlow = "scent";

export type WaitlistPilotSurveyKind = "scent_quiz" | "gift_finder";

export function useAnalytics() {
  return useMemo(
    () => ({
      identify: (userId: string, properties?: Record<string, unknown>) => {
        initWaitlistPosthogClient();
        if (!posthog.__loaded) return;
        posthog.identify(userId, { ...BASE_PROPS, ...properties });
      },
      reset: () => {
        initWaitlistPosthogClient();
        if (!posthog.__loaded) return;
        posthog.reset();
      },

      productViewed: (
        product: {
          id: string;
          name: string;
          brand?: string;
          price?: number;
        },
        source?: string,
      ) => {
        capture("product_viewed", {
          product_id: product.id,
          product_name: product.name,
          brand: product.brand,
          price: product.price,
          source: source ?? "direct",
        });
      },

      shopAllFilterApplied: (facets: Record<string, unknown>) => {
        capture("shop_all_filter_applied", { facets });
      },

      layeringLabBannerViewed: (source: string) => {
        capture("layering_lab_banner_viewed", { source });
      },
      layeringLabCtaClicked: (source: string) => {
        capture("layering_lab_cta_clicked", { source });
      },
      layeringLabAnalyzed: (
        fragranceCount: number,
        harmonyScore: number,
        aiPowered: boolean,
      ) => {
        capture("layering_lab_analyzed", {
          fragrance_count: fragranceCount,
          harmony_score: harmonyScore,
          ai_powered: aiPowered,
        });
      },
      layeringLabBlendSaved: (harmonyScore: number) => {
        capture("layering_lab_blend_saved", { harmony_score: harmonyScore });
      },

      waitlistQuizStarted: (flow: WaitlistQuizFlow) => {
        capture("waitlist_quiz_started", { flow });
      },
      waitlistQuizStepViewed: (props: {
        step_id: string;
        step_index: number;
        total_steps: number;
        flow: WaitlistQuizFlow;
      }) => {
        capture("waitlist_quiz_step_viewed", {
          step_id: props.step_id,
          step_index: props.step_index,
          total_question_steps: props.total_steps,
          flow: props.flow,
        });
      },
      waitlistQuizCompleted: (flow: WaitlistQuizFlow, recommendationCount: number) => {
        capture("waitlist_quiz_completed", {
          flow,
          recommendation_count: recommendationCount,
        });
      },
      waitlistQuizSubmitFailed: (flow: WaitlistQuizFlow, message: string) => {
        capture("waitlist_quiz_submit_failed", {
          flow,
          error_message: message.slice(0, 500),
        });
      },
      waitlistQuizRetaken: (flow: WaitlistQuizFlow) => {
        capture("waitlist_quiz_retaken", { flow });
      },

      waitlistGiftQuizStarted: () => {
        capture("waitlist_gift_quiz_started", {});
      },
      waitlistGiftQuizStepViewed: (props: {
        step_id: string;
        step_index: number;
        total_steps: number;
      }) => {
        capture("waitlist_gift_quiz_step_viewed", {
          step_id: props.step_id,
          step_index: props.step_index,
          total_question_steps: props.total_steps,
        });
      },
      waitlistGiftQuizIntroViewed: () => {
        capture("waitlist_gift_quiz_intro_viewed", {});
      },
      waitlistGiftQuizCompleted: (recommendationCount: number) => {
        capture("waitlist_gift_quiz_completed", {
          recommendation_count: recommendationCount,
        });
      },
      waitlistGiftQuizSubmitFailed: (message: string) => {
        capture("waitlist_gift_quiz_submit_failed", {
          error_message: message.slice(0, 500),
        });
      },
      waitlistGiftQuizRetaken: () => {
        capture("waitlist_gift_quiz_retaken", {});
      },

      waitlistPilotSurveySubmitted: (
        kind: WaitlistPilotSurveyKind,
        props: { too_long_rating?: number; tag_count?: number; had_free_text?: boolean },
      ) => {
        capture("waitlist_pilot_survey_submitted", {
          survey_kind: kind,
          too_long_rating: props.too_long_rating,
          tag_count: props.tag_count,
          had_free_text: props.had_free_text,
        });
      },
      waitlistPilotSurveySkipped: (kind: WaitlistPilotSurveyKind) => {
        capture("waitlist_pilot_survey_skipped", { survey_kind: kind });
      },

      waitlistGateShown: (featureName: string) => {
        capture("waitlist_gate_shown", {
          feature_name: featureName,
        });
      },
    }),
    [],
  );
}
