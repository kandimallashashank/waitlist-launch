/**
 * GET /api/waitlist-preview/fragrances/[id]/similar
 *
 * "Smells Similar To" — reads the `similar_perfumes` UUID array from the
 * perfumes table, then fetches card rows from v_perfumes_card.
 * Falls back to scent_family + gender match when the array is empty.
 *
 * No FastAPI dependency. Requires waitlist session.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { getWaitlistEmailFromRequest, isEmailOnWaitlist } from "@/lib/waitlist/session";
import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";

export const dynamic = "force-dynamic";

const CARD_COLS =
  "id, name, brand_name, primary_image_url, price_3ml, original_price_3ml, blind_buy_score, average_rating, review_count, in_stock, gender";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const email = await getWaitlistEmailFromRequest(req);
    if (!email) {
      return NextResponse.json({ detail: "Waitlist session required" }, { status: 401 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      return NextResponse.json({ detail: "Server misconfigured" }, { status: 500 });
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json({ detail: "Not on waitlist" }, { status: 403 });
    }

    const fragranceId = params.id;
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 20);

    // 1. Fetch the source fragrance to get similar_perfumes array + fallback fields
    const { data: source } = await supabase
      .from("perfumes")
      .select("similar_perfumes, scent_family, gender")
      .eq("id", fragranceId)
      .maybeSingle();

    const similarIds: string[] = (source?.similar_perfumes ?? [])
      .filter((id: unknown) => typeof id === "string" && id !== fragranceId)
      .slice(0, limit);

    if (similarIds.length > 0) {
      // 2a. Fetch card rows for the known similar IDs
      const { data: cards } = await supabase
        .from("v_perfumes_card")
        .select(CARD_COLS)
        .in("id", similarIds)
        .limit(limit);

      return NextResponse.json(cards ?? [], { headers: responseNoStoreHeaders });
    }

    // 2b. Fallback: same scent_family + gender, exclude self
    if (!source?.scent_family) {
      return NextResponse.json([], { headers: responseNoStoreHeaders });
    }

    let fallbackQuery = supabase
      .from("v_perfumes_card")
      .select(CARD_COLS)
      .ilike("scent_family", `%${source.scent_family}%`)
      .neq("id", fragranceId)
      .limit(limit);

    if (source.gender && source.gender !== "unisex") {
      fallbackQuery = fallbackQuery.or(`gender.eq.${source.gender},gender.eq.unisex`);
    }

    const { data: fallback } = await fallbackQuery;
    return NextResponse.json(fallback ?? [], { headers: responseNoStoreHeaders });
  } catch (e) {
    console.error("[similar]", e);
    return NextResponse.json({ detail: "Failed" }, { status: 500, headers: responseNoStoreHeaders });
  }
}
