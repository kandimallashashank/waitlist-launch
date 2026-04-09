/**
 * GET /api/fragrances/list-with-count
 *
 * Combined PLP page + filtered total (Supabase when waitlist-only, else FastAPI proxy).
 */

import { NextResponse } from "next/server";

import { fetchNoStore, responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import { listFragrancesWithCountFromSupabase } from "@/lib/waitlist/supabasePlpList";
import { isWaitlistOnlyCatalog } from "@/lib/waitlist/waitlistOnlyCatalog";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fromSupabase(request: Request): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();
  const sp = new URL(request.url).searchParams;
  const { items, count } = await listFragrancesWithCountFromSupabase(supabase, sp);
  return NextResponse.json(
    { items, count },
    { status: 200, headers: responseNoStoreHeaders },
  );
}

/**
 * Returns ``{ items, count }`` for catalog pagination.
 *
 * Args:
 *   request: Incoming request with same query params as FastAPI list.
 *
 * Returns:
 *   JSON body or error.
 */
export async function GET(request: Request) {
  if (isWaitlistOnlyCatalog()) {
    try {
      return await fromSupabase(request);
    } catch (error: unknown) {
      console.error("[waitlist] list-with-count (supabase):", error);
      return NextResponse.json(
        { detail: "Failed to load catalog.", items: [], count: 0 },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  try {
    const url = `${apiBase}/api/v1/fragrances/list-with-count${qs ? `?${qs}` : ""}`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      ...fetchNoStore,
    });
    if (!resp.ok) {
      try {
        return await fromSupabase(request);
      } catch {
        /* fall through */
      }
      return NextResponse.json(
        { detail: "Failed to load catalog.", items: [], count: 0 },
        { status: resp.status, headers: responseNoStoreHeaders },
      );
    }
    const data = await resp.json();
    return NextResponse.json(data, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    try {
      return await fromSupabase(request);
    } catch {
      console.error("[waitlist] list-with-count proxy failed:", error);
      return NextResponse.json(
        { detail: "Something went wrong. Please try again.", items: [], count: 0 },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }
}
