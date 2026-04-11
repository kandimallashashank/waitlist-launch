/**
 * GET /api/waitlist-preview/fragrances/[id]/recommendations
 *
 * "You May Also Like" - picks from the same scent_family, excluding the
 * source fragrance and any IDs already shown in the similar section.
 * Ordered by blind_buy_score desc so the best picks surface first.
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
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "12", 10) || 12, 24);

    // Comma-separated IDs to exclude (e.g. already shown in similar section)
    const excludeRaw = url.searchParams.get("exclude") ?? "";
    const excludeIds = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    excludeIds.push(fragranceId);

    // Fetch source fragrance metadata
    const { data: source } = await supabase
      .from("perfumes")
      .select("scent_family, gender, main_accords")
      .eq("id", fragranceId)
      .maybeSingle();

    if (!source?.scent_family) {
      return NextResponse.json([], { headers: responseNoStoreHeaders });
    }

    let query = supabase
      .from("v_perfumes_card")
      .select(CARD_COLS)
      .ilike("scent_family", `%${source.scent_family}%`)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("blind_buy_score", { ascending: false })
      .limit(limit);

    // Soft gender filter - include unisex always
    if (source.gender && source.gender !== "unisex") {
      query = query.or(`gender.eq.${source.gender},gender.eq.unisex`);
    }

    const { data } = await query;
    return NextResponse.json(data ?? [], { headers: responseNoStoreHeaders });
  } catch (e) {
    console.error("[recommendations]", e);
    return NextResponse.json({ detail: "Failed" }, { status: 500, headers: responseNoStoreHeaders });
  }
}
