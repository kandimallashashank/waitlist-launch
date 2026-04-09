/**
 * GET /api/fragrances/list-count
 *
 * Filtered PLP total: Supabase when waitlist-only (or proxy failure), else FastAPI.
 */

import { NextResponse } from "next/server";

import { fetchNoStore, responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { countFragrancesFromSupabase } from "@/lib/waitlist/supabasePlpList";
import { isWaitlistOnlyCatalog } from "@/lib/waitlist/waitlistOnlyCatalog";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Forwards query string to `/api/v1/fragrances/list-count` or counts in Supabase.
 *
 * Args:
 *   request: Incoming request with same filters as `/list`.
 *
 * Returns:
 *   `{ count: number }` or error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  async function fromSupabase(): Promise<NextResponse> {
    const supabase = getSupabaseAdmin();
    const count = await countFragrancesFromSupabase(supabase, searchParams);
    return NextResponse.json(
      { count },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }

  if (isWaitlistOnlyCatalog()) {
    try {
      return await fromSupabase();
    } catch (error: unknown) {
      console.error("[waitlist] list-count (supabase):", error);
      return NextResponse.json(
        { detail: "Something went wrong. Please try again.", count: 0 },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }

  try {
    const url = `${apiBase}/api/v1/fragrances/list-count${qs ? `?${qs}` : ""}`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      ...fetchNoStore,
    });

    if (!resp.ok) {
      try {
        return await fromSupabase();
      } catch {
        return NextResponse.json(
          { detail: "Failed to load count.", count: 0 },
          { status: resp.status },
        );
      }
    }

    const data = (await resp.json()) as { count?: number };
    const body = { count: typeof data.count === "number" ? data.count : 0 };

    return NextResponse.json(body, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    try {
      return await fromSupabase();
    } catch {
      console.error("[waitlist] fragrances list-count proxy failed:", error);
      return NextResponse.json(
        { detail: "Something went wrong. Please try again.", count: 0 },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }
}
