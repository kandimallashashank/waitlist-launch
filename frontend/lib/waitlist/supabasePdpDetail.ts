/**
 * PDP fragrance payload from Supabase (mirrors FastAPI ``get_fragrance_detail`` enough for waitlist UI).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build ``available_sizes`` from merged price columns when ``perfume_prices`` is not loaded.
 *
 * Args:
 *   merged: Row with optional ``price_*ml`` / ``original_price_*ml``.
 *
 * Returns:
 *   Array of size objects for the PDP size picker.
 */
function buildAvailableSizesFromPrices(
  merged: Record<string, unknown>,
): Record<string, unknown>[] {
  const sizes: Record<string, unknown>[] = [];
  let order = 0;
  for (const sc of ["3ml", "8ml", "12ml"] as const) {
    const p = merged[`price_${sc}`];
    if (typeof p !== "number") continue;
    const op = merged[`original_price_${sc}`];
    sizes.push({
      size_code: sc,
      price: p,
      original_price: typeof op === "number" ? op : null,
      label: sc,
      display_order: order,
      badge: null,
    });
    order += 1;
  }
  return sizes;
}

/**
 * Load full PDP JSON for one fragrance id (active only).
 *
 * Args:
 *   supabase: Service-role client.
 *   id: UUID.
 *
 * Returns:
 *   Merged ``perfumes`` + ``v_perfumes_card`` document, or null if not found.
 */
export async function fetchPdpDetailFromSupabase(
  supabase: SupabaseClient,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data: perfume, error: pErr } = await supabase
    .from("perfumes")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (pErr || !perfume) {
    return null;
  }

  const { data: card } = await supabase
    .from("v_perfumes_card")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const p = perfume as Record<string, unknown>;
  const c = (card ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...p, ...c };

  if (!merged.available_sizes || !Array.isArray(merged.available_sizes)) {
    merged.available_sizes = buildAvailableSizesFromPrices(merged);
  }

  return merged;
}
