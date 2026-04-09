/**
 * GET /api/fragrances/[id]/live
 *
 * Volatile PDP fields. Waitlist-only: Supabase; else proxy to FastAPI.
 */

import { NextResponse } from 'next/server';

import { fetchNoStore, responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { fetchPdpDetailFromSupabase } from '@/lib/waitlist/supabasePdpDetail';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ProductLiveSnapshot {
  id: string;
  price_3ml?: number;
  price_8ml?: number;
  price_12ml?: number;
  original_price_3ml?: number;
  original_price_8ml?: number;
  original_price_12ml?: number;
  in_stock?: boolean;
  blind_buy_score?: number;
  average_rating?: number;
  review_count?: number;
  available_sizes?: unknown;
  updated_at: string;
}

function toLiveSnapshot(payload: Record<string, unknown>, id: string): ProductLiveSnapshot {
  return {
    id,
    price_3ml: typeof payload.price_3ml === 'number' ? payload.price_3ml : undefined,
    price_8ml: typeof payload.price_8ml === 'number' ? payload.price_8ml : undefined,
    price_12ml: typeof payload.price_12ml === 'number' ? payload.price_12ml : undefined,
    original_price_3ml:
      typeof payload.original_price_3ml === 'number' ? payload.original_price_3ml : undefined,
    original_price_8ml:
      typeof payload.original_price_8ml === 'number' ? payload.original_price_8ml : undefined,
    original_price_12ml:
      typeof payload.original_price_12ml === 'number' ? payload.original_price_12ml : undefined,
    in_stock: typeof payload.in_stock === 'boolean' ? payload.in_stock : undefined,
    blind_buy_score:
      typeof payload.blind_buy_score === 'number' ? payload.blind_buy_score : undefined,
    average_rating: typeof payload.average_rating === 'number' ? payload.average_rating : undefined,
    review_count: typeof payload.review_count === 'number' ? payload.review_count : undefined,
    available_sizes: payload.available_sizes,
    updated_at:
      typeof (payload as { updated_at?: string }).updated_at === 'string'
        ? (payload as { updated_at: string }).updated_at
        : new Date().toISOString(),
  };
}

/**
 * Returns live pricing/stock snapshot for PDP.
 *
 * Args:
 *   _request: Incoming request (unused).
 *   context: Route params with fragrance id.
 *
 * Returns:
 *   JSON live snapshot or error.
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
        return NextResponse.json({ detail: 'Product not found.' }, { status: 404 });
      }
      const snapshot = toLiveSnapshot(data, id);
      return NextResponse.json(snapshot, {
        status: 200,
        headers: responseNoStoreHeaders,
      });
    } catch (error: unknown) {
      console.error('[waitlist] fragrance live (supabase) failed:', error);
      return NextResponse.json(
        { detail: 'Something went wrong. Please try again.' },
        { status: 500 },
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
      return NextResponse.json({ detail: 'Product not found.' }, { status: 404 });
    }
    if (!backendResp.ok) {
      return NextResponse.json(
        { detail: 'Failed to load product live data.' },
        { status: backendResp.status },
      );
    }

    const data = await backendResp.json();
    const snapshot = toLiveSnapshot((data || {}) as Record<string, unknown>, id);
    return NextResponse.json(snapshot, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    try {
      const supabase = getSupabaseAdmin();
      const row = await fetchPdpDetailFromSupabase(supabase, id);
      if (row) {
        const snapshot = toLiveSnapshot(row, id);
        return NextResponse.json(snapshot, {
          status: 200,
          headers: responseNoStoreHeaders,
        });
      }
    } catch {
      /* no supabase fallback */
    }
    console.error('[waitlist] fragrance live proxy failed:', error);
    return NextResponse.json(
      { detail: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
