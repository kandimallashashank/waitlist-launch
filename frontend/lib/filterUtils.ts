/**
 * Utility functions for filtering perfumes
 * Centralizes filtering logic used across multiple pages.
 * Ensures idempotency: same filter values (from URL or UI) produce the same result.
 * Supabase: gender can be 'men'|'Men', category best_seller|new_arrival|classic|trending, occasions JSONB keys lowercase.
 */

import type { PerfumeCard } from '@/types/perfume';

/** Canonical lowercase gender for filter state and comparison (Supabase may return 'Men' or 'men') */
export function normalizeGender(gender: string | null | undefined): string {
  const g = (gender || '').trim().toLowerCase();
  return g === 'male' ? 'men' : g === 'female' ? 'women' : g;
}

/**
 * Map from sidebar display label to DB occasions JSONB key (Supabase uses lowercase keys: date, office, ...).
 * Used when filtering by occasion and product.occasions is an object.
 */
export const OCCASION_DISPLAY_TO_KEY: Record<string, string> = {
  'Office': 'office',
  'Date Night': 'date',
  'Party': 'party',
  'Daily': 'daily',
  'Wedding': 'wedding',
  'Casual': 'casual',
  'Formal': 'formal',
  'Evening': 'evening',
  'Outdoor': 'outdoor',
};

/**
 * Lowercase URL/query tokens (comma-separated) → sidebar display label.
 * Used by Shop All and other pages that read `?occasion=`.
 */
export const OCCASION_URL_TOKEN_TO_DISPLAY: Record<string, string> = {
  office: 'Office',
  date: 'Date Night',
  'date night': 'Date Night',
  party: 'Party',
  daily: 'Daily',
  wedding: 'Wedding',
  casual: 'Casual',
  formal: 'Formal',
  evening: 'Evening',
  outdoor: 'Outdoor',
};

/**
 * Normalize a single occasion token from the URL to the sidebar display name.
 *
 * Args:
 *   token: Raw segment from `?occasion=` (e.g. `evening`, `Evening`).
 *
 * Returns:
 *   Display string (e.g. `Evening`) or title-cased token if unknown.
 */
export function normalizeOccasionTokenFromUrl(token: string): string {
  const t = token.trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  return OCCASION_URL_TOKEN_TO_DISPLAY[lower] ?? t.charAt(0).toUpperCase() + t.slice(1);
}

/** Get DB key for a filter occasion value (display name or raw). */
export function occasionDisplayToKey(display: string): string {
  const d = display.trim();
  return OCCASION_DISPLAY_TO_KEY[d] ?? d.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Map shop `price` query labels (home page links, legacy URLs) to numeric min/max
 * for client-side filtering. Aligns with EnhancedSidebar `getPriceRange` buckets.
 *
 * Args:
 *     label: Decoded query value, e.g. "₹400 - ₹700", "Under ₹200".
 *
 * Returns:
 *     Bounds for the selected bucket, or null if the label is not recognized.
 */
export function priceQueryLabelToMinMax(
  label: string
): { priceMin?: number; priceMax?: number } | null {
  const s = label.replace(/\s+/g, ' ').trim();
  const presets: [string, { priceMin?: number; priceMax?: number }][] = [
    ['Under ₹200', { priceMax: 199 }],
    ['₹200 - ₹400', { priceMin: 200, priceMax: 400 }],
    ['₹400 - ₹700', { priceMin: 400, priceMax: 700 }],
    ['Above ₹700', { priceMin: 701 }],
  ];
  for (const [key, bounds] of presets) {
    if (s === key) return { ...bounds };
  }
  const norm = (t: string) =>
    t.replace(/\u20b9/g, '₹').replace(/\s*-\s*/g, ' - ').trim();
  const sn = norm(s);
  for (const [key, bounds] of presets) {
    if (norm(key) === sn) return { ...bounds };
  }
  return null;
}

/**
 * Check if a product's occasions object matches any selected occasion (display names).
 * Uses score > 70 for object values (aligns with EnhancedSidebar counting).
 */
export function productMatchesOccasionFilter(
  occasions: Record<string, number> | string[] | null | undefined,
  selectedDisplayNames: string[]
): boolean {
  if (!occasions || selectedDisplayNames.length === 0) return true;
  if (Array.isArray(occasions)) {
    return selectedDisplayNames.some((o) =>
      occasions.some((po) => String(po).toLowerCase() === o.toLowerCase() || occasionDisplayToKey(o) === String(po).toLowerCase())
    );
  }
  return selectedDisplayNames.some((display) => {
    const key = occasionDisplayToKey(display);
    return (occasions[key] ?? 0) > 70;
  });
}

/**
 * Check if a product's seasons object/array matches any selected season.
 */
export function productMatchesSeasonFilter(
  seasons: Record<string, number> | string[] | null | undefined,
  selectedSeasons: string[]
): boolean {
  if (!seasons || selectedSeasons.length === 0) return true;
  const selectedLower = selectedSeasons.map((s) => s.toLowerCase().replace(/\s+/g, '_'));
  if (Array.isArray(seasons)) {
    return selectedLower.some((s) => seasons.some((ps) => String(ps).toLowerCase() === s));
  }
  return selectedLower.some((s) => {
    const score = Object.entries(seasons).find(([k]) => k.toLowerCase() === s)?.[1];
    return typeof score === 'number' && score > 70;
  });
}

export interface PerfumeFilters {
  brand: string[];
  concentration: string[];
  scentFamily: string[];
  season: string[];
  occasion: string[];
  price: string[];
}

/**
 * Apply all filters to a perfume array
 * @param perfumes - Array of perfumes to filter
 * @param filters - Filter criteria
 * @param searchQuery - Optional search query
 * @returns Filtered perfume array
 */
export function applyPerfumeFilters(
  perfumes: PerfumeCard[],
  filters: PerfumeFilters,
  searchQuery?: string
): PerfumeCard[] {
  let result = perfumes;

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand_name.toLowerCase().includes(query)
    );
  }

  // Brand filter
  if (filters.brand.length > 0) {
    result = result.filter(p => filters.brand.includes(p.brand_name));
  }

  // Concentration filter
  if (filters.concentration.length > 0) {
    result = result.filter(p => p.concentration && filters.concentration.includes(p.concentration));
  }

  // Scent family filter
  if (filters.scentFamily.length > 0) {
    result = result.filter(p => {
      if (!p.scent_family) return false;
      return filters.scentFamily.some((sf: string) => 
        p.scent_family.toLowerCase().includes(sf.toLowerCase())
      );
    });
  }

  // Season filter
  if (filters.season.length > 0) {
    result = result.filter(p => {
      if (!p.seasons || p.seasons.length === 0) return false;
      return filters.season.some((s: string) => 
        p.seasons.some((ps: string) => ps.toLowerCase() === s.toLowerCase())
      );
    });
  }

  // Occasion filter
  if (filters.occasion.length > 0) {
    result = result.filter(p => {
      if (!p.occasions || p.occasions.length === 0) return false;
      return filters.occasion.some((o: string) => 
        p.occasions.some((po: string) => po.toLowerCase() === o.toLowerCase())
      );
    });
  }

  // Price filter
  if (filters.price.length > 0) {
    result = result.filter(p => {
      const price = p.price_3ml;
      return filters.price.some((range: string) => {
        if (range === 'Under ₹200') return price < 200;
        if (range === '₹200 - ₹400') return price >= 200 && price <= 400;
        if (range === '₹400 - ₹700') return price >= 400 && price <= 700;
        if (range === 'Above ₹700') return price > 700;
        return false;
      });
    });
  }

  return result;
}

/**
 * Create an empty filter object
 * @returns Empty filter object with all arrays initialized
 */
export function createEmptyFilters(): PerfumeFilters {
  return {
    brand: [],
    concentration: [],
    scentFamily: [],
    season: [],
    occasion: [],
    price: []
  };
}

/**
 * Check if any filters are active
 * @param filters - Filter object to check
 * @returns True if any filter has values
 */
export function hasActiveFilters(filters: PerfumeFilters): boolean {
  return Object.values(filters).some(arr => arr.length > 0);
}

/**
 * Get the price for a perfume based on selected size
 * @param perfume - Perfume to get price for
 * @param size - Selected size
 * @returns Price for the selected size
 */
export function getPerfumePrice(
  perfume: PerfumeCard,
  size: '3ml' | '8ml' | '12ml'
): number {
  if (size === '3ml') return perfume.price_3ml;
  if (size === '8ml') return perfume.price_8ml || perfume.price_3ml;
  return perfume.price_12ml || perfume.price_3ml;
}
