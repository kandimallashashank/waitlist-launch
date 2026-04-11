/**
 * GET /api/fragrances/[id]/ai-insights
 *
 * Proxies to FastAPI (apps/api) for who-is-it-for, blind-buy copy, and wear-when.
 * Same contract as apps/web; waitlist PDP calls this same-origin.
 */
import { NextResponse } from 'next/server';

import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';

export const dynamic = 'force-dynamic';

export interface FragranceAiInsights {
  who_is_it_for: string | null;
  blind_buy_report: string | null;
  wear_when: string | null;
}

const EMPTY: FragranceAiInsights = {
  who_is_it_for: null,
  blind_buy_report: null,
  wear_when: null,
};

/** LLM path can exceed default fetch timeouts on cold start. */
const FETCH_MS = 60_000;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

/**
 * Proxies AI insights from the Python API.
 *
 * Args:
 *   _request: Incoming request (unused).
 *   context: Dynamic route params with fragrance ``id``.
 *
 * Returns:
 *   JSON body with nullable insight fields; 200 even when backend fails.
 */
export async function GET(
  _request: Request,
  context: { params: { id: string } },
): Promise<NextResponse<FragranceAiInsights | { detail: string }>> {
  const { id } = context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { detail: 'Product id is required.' },
      { status: 400, headers: responseNoStoreHeaders },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    const backendResp = await fetch(
      `${apiBase()}/api/v1/fragrances/${encodeURIComponent(id)}/ai-insights`,
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

    const data = (await backendResp.json()) as FragranceAiInsights;
    const payload: FragranceAiInsights = {
      who_is_it_for: data?.who_is_it_for ?? null,
      blind_buy_report: data?.blind_buy_report ?? null,
      wear_when: data?.wear_when ?? null,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: responseNoStoreHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-insights] proxy failed:', message);
    return NextResponse.json(EMPTY, { status: 200, headers: responseNoStoreHeaders });
  } finally {
    clearTimeout(timeoutId);
  }
}
