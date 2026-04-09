/**
 * GET /api/fragrances/[id]/ai-insights
 *
 * Proxies AI insight strings for PDP; soft-fails to null fields.
 */

import { NextResponse } from 'next/server';

import { fetchNoStore, responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const EMPTY_INSIGHTS = {
  who_is_it_for: null,
  blind_buy_report: null,
  wear_when: null,
} as const;

export interface FragranceAiInsights {
  who_is_it_for: string | null;
  blind_buy_report: string | null;
  wear_when: string | null;
}

/**
 * Proxies `/api/v1/fragrances/:id/ai-insights`.
 *
 * Args:
 *   _request: Unused.
 *   context: Route params with fragrance id.
 *
 * Returns:
 *   AI insights JSON or nullable defaults.
 */
export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ detail: 'Product id is required.' }, { status: 400 });
  }

  if (isWaitlistOnlyCatalog()) {
    return NextResponse.json(EMPTY_INSIGHTS, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  }

  try {
    const backendResp = await fetch(`${apiBase}/api/v1/fragrances/${id}/ai-insights`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...fetchNoStore,
    });

    if (!backendResp.ok) {
      return NextResponse.json(EMPTY_INSIGHTS, { status: 200 });
    }

    const data = (await backendResp.json()) as FragranceAiInsights;
    return NextResponse.json(data, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    console.error('[waitlist] ai-insights proxy failed:', error);
    return NextResponse.json(EMPTY_INSIGHTS, { status: 200 });
  }
}
