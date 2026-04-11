/**
 * GET /api/fragrances/list-with-count
 * Combined PLP page + filtered total from Supabase - no FastAPI dependency.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { listFragrancesWithCountFromSupabase } from '@/lib/waitlist/supabasePlpList';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  try {
    const supabase = getSupabaseAdmin();
    const { items, count } = await listFragrancesWithCountFromSupabase(supabase, sp);
    return NextResponse.json({ items, count }, { status: 200, headers: responseNoStoreHeaders });
  } catch (e) {
    console.error('[list-with-count]', e);
    return NextResponse.json({ items: [], count: 0 }, { status: 500, headers: responseNoStoreHeaders });
  }
}
