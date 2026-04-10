/**
 * GET /api/fragrances/list-count
 * Filtered total from Supabase — no FastAPI dependency.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { countFragrancesFromSupabase } from '@/lib/waitlist/supabasePlpList';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const supabase = getSupabaseAdmin();
    const count = await countFragrancesFromSupabase(supabase, searchParams);
    return NextResponse.json({ count }, { status: 200, headers: responseNoStoreHeaders });
  } catch (e) {
    console.error('[list-count]', e);
    return NextResponse.json({ count: 0 }, { status: 500, headers: responseNoStoreHeaders });
  }
}
