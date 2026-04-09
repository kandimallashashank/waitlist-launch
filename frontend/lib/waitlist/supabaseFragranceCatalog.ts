/**
 * Read-only fragrance catalog for waitlist Layering Lab via Supabase (no FastAPI).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Escape `%` and `_` for safe use inside PostgREST `ilike` patterns.
 *
 * Args:
 *   raw: User-provided search substring.
 *
 * Returns:
 *   String safe to embed in `*.ilike.%…%` filters.
 */
function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Load one active perfume with card prices for layering / Groq context.
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *   id: Fragrance UUID.
 *
 * Returns:
 *   Row shaped like FastAPI ``GET /api/v1/fragrances/:id``, or null if missing.
 */
export async function fetchFragranceDetailFromSupabase(
  supabase: SupabaseClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data: perfume, error: pErr } = await supabase
    .from("perfumes")
    .select(
      "id, name, brand_name, primary_image_url, scent_family, gender_score, sillage, longevity_hours, main_accords, notes_top, notes_middle, notes_base, seasons, occasions, concentration, is_active",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (pErr || !perfume) {
    return null;
  }

  const { data: card } = await supabase
    .from("v_perfumes_card")
    .select("price_3ml, price_8ml, price_12ml")
    .eq("id", id)
    .maybeSingle();

  return {
    ...perfume,
    price_3ml: card?.price_3ml ?? undefined,
    price_8ml: card?.price_8ml ?? undefined,
    price_12ml: card?.price_12ml ?? undefined,
  } as Record<string, unknown>;
}

/**
 * Search card view rows for layering slot picker (mirrors FastAPI ``/layering/search``).
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *   params: Query text, max rows, optional scent family filter.
 *
 * Returns:
 *   List of card rows.
 *
 * Raises:
 *   Error: When Supabase returns an error.
 */
export async function searchFragrancesForLayering(
  supabase: SupabaseClient,
  params: { q: string; limit: number; family: string },
): Promise<Record<string, unknown>[]> {
  const limit = Math.min(Math.max(params.limit, 1), 60);
  let query = supabase
    .from("v_perfumes_card")
    .select(
      "id, name, brand_name, primary_image_url, price_3ml, price_8ml, price_12ml, scent_family, concentration",
    )
    .limit(limit);

  const q = params.q.trim();
  if (q) {
    const esc = escapeIlikePattern(q);
    query = query.or(
      `name.ilike.%${esc}%,brand_name.ilike.%${esc}%`,
    );
  }

  const fam = params.family.trim();
  if (fam) {
    const escF = escapeIlikePattern(fam);
    query = query.ilike("scent_family", `%${escF}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Record<string, unknown>[];
}
