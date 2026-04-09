/**
 * GET /api/fragrances/hybrid-search
 *
 * Lightweight name/brand search on ``v_perfumes_card`` when FastAPI hybrid search is unavailable.
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { normalizePlpCardRows } from "@/lib/waitlist/supabasePlpList";

const LIST_SELECT =
  "id,name,brand_name,gender,concentration,scent_family,category,primary_image_url,price_3ml,price_8ml,price_12ml,original_price_3ml,blind_buy_score,average_rating,review_count,rating,is_new,is_on_sale,is_best_seller,main_accords,seasons,occasions,in_stock,release_year";

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Returns ``{ results: card rows }`` compatible with storefront hybrid search consumers.
 *
 * Args:
 *   request: Request with ``query`` and optional ``limit`` search params.
 *
 * Returns:
 *   JSON object with ``results`` array.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("query") ?? "").trim();
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 80) : 50;

  if (!q) {
    return NextResponse.json(
      { results: [] },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const esc = escapeIlike(q);
    const orExpr = `name.ilike.*${esc}*,brand_name.ilike.*${esc}*`;
    const { data, error } = await supabase
      .from("v_perfumes_card")
      .select(LIST_SELECT)
      .or(orExpr)
      .limit(limit);

    if (error) {
      console.error("[waitlist] hybrid-search:", error.message);
      return NextResponse.json(
        { results: [] },
        { status: 200, headers: responseNoStoreHeaders },
      );
    }

    const rows = normalizePlpCardRows((data ?? []) as Record<string, unknown>[]);
    return NextResponse.json(
      { results: rows },
      { status: 200, headers: responseNoStoreHeaders },
    );
  } catch (e: unknown) {
    console.error("[waitlist] hybrid-search:", e);
    return NextResponse.json(
      { results: [] },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }
}
