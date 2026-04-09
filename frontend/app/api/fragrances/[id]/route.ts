/**
 * GET /api/fragrances/[id]
 *
 * Waitlist-only: reads from Supabase (no FastAPI). Otherwise proxies to ``NEXT_PUBLIC_API_URL``.
 */

import { NextResponse } from 'next/server';

import { fetchNoStore, responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { fetchPdpDetailFromSupabase } from '@/lib/waitlist/supabasePdpDetail';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Proxies PDP static payload from ``/api/v1/fragrances/:id``, or Supabase when waitlist-only.
 *
 * Args:
 *   _request: Incoming request (unused).
 *   context: Dynamic route params with fragrance id.
 *
 * Returns:
 *   JSON body from backend or error response.
 */
export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ detail: 'Product id is required.' }, { status: 400 });
  }

  if (isWaitlistOnlyCatalog()) {
    try {
      const supabase = getSupabaseAdmin();
      const data = await fetchPdpDetailFromSupabase(supabase, id);
      if (!data) {
        return NextResponse.json(
          { detail: 'Product not found.' },
          { status: 404, headers: responseNoStoreHeaders },
        );
      }
      return NextResponse.json(data, {
        status: 200,
        headers: responseNoStoreHeaders,
      });
    } catch (error: unknown) {
      console.error('[waitlist] fragrance detail (supabase) failed:', error);
      return NextResponse.json(
        { detail: 'Something went wrong. Please try again.' },
        { status: 500, headers: responseNoStoreHeaders },
      );
    }
  }

  try {
    const backendResp = await fetch(`${apiBase}/api/v1/fragrances/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...fetchNoStore,
    });

    if (backendResp.status === 404) {
      return NextResponse.json(
        { detail: 'Product not found.' },
        { status: 404, headers: responseNoStoreHeaders },
      );
    }

    if (!backendResp.ok) {
      return NextResponse.json(
        { detail: 'Failed to load product.' },
        { status: backendResp.status },
      );
    }

    const data = await backendResp.json();
    return NextResponse.json(data, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    try {
      const supabase = getSupabaseAdmin();
      const data = await fetchPdpDetailFromSupabase(supabase, id);
      if (data) {
        return NextResponse.json(data, {
          status: 200,
          headers: responseNoStoreHeaders,
        });
      }
    } catch {
      /* Supabase unavailable or row missing */
    }
    console.error('[waitlist] fragrance detail proxy failed:', error);
    return NextResponse.json(
      { detail: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
