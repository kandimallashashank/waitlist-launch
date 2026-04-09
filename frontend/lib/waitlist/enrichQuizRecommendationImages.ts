/**
 * Fills missing quiz recommendation image URLs from ``perfumes`` (service-role Supabase).
 * Catalog PLP often has images from the same rows; quiz RPC snapshots can omit URLs in some DB states.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal row shape for enrichment (quiz results + session snapshot). */
export interface QuizRecWithImage {
  id: string;
  slug?: string | null;
  image_url?: string | null;
}

/**
 * For each recommendation with no ``image_url``, load ``primary_image_url`` / ``image_url`` from ``perfumes``.
 *
 * Args:
 *   supabase: Service-role client.
 *   recs: Recommendations possibly missing ``image_url``.
 *
 * Returns:
 *   Same list with ``image_url`` and optional ``slug`` filled when found in DB.
 */
export async function enrichQuizRecommendationsWithImages<T extends QuizRecWithImage>(
  supabase: SupabaseClient,
  recs: T[],
): Promise<T[]> {
  const needIds = [
    ...new Set(
      recs
        .filter((r) => !r.image_url || String(r.image_url).trim() === "")
        .map((r) => r.id),
    ),
  ];
  if (needIds.length === 0) {
    return recs;
  }

  const { data, error } = await supabase
    .from("perfumes")
    .select("id, slug, primary_image_url, image_url")
    .in("id", needIds);

  if (error) {
    console.error("enrichQuizRecommendationsWithImages:", error.message);
    return recs;
  }
  if (!data?.length) {
    return recs;
  }

  const byId = new Map<string, { url: string | null; slug: string | null }>();
  for (const row of data) {
    const id = row.id != null ? String(row.id) : "";
    if (!id) {
      continue;
    }
    const urlRaw =
      (typeof row.primary_image_url === "string" && row.primary_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      null;
    const url = urlRaw?.trim() || null;
    const slug = typeof row.slug === "string" ? row.slug : null;
    byId.set(id, { url, slug });
  }

  return recs.map((r) => {
    if (r.image_url && String(r.image_url).trim() !== "") {
      return r;
    }
    const extra = byId.get(r.id);
    if (!extra) {
      return r;
    }
    return {
      ...r,
      image_url: extra.url,
      slug: r.slug ?? extra.slug,
    };
  });
}
