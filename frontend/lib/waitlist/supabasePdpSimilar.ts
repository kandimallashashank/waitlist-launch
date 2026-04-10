/**
 * PDP “Smells similar” / “You may also like” data from Supabase (waitlist catalog).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const CARD_SELECT =
  "id,name,brand_name,gender,primary_image_url,price_3ml,price_8ml,price_12ml,original_price_3ml,blind_buy_score,average_rating,review_count,in_stock,catalog_updated_at";

/**
 * Loads card rows for the given IDs, preserving ``orderedIds`` order.
 */
export async function fetchPdpSimilarCardsByIds(
  supabase: SupabaseClient,
  orderedIds: string[],
): Promise<Record<string, unknown>[]> {
  if (!orderedIds.length) return [];
  const { data, error } = await supabase
    .from("v_perfumes_card")
    .select(CARD_SELECT)
    .in("id", orderedIds);
  if (error || !data?.length) return [];
  const byId = new Map(
    data.map((row) => {
      const r = row as { id: string };
      return [String(r.id), row as Record<string, unknown>];
    }),
  );
  return orderedIds.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[];
}

/**
 * “Smells similar” list from ``perfumes.similar_perfume_ids`` (curated / backend-filled).
 */
export async function fetchWaitlistDbSimilarForPdp(
  supabase: SupabaseClient,
  fragranceId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { data: row, error } = await supabase
    .from("perfumes")
    .select("similar_perfume_ids")
    .eq("id", fragranceId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !row) return [];
  const raw = (row as { similar_perfume_ids?: unknown }).similar_perfume_ids;
  const ids = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const sliced = ids.slice(0, Math.max(1, limit));
  return fetchPdpSimilarCardsByIds(supabase, sliced);
}

interface SearchFragranceRpcRow {
  fragrance_id: string;
  brand_name?: string | null;
}

/**
 * Vector neighbours via ``fragrance_embeddings`` + ``search_fragrances_full`` (pilot parity with quiz).
 */
export async function fetchWaitlistVectorSimilarForPdp(
  supabase: SupabaseClient,
  fragranceId: string,
  limit: number,
  excludeSameBrand: boolean,
): Promise<Record<string, unknown>[]> {
  const { data: sourceCard } = await supabase
    .from("v_perfumes_card")
    .select("brand_name")
    .eq("id", fragranceId)
    .maybeSingle();
  const sourceBrand = ((sourceCard as { brand_name?: string } | null)?.brand_name ?? "").trim();

  const { data: embRow, error: embErr } = await supabase
    .from("fragrance_embeddings")
    .select("embedding")
    .eq("fragrance_id", fragranceId)
    .maybeSingle();

  if (embErr || embRow == null || (embRow as { embedding?: unknown }).embedding == null) {
    return [];
  }

  const embedding = (embRow as { embedding: number[] }).embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return [];
  }

  const matchCount = Math.min(120, Math.max(limit * 6, 24));
  const { data: matches, error: rpcErr } = await supabase.rpc("search_fragrances_full", {
    query_embedding: embedding,
    match_count: matchCount,
    filter_gender: null,
    filter_scent_family: null,
    filter_price_min: null,
    filter_price_max: null,
  });

  if (rpcErr || !Array.isArray(matches)) {
    return [];
  }

  let rows = matches as SearchFragranceRpcRow[];
  rows = rows.filter((r) => String(r.fragrance_id) !== fragranceId);
  if (excludeSameBrand && sourceBrand) {
    const b = sourceBrand.toLowerCase();
    rows = rows.filter((r) => (r.brand_name ?? "").trim().toLowerCase() !== b);
  }

  const topIds = rows.slice(0, limit).map((r) => String(r.fragrance_id));
  return fetchPdpSimilarCardsByIds(supabase, topIds);
}

interface ScentGenderMeta {
  scent_family: string | null;
  gender: string | null;
}

/**
 * Resolves ``scent_family`` / ``gender`` from ``perfumes``, then ``v_perfumes_card`` if missing.
 */
async function resolveScentFamilyGenderForPdp(
  supabase: SupabaseClient,
  fragranceId: string,
): Promise<ScentGenderMeta> {
  const { data: p } = await supabase
    .from("perfumes")
    .select("scent_family, gender")
    .eq("id", fragranceId)
    .maybeSingle();

  let scent_family =
    p?.scent_family != null && String(p.scent_family).trim() !== ""
      ? String(p.scent_family).trim()
      : null;
  let gender =
    p?.gender != null && String(p.gender).trim() !== ""
      ? String(p.gender).trim()
      : null;

  if (!scent_family || !gender) {
    const { data: c } = await supabase
      .from("v_perfumes_card")
      .select("scent_family, gender")
      .eq("id", fragranceId)
      .maybeSingle();
    if (!scent_family && c?.scent_family != null && String(c.scent_family).trim() !== "") {
      scent_family = String(c.scent_family).trim();
    }
    if (!gender && c?.gender != null && String(c.gender).trim() !== "") {
      gender = String(c.gender).trim();
    }
  }

  return { scent_family, gender };
}

function rowGenderMatchesFilter(rowGender: string | undefined, filter: string | null): boolean {
  if (!filter || filter === "unisex") return true;
  const g = (rowGender ?? "").trim().toLowerCase();
  const f = filter.toLowerCase();
  return g === f || g === "unisex";
}

/**
 * “You may also like” — prefers same ``scent_family`` (from ``perfumes`` or ``v_perfumes_card``),
 * then tops up with vector neighbours if the family query is empty or sparse.
 * Gender is applied in-memory so PostgREST ``.or()`` does not over-filter.
 */
export async function fetchWaitlistScentFamilyRecommendationsForPdp(
  supabase: SupabaseClient,
  fragranceId: string,
  limit: number,
  extraExcludeIds: readonly string[],
): Promise<Record<string, unknown>[]> {
  const cap = Math.min(Math.max(1, limit), 24);

  const exclude = new Set<string>(
    [fragranceId, ...extraExcludeIds].filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    ),
  );
  const excludeCsv = [...exclude].join(",");

  const meta = await resolveScentFamilyGenderForPdp(supabase, fragranceId);

  const rowsByFamily: Record<string, unknown>[] = [];

  if (meta.scent_family) {
    const { data, error } = await supabase
      .from("v_perfumes_card")
      .select(CARD_SELECT)
      .ilike("scent_family", `%${meta.scent_family}%`)
      .not("id", "in", `(${excludeCsv})`)
      .order("blind_buy_score", { ascending: false })
      .limit(Math.min(80, cap * 4));

    if (error) {
      console.error("[fetchWaitlistScentFamilyRecommendationsForPdp] scent query", error);
    } else {
      let list = (data ?? []) as Record<string, unknown>[];
      if (meta.gender && meta.gender !== "unisex") {
        list = list.filter((r) =>
          rowGenderMatchesFilter((r as { gender?: string }).gender, meta.gender),
        );
      }
      rowsByFamily.push(...list.slice(0, cap));
    }
  }

  if (rowsByFamily.length >= cap) {
    return rowsByFamily.slice(0, cap);
  }

  /** Vector fallback when ``scent_family`` is missing or family matches are sparse / none. */
  const need = cap - rowsByFamily.length;
  const seen = new Set<string>(
    rowsByFamily.map((r) => String((r as { id: unknown }).id)),
  );
  for (const id of exclude) seen.add(id);

  const vec = await fetchWaitlistVectorSimilarForPdp(
    supabase,
    fragranceId,
    Math.max(need * 4, 12),
    false,
  );

  const merged = [...rowsByFamily];
  for (const r of vec) {
    const rid = String((r as { id: unknown }).id);
    if (seen.has(rid)) continue;
    seen.add(rid);
    merged.push(r);
    if (merged.length >= cap) break;
  }

  if (merged.length > 0) {
    return merged.slice(0, cap);
  }

  /** Last resort: top blind-buy picks when embeddings / scent data are missing. */
  const { data: broad, error: broadErr } = await supabase
    .from("v_perfumes_card")
    .select(CARD_SELECT)
    .not("id", "in", `(${excludeCsv})`)
    .order("blind_buy_score", { ascending: false })
    .limit(cap);

  if (broadErr) {
    console.error("[fetchWaitlistScentFamilyRecommendationsForPdp] broad fallback", broadErr);
    return [];
  }
  return (broad ?? []) as Record<string, unknown>[];
}
