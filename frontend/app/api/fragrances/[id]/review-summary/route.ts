/**
 * GET /api/fragrances/[id]/review-summary
 * Returns empty payload — review summaries require FastAPI which is not used in waitlist.
 */
import { NextResponse } from 'next/server';
import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';

export const dynamic = 'force-dynamic';

const EMPTY = { summary: null, themes: null };

export async function GET() {
  return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
}
