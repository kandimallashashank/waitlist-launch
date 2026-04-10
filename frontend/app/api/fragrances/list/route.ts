/**
 * GET /api/fragrances/list
 * Catalog listing from Supabase — no FastAPI dependency.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { listFragrancesFromSupabase } from '@/lib/waitlist/supabasePlpList';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams(searchParams);
  if (!params.has('limit')) params.set('limit', '48');
  try {
    const supabase = getSupabaseAdmin();
    const items = await listFragrancesFromSupabase(supabase, params);
    return NextResponse.json(items, { status: 200, headers: responseNoStoreHeaders });
  } catch (e) {
    console.error('[list]', e);
    return NextResponse.json([], { status: 500, headers: responseNoStoreHeaders });
  }
}
