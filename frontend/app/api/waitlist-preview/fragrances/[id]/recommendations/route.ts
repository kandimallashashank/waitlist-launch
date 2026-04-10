/**
 * GET /api/waitlist-preview/fragrances/[id]/recommendations
 *
 * "You May Also Like" — same as ``/api/fragrances/[id]/recommendations`` but
 * requires a waitlist session. Implementation: Supabase via
 * ``fetchWaitlistScentFamilyRecommendationsForPdp`` (no FastAPI).
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { getWaitlistEmailFromRequest, isEmailOnWaitlist } from "@/lib/waitlist/session";
import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { fetchWaitlistScentFamilyRecommendationsForPdp } from "@/lib/waitlist/supabasePdpSimilar";

export const dynamic = "force-dynamic";

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

    const excludeRaw = url.searchParams.get("exclude") ?? "";
    const extraExclude = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data = await fetchWaitlistScentFamilyRecommendationsForPdp(
      supabase,
      fragranceId,
      limit,
      extraExclude,
    );
    return NextResponse.json(data, { headers: responseNoStoreHeaders });
  } catch (e) {
    console.error("[recommendations]", e);
    return NextResponse.json({ detail: "Failed" }, { status: 500, headers: responseNoStoreHeaders });
  }
}
