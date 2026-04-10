/**
 * GET /api/fragrances/[id]/recommendations
 *
 * “You may also like” — same scent family as the source, ordered by blind_buy_score.
 * Resolved from Supabase (``v_perfumes_card`` + ``perfumes``). No FastAPI.
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { fetchWaitlistScentFamilyRecommendationsForPdp } from "@/lib/waitlist/supabasePdpSimilar";
import { isWaitlistOnlyCatalog } from "@/lib/waitlist/waitlistOnlyCatalog";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ detail: "Product id is required." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "12", 10) || 12,
    24,
  );
  const excludeRaw = searchParams.get("exclude") ?? "";
  const extraExclude = excludeRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!isWaitlistOnlyCatalog()) {
    return NextResponse.json([], { status: 200, headers: responseNoStoreHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const items = await fetchWaitlistScentFamilyRecommendationsForPdp(
      supabase,
      id,
      limit,
      extraExclude,
    );
    return NextResponse.json(items, { status: 200, headers: responseNoStoreHeaders });
  } catch (error: unknown) {
    console.error("[waitlist] PDP recommendations (supabase):", error);
    return NextResponse.json([], { status: 200, headers: responseNoStoreHeaders });
  }
}
