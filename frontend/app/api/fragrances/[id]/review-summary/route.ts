/**
 * GET /api/fragrances/[id]/review-summary?review_count=N
 *
 * Proxies to FastAPI for AI review themes/summary (requires ≥3 reviews on backend).
 */
import { NextResponse } from 'next/server';

import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';

export const dynamic = 'force-dynamic';

export interface ReviewSummary {
  summary: string | null;
  themes: string[] | null;
}

const EMPTY: ReviewSummary = { summary: null, themes: null };

const FETCH_MS = 60_000;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

/**
 * Proxies review summary from the Python API.
 *
 * Args:
 *   request: Request (used for ``review_count`` query).
 *   context: Dynamic route params with fragrance ``id``.
 *
 * Returns:
 *   JSON with nullable ``summary`` and ``themes``; 200 when backend fails or too few reviews.
 */
export async function GET(
  request: Request,
  context: { params: { id: string } },
): Promise<NextResponse<ReviewSummary>> {
  const { id } = context.params;
  if (!id?.trim()) {
    return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
  }

  const url = new URL(request.url);
  const reviewCount = parseInt(url.searchParams.get('review_count') ?? '0', 10);
  if (reviewCount < 3) {
    return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    const q = new URLSearchParams({ review_count: String(reviewCount) });
    const backendResp = await fetch(
      `${apiBase()}/api/v1/fragrances/${encodeURIComponent(id)}/review-summary?${q}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      },
    );

    if (!backendResp.ok) {
      return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
    }

    const data = (await backendResp.json()) as ReviewSummary;
    const payload: ReviewSummary = {
      summary: data?.summary ?? null,
      themes: Array.isArray(data?.themes) ? data.themes : null,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[review-summary] proxy failed:', message);
    return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
  } finally {
    clearTimeout(timeoutId);
  }
}
