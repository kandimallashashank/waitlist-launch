/**
 * GET /api/fragrances/[id]/live
 * Volatile PDP fields from Supabase - no FastAPI dependency.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { fetchPdpDetailFromSupabase } from '@/lib/waitlist/supabasePdpDetail';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return NextResponse.json({ detail: 'id required' }, { status: 400 });
  try {
    const supabase = getSupabaseAdmin();
    const data = await fetchPdpDetailFromSupabase(supabase, id);
    if (!data) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    // Return only the volatile fields the PDP client merges
    const snap = {
      id,
      price_3ml: data.price_3ml,
      price_8ml: data.price_8ml,
      price_12ml: data.price_12ml,
      original_price_3ml: data.original_price_3ml,
      original_price_8ml: data.original_price_8ml,
      original_price_12ml: data.original_price_12ml,
      in_stock: data.in_stock,
      blind_buy_score: data.blind_buy_score,
      average_rating: data.average_rating,
      review_count: data.review_count,
      available_sizes: data.available_sizes,
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(snap, { status: 200, headers: responseNoStoreHeaders });
  } catch (e) {
    console.error('[pdp/live]', e);
    return NextResponse.json({ detail: 'Error' }, { status: 500, headers: responseNoStoreHeaders });
  }
}
