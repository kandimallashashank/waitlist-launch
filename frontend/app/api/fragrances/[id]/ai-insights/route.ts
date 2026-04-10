/**
 * GET /api/fragrances/[id]/ai-insights
 * Returns empty payload — AI insights require FastAPI which is not used in waitlist.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';

export const dynamic = 'force-dynamic';

const EMPTY = { who_is_it_for: null, blind_buy_report: null, wear_when: null };

export async function GET() {
  return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
}
