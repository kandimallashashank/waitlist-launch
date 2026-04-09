/**
 * PLP list + count from ``v_perfumes_card`` via Supabase (parity with FastAPI list filters).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const CARD_TABLE = "v_perfumes_card";

const LIST_SELECT =
  "id,name,brand_name,gender,concentration,scent_family,category,primary_image_url,price_3ml,price_8ml,price_12ml,original_price_3ml,blind_buy_score,average_rating,review_count,rating,is_new,is_on_sale,is_best_seller,main_accords,seasons,occasions,in_stock,release_year";

const LIST_WITH_NOTES = `${LIST_SELECT},notes_top,notes_middle,notes_base`;

/** Canonical occasion key -> main_accords tokens for sparse JSONB (aligned with API). */
const OCCASION_ACCORD_FALLBACK: Record<string, string[]> = {
  office: ["fresh", "citrus", "green", "aromatic", "woody", "powdery", "musky"],
  date: ["amber", "vanilla", "floral", "rose", "musky", "sweet", "warm spicy", "powdery"],
  party: ["sweet", "fruity", "warm spicy", "vanilla", "tropical", "aromatic"],
  daily: ["fresh", "citrus", "fruity", "green", "aromatic", "woody"],
  wedding: ["white floral", "rose", "floral", "powdery", "amber", "musky"],
  casual: ["fresh", "citrus", "fruity", "green", "aromatic"],
  formal: ["woody", "leather", "amber", "powdery", "aromatic", "musky"],
  evening: ["amber", "vanilla", "warm spicy", "woody", "musky", "sweet"],
  outdoor: ["citrus", "fresh", "green", "aquatic", "aromatic", "woody"],
};

const OCCASION_KEY_MAP: Record<string, string> = {
  office: "office",
  work: "office",
  "date night": "date",
  date_night: "date",
  date: "date",
  party: "party",
  daily: "daily",
  everyday: "daily",
  wedding: "wedding",
  casual: "casual",
  formal: "formal",
  evening: "evening",
  outdoor: "outdoor",
};

export interface PlpListQuery {
  gender: string[];
  category: string[];
  brand: string[];
  season: string[];
  occasion: string[];
  accord: string[];
  style: string[];
  concentration: string[];
  min_price: number | null;
  max_price: number | null;
  limit: number;
  offset: number;
  sort: string;
  include_notes: boolean;
}

/**
 * Parse URLSearchParams like FastAPI ``list_fragrances``.
 *
 * Args:
 *   sp: Request query string.
 *
 * Returns:
 *   Normalized filter + pagination object.
 */
export function parsePlpListQueryParams(sp: URLSearchParams): PlpListQuery {
  const getAll = (k: string) => sp.getAll(k).filter(Boolean);
  const lim = parseInt(sp.get("limit") ?? "48", 10);
  const off = parseInt(sp.get("offset") ?? "0", 10);
  const minP = sp.get("min_price");
  const maxP = sp.get("max_price");
  return {
    gender: getAll("gender"),
    category: getAll("category"),
    brand: getAll("brand"),
    season: getAll("season"),
    occasion: getAll("occasion"),
    accord: getAll("accord"),
    style: getAll("style"),
    concentration: getAll("concentration"),
    min_price: minP != null && minP !== "" ? Number(minP) : null,
    max_price: maxP != null && maxP !== "" ? Number(maxP) : null,
    limit: Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 500) : 48,
    offset: Number.isFinite(off) && off >= 0 ? off : 0,
    sort: (sp.get("sort") ?? "rating").trim(),
    include_notes: sp.get("include_notes") === "true",
  };
}

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function resolveOccasionDbKeys(occasion: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const o of occasion) {
    if (!o?.trim()) continue;
    const norm = o.trim().toLowerCase().replace(/\s+/g, " ");
    let k = OCCASION_KEY_MAP[norm];
    if (!k) {
      const us = norm.replace(/ /g, "_");
      k = OCCASION_KEY_MAP[us] ?? norm.replace(/ /g, "_");
    }
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function occasionPostgrestOrClause(dbKeys: string[]): string {
  const parts: string[] = [];
  for (const k of dbKeys) {
    if (!k) continue;
    parts.push(`occasions->>${k}.gt.70`);
    parts.push(`occasions.cs.${JSON.stringify([k])}`);
  }
  return parts.join(",");
}

function accordsForOccasionFallback(dbKeys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of dbKeys) {
    for (const a of OCCASION_ACCORD_FALLBACK[k] ?? []) {
      if (!seen.has(a)) {
        seen.add(a);
        out.push(a);
      }
    }
  }
  return out;
}

/**
 * Normalize card rows for the storefront (image_url / brand aliases).
 *
 * Args:
 *   data: Raw rows from ``v_perfumes_card``.
 *
 * Returns:
 *   Rows with ``image_url`` and ``brand`` filled when missing.
 */
export function normalizePlpCardRows(
  data: Record<string, unknown>[],
): Record<string, unknown>[] {
  return data.map((item) => {
    const row = { ...item };
    if (!row.image_url && row.primary_image_url) {
      row.image_url = row.primary_image_url;
    }
    if (!row.brand && row.brand_name) {
      row.brand = row.brand_name;
    }
    return row;
  });
}

async function accordPrefilterIds(
  supabase: SupabaseClient,
  accord: string[],
): Promise<string[] | null> {
  if (!accord.length) return null;
  const clean = accord.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (!clean.length) return null;
  const orParts = clean.map((a) => `main_accords.cs.${JSON.stringify([a])}`);
  const { data, error } = await supabase
    .from("perfumes")
    .select("id")
    .eq("is_active", true)
    .or(orParts.join(","));
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => String(r.id));
}

async function idsFromOccasionAccordFallback(
  supabase: SupabaseClient,
  dbKeys: string[],
): Promise<string[]> {
  const accords = accordsForOccasionFallback(dbKeys);
  if (!accords.length) return [];
  const orParts = accords.map((a) => `main_accords.cs.${JSON.stringify([a])}`);
  const { data, error } = await supabase
    .from("perfumes")
    .select("id")
    .eq("is_active", true)
    .or(orParts.join(","));
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => String(r.id));
}

function applyCategoryFilters(query: any, categories: string[]): any {
  if (!categories.length) return query;
  const parts: string[] = [];
  for (const c of categories) {
    if (c === "best_seller") {
      parts.push("is_best_seller.eq.true", "category.eq.best_seller");
    } else if (c === "sale") {
      parts.push("is_on_sale.eq.true", "category.eq.sale");
    } else {
      parts.push(`category.eq.${c}`);
    }
  }
  if (parts.length === 1) {
    const p = parts[0];
    if (p.startsWith("is_best_seller")) return query.eq("is_best_seller", true);
    if (p.startsWith("is_on_sale")) return query.eq("is_on_sale", true);
    const [col, , val] = p.split(".eq.");
    return query.eq(col, val);
  }
  return query.or(parts.join(","));
}

function applyListSort(query: any, sort: string): any {
  const s = (sort || "rating").trim().toLowerCase().replace(/-/g, "_");
  if (s === "name_az" || s === "nameaz") return query.order("name", { ascending: true });
  if (s === "name_za" || s === "nameza") return query.order("name", { ascending: false });
  if (s === "price_low" || s === "pricelow")
    return query.order("price_3ml", { ascending: true, nullsFirst: false });
  if (s === "price_high" || s === "pricehigh")
    return query.order("price_3ml", { ascending: false, nullsFirst: false });
  return query
    .order("blind_buy_score", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false });
}

interface FilterCtx {
  /** Restrict to these ids (accord prefilter ∩ occasion fallback). */
  idFilter: string[] | null;
  occasionKeys: string[];
  skipOccasionOnCard: boolean;
}

function applyVPerfumesCardFilters(query: any, q: PlpListQuery, ctx: FilterCtx): any {
  if (ctx.idFilter !== null && ctx.idFilter.length > 0) {
    query = query.in("id", ctx.idFilter);
  }
  if (q.gender.length) {
    query = query.in(
      "gender",
      q.gender.map((g) => g.trim().toLowerCase()).filter(Boolean),
    );
  }
  query = applyCategoryFilters(query, q.category.map((c) => c.trim()).filter(Boolean));
  if (q.brand.length) {
    const brands = q.brand.map((b) => b.trim()).filter(Boolean);
    if (brands.length === 1) {
      query = query.ilike("brand_name", `*${escapeIlike(brands[0])}*`);
    } else if (brands.length > 1) {
      const ors = brands.map((b) => `brand_name.ilike.*${escapeIlike(b)}*`);
      query = query.or(ors.join(","));
    }
  }
  for (const s of q.season) {
    if (s) query = query.filter(`seasons->>${s.trim().toLowerCase()}`, "gt", 70);
  }
  if (ctx.occasionKeys.length && !ctx.skipOccasionOnCard) {
    query = query.or(occasionPostgrestOrClause(ctx.occasionKeys));
  }
  if (q.style.length) {
    query = query.in(
      "scent_family",
      q.style.map((s) => s.trim()).filter(Boolean),
    );
  }
  if (q.concentration.length) {
    query = query.in("concentration", q.concentration);
  }
  if (q.min_price != null && Number.isFinite(q.min_price)) {
    query = query.gte("price_3ml", q.min_price);
  }
  if (q.max_price != null && Number.isFinite(q.max_price)) {
    query = query.lte("price_3ml", q.max_price);
  }
  return query;
}

async function runList(
  supabase: SupabaseClient,
  q: PlpListQuery,
  ctx: FilterCtx,
): Promise<Record<string, unknown>[]> {
  const cols = q.include_notes ? LIST_WITH_NOTES : LIST_SELECT;
  let query = supabase.from(CARD_TABLE).select(cols);
  query = applyVPerfumesCardFilters(query, q, ctx);
  query = applyListSort(query, q.sort);
  query = query.range(q.offset, q.offset + q.limit - 1);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Record<string, unknown>[];
}

async function runCount(
  supabase: SupabaseClient,
  q: PlpListQuery,
  ctx: FilterCtx,
): Promise<number> {
  let query = supabase
    .from(CARD_TABLE)
    .select("id", { count: "exact", head: true });
  query = applyVPerfumesCardFilters(query, q, ctx);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export interface PlpListMode {
  /** When false, skip row select (count-only). Default true. */
  includeItems?: boolean;
  /** When false, skip exact count. Default true. */
  includeCount?: boolean;
}

/**
 * List fragrances + total count for PLP (single round-trip pattern).
 *
 * Args:
 *   supabase: Service-role client.
 *   searchParams: URL query string (same as FastAPI list).
 *   mode: Optional ``includeItems`` / ``includeCount`` for cheaper count-only calls.
 *
 * Returns:
 *   ``items`` (card rows) and ``count`` (filtered total).
 */
export async function listFragrancesWithCountFromSupabase(
  supabase: SupabaseClient,
  searchParams: URLSearchParams,
  mode: PlpListMode = {},
): Promise<{ items: Record<string, unknown>[]; count: number }> {
  const wantItems = mode.includeItems !== false;
  const wantCount = mode.includeCount !== false;
  const q = parsePlpListQueryParams(searchParams);
  let accordIds: string[] | null = null;
  try {
    accordIds = await accordPrefilterIds(supabase, q.accord);
  } catch (e) {
    console.error("[waitlist] accord prefilter:", e);
    return { items: [], count: 0 };
  }
  if (accordIds !== null && accordIds.length === 0) {
    return { items: [], count: 0 };
  }

  const occasionKeys = resolveOccasionDbKeys(q.occasion);

  const ctxPrimary: FilterCtx = {
    idFilter: accordIds,
    occasionKeys,
    skipOccasionOnCard: false,
  };

  let items: Record<string, unknown>[] = [];
  let count = 0;
  if (wantItems && wantCount) {
    [items, count] = await Promise.all([
      runList(supabase, q, ctxPrimary),
      runCount(supabase, q, ctxPrimary),
    ]);
  } else if (wantItems) {
    items = await runList(supabase, q, ctxPrimary);
  } else if (wantCount) {
    count = await runCount(supabase, q, ctxPrimary);
  }

  const needsOccasionFallback =
    occasionKeys.length > 0 &&
    ((wantItems && items.length === 0) ||
      (!wantItems && wantCount && count === 0));

  if (needsOccasionFallback) {
    let fbIds: string[] = [];
    try {
      fbIds = await idsFromOccasionAccordFallback(supabase, occasionKeys);
    } catch (e) {
      console.error("[waitlist] occasion fallback ids:", e);
    }
    if (accordIds !== null) {
      const allow = new Set(accordIds);
      fbIds = fbIds.filter((id) => allow.has(id));
    }
    if (fbIds.length > 0) {
      const ctxFb: FilterCtx = {
        idFilter: fbIds,
        occasionKeys: [],
        skipOccasionOnCard: true,
      };
      if (wantItems && wantCount) {
        [items, count] = await Promise.all([
          runList(supabase, q, ctxFb),
          runCount(supabase, q, ctxFb),
        ]);
      } else if (wantItems) {
        items = await runList(supabase, q, ctxFb);
      } else if (wantCount) {
        count = await runCount(supabase, q, ctxFb);
      }
    }
  }

  return {
    items: wantItems ? normalizePlpCardRows(items) : [],
    count: wantCount ? count : 0,
  };
}

/**
 * List only (array), for ``GET /api/fragrances/list``.
 *
 * Args:
 *   supabase: Service-role client.
 *   searchParams: URL query string.
 *
 * Returns:
 *   Card rows.
 */
export async function listFragrancesFromSupabase(
  supabase: SupabaseClient,
  searchParams: URLSearchParams,
): Promise<Record<string, unknown>[]> {
  const { items } = await listFragrancesWithCountFromSupabase(supabase, searchParams);
  return items;
}

/**
 * Count only, for ``GET /api/fragrances/list-count``.
 *
 * Args:
 *   supabase: Service-role client.
 *   searchParams: URL query string (no limit/offset required).
 *
 * Returns:
 *   Filtered row count.
 */
export async function countFragrancesFromSupabase(
  supabase: SupabaseClient,
  searchParams: URLSearchParams,
): Promise<number> {
  const { count } = await listFragrancesWithCountFromSupabase(supabase, searchParams, {
    includeItems: false,
    includeCount: true,
  });
  return count;
}
