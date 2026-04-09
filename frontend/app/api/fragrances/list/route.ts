/**
 * GET /api/fragrances/list
 *
 * Catalog listing: Supabase when waitlist-only (or proxy failure), else FastAPI proxy.
 */

import { NextResponse } from "next/server";

import { fetchNoStore, responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { listFragrancesFromSupabase } from "@/lib/waitlist/supabasePlpList";
import { isWaitlistOnlyCatalog } from "@/lib/waitlist/waitlistOnlyCatalog";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Forwards query string to `/api/v1/fragrances/` or reads ``v_perfumes_card``.
 *
 * Args:
 *   request: Request with listing filters as search params.
 *
 * Returns:
 *   JSON array of fragrance rows or error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams(searchParams);
  if (!params.has("limit")) {
    params.set("limit", "48");
  }

  async function fromSupabase(): Promise<NextResponse> {
    const supabase = getSupabaseAdmin();
    const items = await listFragrancesFromSupabase(supabase, params);
    return NextResponse.json(items, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  }

  if (isWaitlistOnlyCatalog()) {
    try {
      return await fromSupabase();
    } catch (error: unknown) {
      console.error("[waitlist] fragrances list (supabase):", error);
      return NextResponse.json(
        { detail: "Something went wrong. Please try again." },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }

  try {
    const url = `${apiBase}/api/v1/fragrances/?${params.toString()}`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      ...fetchNoStore,
    });

    if (!resp.ok) {
      try {
        return await fromSupabase();
      } catch {
        return NextResponse.json(
          { detail: "Failed to load fragrances." },
          { status: resp.status },
        );
      }
    }

    const data = await resp.json();
    const list = Array.isArray(data) ? data : [];

    return NextResponse.json(list, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    try {
      return await fromSupabase();
    } catch {
      console.error("[waitlist] fragrances list proxy failed:", error);
      return NextResponse.json(
        { detail: "Something went wrong. Please try again." },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }
}
