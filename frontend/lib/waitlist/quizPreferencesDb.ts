/**
 * Persist waitlist quiz preferences (no unique on plain email in DB use select + update/insert).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Save quiz answers and recommendation snapshot for a waitlist email.
 *
 * Args:
 *   supabase: Service client.
 *   email: Normalized email.
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
  const now = new Date().toISOString();
  const { data: existing, error: selErr } = await supabase
    .from("waitlist_quiz_preferences")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (selErr) {
    throw new Error(selErr.message);
  }

  const row = existing?.[0] as { id?: string } | undefined;

  const profilePatch =
    options?.scent_profile !== undefined
      ? { scent_profile: options.scent_profile }
      : {};
  const analyticsPatch =
    options?.preference_analytics !== undefined
      ? { preference_analytics: options.preference_analytics }
      : {};

  if (row?.id) {
    const { error } = await supabase
      .from("waitlist_quiz_preferences")
      .update({
        answers,
        recommendation_snapshot: recommendationSnapshot,
        quiz_completed_at: now,
        updated_at: now,
        ...profilePatch,
        ...analyticsPatch,
      })
      .eq("id", row.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("waitlist_quiz_preferences").insert({
    email,
    answers,
    recommendation_snapshot: recommendationSnapshot,
    quiz_completed_at: now,
    created_at: now,
    updated_at: now,
    ...profilePatch,
    ...analyticsPatch,
  });
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
  const { data, error } = await supabase
    .from("waitlist_quiz_preferences")
    .select("answers")
    .eq("email", email)
    .limit(1);

  if (error || !data?.length) {
    return null;
  }
  return (data[0] as { answers?: unknown }).answers ?? null;
}
