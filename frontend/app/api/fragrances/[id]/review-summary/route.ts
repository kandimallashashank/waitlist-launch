/**
 * GET /api/fragrances/[id]/review-summary
 *
 * Proxies review summary; returns empty payload when backend unavailable.
 */

import { NextResponse } from 'next/server';

import { fetchNoStore, responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const EMPTY_REVIEW = { summary: null, themes: null } as const;

export interface ReviewSummary {
  summary: string | null;
  themes: string[] | null;
}

/**
 * Proxies `/api/v1/fragrances/:id/review-summary`.
 *
 * Args:
 *   request: Request (uses `review_count` query param).
 *   context: Route params with fragrance id.
 *
 * Returns:
 *   Review summary JSON; always 200 with nullable fields when possible.
 */
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  if (!id) {
    return NextResponse.json(EMPTY_REVIEW, { status: 200 });
  }

  const url = new URL(request.url);
  const reviewCount = parseInt(url.searchParams.get('review_count') ?? '0', 10);

  if (reviewCount < 3) {
    return NextResponse.json(EMPTY_REVIEW, { status: 200 });
  }

  if (isWaitlistOnlyCatalog()) {
    return NextResponse.json(EMPTY_REVIEW, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  }

  try {
    const backendResp = await fetch(
      `${apiBase}/api/v1/fragrances/${id}/review-summary?review_count=${reviewCount}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        ...fetchNoStore,
      },
    );

    if (!backendResp.ok) {
      return NextResponse.json(EMPTY_REVIEW, { status: 200 });
    }

    const data = (await backendResp.json()) as ReviewSummary;
    return NextResponse.json(data, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    console.error('[waitlist] review-summary proxy failed:', error);
    return NextResponse.json(EMPTY_REVIEW, { status: 200 });
  }
}
