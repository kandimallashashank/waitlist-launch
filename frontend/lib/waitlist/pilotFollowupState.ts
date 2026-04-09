/**
 * Merge updates into waitlist_pilot_followup (single row per email).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mark quiz completed time for pilot email scheduling.
 *
 * Args:
 *   supabase: Service client.
 *   email: Normalized email.
 */
export async function touchPilotQuizCompleted(
  supabase: SupabaseClient,
  email: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: row } = await supabase
    .from("waitlist_pilot_followup")
    .select("layering_first_success_at, followup_email_sent_at")
    .eq("email", email)
    .maybeSingle();

  await supabase.from("waitlist_pilot_followup").upsert(
    {
      email,
      quiz_completed_at: now,
      layering_first_success_at: row?.layering_first_success_at ?? null,
      followup_email_sent_at: row?.followup_email_sent_at ?? null,
      updated_at: now,
    },
    { onConflict: "email" },
  );
}

/**
 * Mark first successful layering (only sets timestamp once).
 *
 * Args:
 *   supabase: Service client.
 *   email: Normalized email.
 */
export async function touchPilotLayeringSuccess(
  supabase: SupabaseClient,
  email: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: row } = await supabase
    .from("waitlist_pilot_followup")
    .select("quiz_completed_at, layering_first_success_at, followup_email_sent_at")
    .eq("email", email)
    .maybeSingle();

  const firstLayer =
    row?.layering_first_success_at ?? now;

  await supabase.from("waitlist_pilot_followup").upsert(
    {
      email,
      quiz_completed_at: row?.quiz_completed_at ?? null,
      layering_first_success_at: firstLayer,
      followup_email_sent_at: row?.followup_email_sent_at ?? null,
      updated_at: now,
    },
    { onConflict: "email" },
  );
}
