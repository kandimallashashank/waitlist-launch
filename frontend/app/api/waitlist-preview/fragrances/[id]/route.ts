/**
 * GET /api/waitlist-preview/fragrances/[id]
 *
 * Single fragrance for Layering Lab prefill via Supabase (no FastAPI).
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { fetchFragranceDetailFromSupabase } from "@/lib/waitlist/supabaseFragranceCatalog";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Return one fragrance document for layering prefill.
 *
 * Args:
 *   _request: Unused.
 *   context: Route params with ``id``.
 *
 * Returns:
 *   JSON body or 4xx/5xx.
 */
export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json(
      { detail: "Invalid product id." },
      { status: 400, headers: responseNoStoreHeaders },
    );
  }

  try {
    const email = await getWaitlistEmailFromRequest(request);
    if (!email) {
      return NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401, headers: responseNoStoreHeaders },
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403, headers: responseNoStoreHeaders },
      );
    }

    const row = await fetchFragranceDetailFromSupabase(supabase, id);
    if (!row) {
      return NextResponse.json(
        { detail: "Product not found." },
        { status: 404, headers: responseNoStoreHeaders },
      );
    }

    return NextResponse.json(row, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (e: unknown) {
    console.error("[waitlist] fragrance detail:", e);
    return NextResponse.json(
      { detail: "Something went wrong. Please try again." },
      { status: 500, headers: responseNoStoreHeaders },
    );
  }
}
