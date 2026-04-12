/**
 * GET /api/waitlist-preview/layering/search
 *
 * Layering slot search via Supabase (no FastAPI). Requires waitlist session.
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  LAYERING_SEARCH_MAX_LIMIT,
  searchFragrancesForLayering,
} from "@/lib/waitlist/supabaseFragranceCatalog";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

export const dynamic = "force-dynamic";

/**
 * Search fragrances for the layering picker.
 *
 * Args:
 *   req: Request with query params ``q``, ``limit`` (capped at
 *   ``LAYERING_SEARCH_MAX_LIMIT``, default full cap for browse), ``family``.
 *
 * Returns:
 *   JSON array of card rows or error body.
 */
export async function GET(req: Request) {
  try {
    const email = await getWaitlistEmailFromRequest(req);
    if (!email) {
      return NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500 },
      );
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const family = url.searchParams.get("family") ?? "";
    const limitRaw = url.searchParams.get("limit");
    const parsed = limitRaw ? parseInt(limitRaw, 10) : LAYERING_SEARCH_MAX_LIMIT;
    const safeLimit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), LAYERING_SEARCH_MAX_LIMIT)
      : LAYERING_SEARCH_MAX_LIMIT;

    const rows = await searchFragrancesForLayering(supabase, {
      q,
      limit: safeLimit,
      family,
    });

    return NextResponse.json(rows, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (e: unknown) {
    console.error("[waitlist] layering search:", e);
    return NextResponse.json(
      { detail: "Search failed.", code: "SEARCH_ERROR" },
      { status: 500, headers: responseNoStoreHeaders },
    );
  }
}
