/**
 * Fetches filter options with counts from the backend so sidebar counts
 * reflect the full catalog (idempotent), not the current page's limited data.
 */

import { useState, useEffect, useCallback } from 'react';

export interface FilterCountsFromServer {
  gender: Record<string, number>;
  brand: Record<string, number>;
  concentration: Record<string, number>;
  scentFamily: Record<string, number>;
  season: Record<string, number>;
  occasion: Record<string, number>;
  price: Record<string, number>;
  category: Record<string, number>;
}

interface FilterOptionRaw {
  value: string;
  label: string;
  count: number;
}

interface PriceRangeRaw {
  label: string;
  min_price?: number | null;
  max_price?: number | null;
  count: number;
}

interface ApiFilterOptionsResponse {
  data?: {
    genders?: FilterOptionRaw[];
    brands?: FilterOptionRaw[];
    concentrations?: FilterOptionRaw[];
    seasons?: FilterOptionRaw[];
    occasions?: FilterOptionRaw[];
    scent_accords?: FilterOptionRaw[];
    categories?: FilterOptionRaw[];
    price_ranges?: PriceRangeRaw[];
  };
  total_products?: number;
}

const OCCASION_VALUE_TO_DISPLAY: Record<string, string> = {
  office: 'Office',
  date: 'Date Night',
  party: 'Party',
  daily: 'Daily',
  wedding: 'Wedding',
  casual: 'Casual',
  formal: 'Formal',
  evening: 'Evening',
  outdoor: 'Outdoor',
};

function formatSeason(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatAccord(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Converts backend filter options response into FilterCounts shape
 * used by EnhancedSidebar (idempotent with sidebar display names).
 */
function responseToFilterCounts(raw: ApiFilterOptionsResponse): FilterCountsFromServer {
  const data = raw?.data ?? {};
  const counts: FilterCountsFromServer = {
    gender: {},
    brand: {},
    concentration: {},
    scentFamily: {},
    season: {},
    occasion: {},
    price: {},
    category: {},
  };

  (data.genders ?? []).forEach((o) => {
    if (o.value) counts.gender[o.value] = o.count ?? 0;
  });
  (data.brands ?? []).forEach((o) => {
    const name = o.label || o.value;
    if (name) counts.brand[name] = o.count ?? 0;
  });
  (data.concentrations ?? []).forEach((o) => {
    if (o.value) counts.concentration[o.value] = o.count ?? 0;
  });
  (data.seasons ?? []).forEach((o) => {
    const key = formatSeason(o.label || o.value);
    if (key) counts.season[key] = o.count ?? 0;
  });
  (data.occasions ?? []).forEach((o) => {
    const display = OCCASION_VALUE_TO_DISPLAY[o.value?.toLowerCase()] ?? formatSeason(o.label || o.value);
    if (display) counts.occasion[display] = o.count ?? 0;
  });
  (data.scent_accords ?? []).forEach((o) => {
    const key = formatAccord(o.label || o.value);
    if (key) counts.scentFamily[key] = o.count ?? 0;
  });
  (data.categories ?? []).forEach((o) => {
    if (o.value) counts.category[o.value] = o.count ?? 0;
  });
  (data.price_ranges ?? []).forEach((pr) => {
    if (pr.label) counts.price[pr.label] = pr.count ?? 0;
  });

  return counts;
}

/**
 * Fetches filter options from GET /api/v1/filters/options and returns
 * counts in the shape EnhancedSidebar expects. Use this so sidebar
 * shows correct counts for the full catalog (idempotent).
 *
 * @param apiBase - Base URL for API (e.g. process.env.NEXT_PUBLIC_API_URL)
 * @param brandSlug - Optional; when on a brand collection page, pass slug for brand-scoped counts
 */
export function useFilterOptionsFromApi(
  apiBase: string,
  brandSlug?: string,
  gender?: string,
  category?: string
): {
  filterCounts: FilterCountsFromServer | null;
  totalProducts: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [filterCounts, setFilterCounts] = useState<FilterCountsFromServer | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (brandSlug) params.set('brand_slug', brandSlug);
      if (gender) params.set('gender', gender);
      if (category) params.set('category', category);
      // Call FastAPI directly bypasses the Next.js /api/filters/options proxy
      const directUrl = apiBase
        ? `${apiBase}/api/v1/filters/options${params.toString() ? `?${params.toString()}` : ''}`
        : `/api/filters/options${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(directUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Filters API ${res.status}`);
      const json: ApiFilterOptionsResponse = await res.json();
      setFilterCounts(responseToFilterCounts(json));
      setTotalProducts(json.total_products ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load filter options');
      setFilterCounts(null);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [apiBase, brandSlug, gender, category]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { filterCounts, totalProducts, loading, error, refetch: fetchOptions };
}
