/**
 * Shared PLP catalog fetch: paginated list + filtered count.
 * Calls the FastAPI backend directly (bypasses Next.js API proxy) to eliminate
 * an extra HTTP hop + redundant Redis check that was adding ~500ms+ latency.
 */

import type { Fragrance } from '@/api/base44Client';
import { fetchWithTimeout } from '@/lib/apiFetch';
import { priceQueryLabelToMinMax } from '@/lib/filterUtils';
import type { FragranceSortOption } from '@/lib/sortFragrances';
import { getPublicApiBaseUrl } from '@/lib/publicApiBase';

/** Must match default limit in `app/api/fragrances/list/route.ts`. */
export const PLP_CATALOG_PAGE_SIZE = 48;

/** Filter shape aligned with EnhancedSidebar / shop-all. */
export interface PlpCatalogFilters {
  gender: string[];
  category: string[];
  price: string[];
  priceMin?: number;
  priceMax?: number;
  scentFamily: string[];
  brand: string[];
  concentration: string[];
  season: string[];
  occasion: string[];
}

/**
 * Maps storefront gender checkboxes to DB `gender` values (men/women include unisex).
 */
export function genderQueryValuesForPlp(selected: string[]): string[] {
  const s = new Set(
    selected.map((g) => (g || '').toLowerCase()).filter(Boolean)
  );
  if (s.size === 0) return [];
  const hasM = s.has('men');
  const hasW = s.has('women');
  if (hasM && hasW) return ['men', 'women', 'unisex'];
  if (hasM) return ['men', 'unisex'];
  if (hasW) return ['women', 'unisex'];
  if (s.has('unisex')) return ['unisex'];
  return Array.from(s);
}

export function sortOptionToApiParam(sort: FragranceSortOption): string {
  const map: Record<FragranceSortOption, string> = {
    'name-az': 'name_az',
    'name-za': 'name_za',
    rating: 'rating',
    'price-low': 'price_low',
    'price-high': 'price_high',
  };
  return map[sort];
}

function resolvedPriceBounds(filters: PlpCatalogFilters): {
  min?: number;
  max?: number;
} {
  const priceFromLabel =
    filters.price.length > 0 ? priceQueryLabelToMinMax(filters.price[0]) : null;
  const priceMin = filters.priceMin ?? priceFromLabel?.priceMin;
  const priceMax = filters.priceMax ?? priceFromLabel?.priceMax;
  return { min: priceMin, max: priceMax };
}

/**
 * Appends list / list-count query params. Use `genderForApi` when it differs from
 * `filters.gender` (e.g. men's PLP default men+unisex).
 */
export function appendPlpCatalogQueryParams(
  params: URLSearchParams,
  filters: PlpCatalogFilters,
  genderForApi?: string[]
): void {
  const genders = genderForApi ?? filters.gender;
  genders.forEach((g) => params.append('gender', g.toLowerCase()));
  filters.brand.forEach((b) => params.append('brand', b));
  filters.concentration.forEach((c) => params.append('concentration', c));
  filters.season.forEach((s) => params.append('season', s.toLowerCase()));
  filters.occasion.forEach((o) => params.append('occasion', o.toLowerCase()));
  filters.scentFamily.forEach((sf) => params.append('accord', sf.toLowerCase()));
  filters.category.forEach((c) => params.append('category', c));
  const { min, max } = resolvedPriceBounds(filters);
  if (min != null) params.set('min_price', String(min));
  if (max != null) params.set('max_price', String(max));
}

export async function fetchPlpCatalogPage(
  filters: PlpCatalogFilters,
  page: number,
  sortBy: FragranceSortOption,
  options?: { genderForApi?: string[]; sortApi?: string }
): Promise<Fragrance[]> {
  const params = new URLSearchParams();
  params.set('limit', String(PLP_CATALOG_PAGE_SIZE));
  params.set('offset', String(Math.max(0, page - 1) * PLP_CATALOG_PAGE_SIZE));
  params.set('sort', options?.sortApi ?? sortOptionToApiParam(sortBy));
  appendPlpCatalogQueryParams(params, filters, options?.genderForApi);

  const apiBase = getPublicApiBaseUrl();
  const url = apiBase
    ? `${apiBase}/api/v1/fragrances/?${params.toString()}`
    : `/api/fragrances/list?${params.toString()}`;

  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    timeoutMs: 8000,
    retries: 1,
  });
  const data = await res.json();
  return Array.isArray(data) ? (data as Fragrance[]) : [];
}

/**
 * Combined list + count in a single API call. Eliminates the second round-trip
 * that PLP pages were making for pagination totals.
 */
export async function fetchPlpCatalogPageWithCount(
  filters: PlpCatalogFilters,
  page: number,
  sortBy: FragranceSortOption,
  options?: { genderForApi?: string[]; sortApi?: string }
): Promise<{ items: Fragrance[]; count: number }> {
  const params = new URLSearchParams();
  params.set('limit', String(PLP_CATALOG_PAGE_SIZE));
  params.set('offset', String(Math.max(0, page - 1) * PLP_CATALOG_PAGE_SIZE));
  params.set('sort', options?.sortApi ?? sortOptionToApiParam(sortBy));
  appendPlpCatalogQueryParams(params, filters, options?.genderForApi);

  const apiBase = getPublicApiBaseUrl();
  const url = apiBase
    ? `${apiBase}/api/v1/fragrances/list-with-count?${params.toString()}`
    : `/api/fragrances/list-with-count?${params.toString()}`;

  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    timeoutMs: 8000,
    retries: 1,
  });
  const data = await res.json();

  // Handle both combined response and legacy list-only response
  if (data && typeof data === 'object' && 'items' in data) {
    return {
      items: Array.isArray(data.items) ? data.items : [],
      count: typeof data.count === 'number' ? data.count : 0,
    };
  }
  // Fallback: legacy endpoint returned a plain array
  const items = Array.isArray(data) ? data : [];
  return { items: items as Fragrance[], count: items.length };
}

export async function fetchPlpCatalogTotal(
  filters: PlpCatalogFilters,
  options?: { genderForApi?: string[] }
): Promise<number> {
  const params = new URLSearchParams();
  appendPlpCatalogQueryParams(params, filters, options?.genderForApi);

  const apiBase = getPublicApiBaseUrl();
  const url = apiBase
    ? `${apiBase}/api/v1/fragrances/list-count?${params.toString()}`
    : `/api/fragrances/list-count?${params.toString()}`;

  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    timeoutMs: 8000,
    retries: 1,
  });
  const data = (await res.json()) as { count?: number };
  return typeof data.count === 'number' ? data.count : 0;
}

/**
 * Hybrid search (BM25 + vector); callers filter/rank further if needed.
 */
export async function fetchHybridSearchFragrances(
  query: string,
  apiBase: string
): Promise<Fragrance[]> {
  const base = apiBase?.trim().replace(/\/+$/, "") || "";
  const url = base
    ? `${base}/api/v1/hybrid-search/search?query=${encodeURIComponent(query)}&limit=50`
    : `/api/fragrances/hybrid-search?query=${encodeURIComponent(query)}&limit=50`;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        timeoutMs: 10000,
        retries: 1,
      },
    );
    const data = await res.json();
    if (!data?.results || !Array.isArray(data.results)) return [];
    return data.results.map(
      (r: Record<string, unknown> & { brand_name?: string; brand?: string }) => ({
        ...r,
        brand: r.brand || r.brand_name || '',
        brand_name: r.brand_name || r.brand || '',
        image_url: r.image_url || r.primary_image_url || '',
        primary_image_url: r.primary_image_url || r.image_url || '',
      })
    ) as Fragrance[];
  } catch (err) {
    console.warn('Hybrid search failed:', err);
    return [];
  }
}
