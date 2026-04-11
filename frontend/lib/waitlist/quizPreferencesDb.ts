/**
 * Persist waitlist quiz preferences via Supabase upsert on ``email`` (unique).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeWaitlistEmail } from "@/lib/waitlist/emailValidation";

/**
 * Save quiz answers and recommendation snapshot for a waitlist email.
 *
 * Args:
 *   supabase: Service client.
 *   email: Waitlist email (normalized to lowercase).
 *   answers: Quiz answers JSON.
 *   recommendationSnapshot: Serializable recommendation list.
 *   options: Optional ``scent_profile`` / ``preference_analytics`` JSON (columns added via migration).
 */
export async function saveWaitlistQuizPreferences(
  supabase: SupabaseClient,
  email: string,
  answers: unknown,
  recommendationSnapshot: unknown,
  options?: {
    scent_profile?: unknown;
    preference_analytics?: unknown;
  },
): Promise<void> {
  const normalized = normalizeWaitlistEmail(email);
  const now = new Date().toISOString();

  const profilePatch =
    options?.scent_profile !== undefined
      ? { scent_profile: options.scent_profile }
      : {};
  const analyticsPatch =
    options?.preference_analytics !== undefined
      ? { preference_analytics: options.preference_analytics }
      : {};

  const { error } = await supabase.from("waitlist_quiz_preferences").upsert(
    {
      email: normalized,
      answers,
      recommendation_snapshot: recommendationSnapshot,
      quiz_completed_at: now,
      updated_at: now,
      ...profilePatch,
      ...analyticsPatch,
    },
    { onConflict: "email" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Load quiz preferences row for layering compatibility context.
 *
 * Args:
 *   supabase: Service client.
 *   email: Normalized email.
 *
 * Returns:
 *   Answers object or null.
 */
export async function getWaitlistQuizAnswersJson(
  supabase: SupabaseClient,
  email: string,
): Promise<unknown | null> {
  const normalized = normalizeWaitlistEmail(email);
  const { data, error } = await supabase
    .from("waitlist_quiz_preferences")
    .select("answers")
    .eq("email", normalized)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data?.length) {
    return null;
  }
  return (data[0] as { answers?: unknown }).answers ?? null;
}

/**
 * Save gift finder answers and snapshot (separate from ``waitlist_quiz_preferences``).
 *
 * Args:
 *   supabase: Service client.
 *   email: Normalized email.
 *   giftAnswers: Raw gift wizard payload (recipient, avoids, presets, anchors, …).
 *   derivedQuizAnswers: Pipeline ``QuizAnswersPayload`` used for search (audit / results UI).
 *   recommendationSnapshot: Serializable recommendation list (same shape as quiz snapshot).
 *   options: Optional ``scent_profile`` / ``preference_analytics`` JSON.
 */
export async function saveWaitlistGiftPreferences(
  supabase: SupabaseClient,
  email: string,
  giftAnswers: unknown,
  derivedQuizAnswers: unknown,
  recommendationSnapshot: unknown,
  options?: {
    scent_profile?: unknown;
    preference_analytics?: unknown;
  },
): Promise<void> {
  const normalized = normalizeWaitlistEmail(email);
  const now = new Date().toISOString();

  const profilePatch =
    options?.scent_profile !== undefined
      ? { scent_profile: options.scent_profile }
      : {};
  const analyticsPatch =
    options?.preference_analytics !== undefined
      ? { preference_analytics: options.preference_analytics }
      : {};

  const { error } = await supabase.from("waitlist_gift_preferences").upsert(
    {
      email: normalized,
      gift_answers: giftAnswers,
      derived_quiz_answers: derivedQuizAnswers,
      recommendation_snapshot: recommendationSnapshot,
      gift_completed_at: now,
      updated_at: now,
      ...profilePatch,
      ...analyticsPatch,
    },
    { onConflict: "email" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
