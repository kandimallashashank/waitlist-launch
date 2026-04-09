/**
 * GET /api/fragrances/hybrid-search
 *
 * Lightweight name/brand ``ilike`` search on ``v_perfumes_card`` when FastAPI hybrid search is
 * unavailable. Uses ``limit`` + ``offset`` for paging (same page size as PLP). At very large
 * catalogue scale (100k+ rows), replace with a dedicated search index (e.g. Meilisearch):
 * unindexed ``ilike`` does not scale.
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { normalizePlpCardRows } from "@/lib/waitlist/supabasePlpList";

const LIST_SELECT =
  "id,name,brand_name,gender,concentration,scent_family,category,primary_image_url,price_3ml,price_8ml,price_12ml,original_price_3ml,blind_buy_score,average_rating,review_count,rating,is_new,is_on_sale,is_best_seller,main_accords,seasons,occasions,in_stock,release_year";

const LIST_SELECT_WITH_NOTES = `${LIST_SELECT},notes_top,notes_middle,notes_base`;

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Returns paged card rows compatible with PLP / quiz consumers.
 *
 * Args:
 *   request: ``query`` (required), optional ``limit`` (default 48, max 500), ``offset``,
 *     repeated ``gender`` (same semantics as list-with-count), ``include_notes``.
 *
 * Returns:
 *   JSON with ``results``, ``offset``, ``limit``, and ``has_more`` (full page returned).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("query") ?? "").trim();
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "48", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 48;
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
  const genders = url.searchParams
    .getAll("gender")
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  const includeNotes = url.searchParams.get("include_notes") === "true";
  const selectCols = includeNotes ? LIST_SELECT_WITH_NOTES : LIST_SELECT;

  if (!q) {
    return NextResponse.json(
      { results: [], offset: 0, limit, has_more: false },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const esc = escapeIlike(q);
    const orExpr = `name.ilike.*${esc}*,brand_name.ilike.*${esc}*`;
    let qb = supabase.from("v_perfumes_card").select(selectCols).or(orExpr);
    if (genders.length > 0) {
      qb = qb.in("gender", genders);
    }
    const { data, error } = await qb
      .order("rating", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[waitlist] hybrid-search:", error.message);
      return NextResponse.json(
        { results: [], offset, limit, has_more: false },
        { status: 200, headers: responseNoStoreHeaders },
      );
    }

    const rows = normalizePlpCardRows((data ?? []) as unknown as Record<string, unknown>[]);
    const hasMore = rows.length === limit;
    return NextResponse.json(
      { results: rows, offset, limit, has_more: hasMore },
      { status: 200, headers: responseNoStoreHeaders },
    );
  } catch (e: unknown) {
    console.error("[waitlist] hybrid-search:", e);
    return NextResponse.json(
      { results: [], offset: 0, limit: 48, has_more: false },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }
}
