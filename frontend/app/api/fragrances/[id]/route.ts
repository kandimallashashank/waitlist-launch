/**
 * GET /api/fragrances/[id]
 * Reads from Supabase - no FastAPI dependency.
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
    if (!data) return NextResponse.json({ detail: 'Not found' }, { status: 404, headers: responseNoStoreHeaders });
    return NextResponse.json(data, { status: 200, headers: responseNoStoreHeaders });
  } catch (e) {
    console.error('[pdp]', e);
    return NextResponse.json({ detail: 'Error' }, { status: 500, headers: responseNoStoreHeaders });
  }
}
