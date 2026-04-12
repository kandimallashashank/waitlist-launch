/**
 * GET /api/frag-db-stats
 * Live FragDB table counts from Supabase (service role).
 * Responses are cached server-side to avoid hitting the DB on every refresh.
 */
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { fetchFragDbStats } from "@/lib/waitlist/fragDbStats";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";

/** Seconds between Supabase reads for this endpoint (aggregate KPIs, not real-time). */
const REVALIDATE_SECONDS = 300;

const statsHttpCacheControl = [
  "private",
  "max-age=60",
  `s-maxage=${REVALIDATE_SECONDS}`,
  "stale-while-revalidate=600",
].join(", ");

/** Memoized Supabase read; shared across requests until ``REVALIDATE_SECONDS`` elapses. */
const getFragDbStatsCached = unstable_cache(
  async () => {
    const supabase = getSupabaseAdmin();
    return fetchFragDbStats(supabase);
  },
  ["frag-db-stats"],
  { revalidate: REVALIDATE_SECONDS },
);

export async function GET() {
  try {
    const stats = await getFragDbStatsCached();
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "Cache-Control": statsHttpCacheControl,
      },
    });
  } catch (e) {
    console.error("[frag-db-stats]", e);
    return NextResponse.json(
      {
        error: "frag_db_stats_unavailable",
        detail: "Could not load database statistics.",
      },
      { status: 503, headers: responseNoStoreHeaders },
    );
  }
}
