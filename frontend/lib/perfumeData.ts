/**
 * Comprehensive Perfume Data
 * Fetches from API with fallback to static data
 */

import type { 
  PerfumeCard, 
  Brand,
  Gender,
  Category,
  Occasion
} from '@/types/perfume';
import { getPublicApiBaseUrl } from '@/lib/publicApiBase';

// ==================== Brands ====================

export const brands: Record<string, Brand> = {
  dior: {
    id: 'dior',
    name: 'Dior',
    country: 'France',
    founded_year: 1946,
    tier: 'designer',
    description: 'French luxury fashion house'
  },
  chanel: {
    id: 'chanel',
    name: 'Chanel',
    country: 'France',
    founded_year: 1910,
    tier: 'luxury',
    description: 'Iconic French fashion and fragrance house'
  },
  creed: {
    id: 'creed',
    name: 'Creed',
    country: 'France',
    founded_year: 1760,
    tier: 'niche',
    description: 'Historic niche fragrance house'
  },
  versace: {
    id: 'versace',
    name: 'Versace',
    country: 'Italy',
    founded_year: 1978,
    tier: 'designer',
    description: 'Italian luxury fashion brand'
  },
  ysl: {
    id: 'ysl',
    name: 'Yves Saint Laurent',
    country: 'France',
    founded_year: 1961,
    tier: 'designer',
    description: 'French luxury fashion house'
  },
  armani: {
    id: 'armani',
    name: 'Giorgio Armani',
    country: 'Italy',
    founded_year: 1975,
    tier: 'designer',
    description: 'Italian luxury fashion house'
  },
  tomford: {
    id: 'tomford',
    name: 'Tom Ford',
    country: 'USA',
    founded_year: 2005,
    tier: 'luxury',
    description: 'American luxury fashion brand'
  },
  lancome: {
    id: 'lancome',
    name: 'Lancôme',
    country: 'France',
    founded_year: 1935,
    tier: 'designer',
    description: 'French luxury cosmetics and fragrance'
  },
  mfk: {
    id: 'mfk',
    name: 'Maison Francis Kurkdjian',
    country: 'France',
    founded_year: 2009,
    tier: 'niche',
    description: 'Prestigious niche perfume house'
  },
  jpgaultier: {
    id: 'jpgaultier',
    name: 'Jean Paul Gaultier',
    country: 'France',
    founded_year: 1982,
    tier: 'designer',
    description: 'French haute couture fashion house'
  },
  carolinaherrera: {
    id: 'carolinaherrera',
    name: 'Carolina Herrera',
    country: 'Venezuela',
    founded_year: 1981,
    tier: 'designer',
    description: 'Venezuelan-American fashion house'
  },
  viktorandrolf: {
    id: 'viktorandrolf',
    name: 'Viktor & Rolf',
    country: 'Netherlands',
    founded_year: 1993,
    tier: 'designer',
    description: 'Dutch fashion house'
  },
  parfumsdemarly: {
    id: 'parfumsdemarly',
    name: 'Parfums de Marly',
    country: 'France',
    founded_year: 2009,
    tier: 'niche',
    description: 'French niche perfume house'
  }
};

// ==================== API Configuration ====================

const API_BASE = getPublicApiBaseUrl();

/** PLP pages client-fetch cap (~10 pages at 24/page) to reduce JSON vs ``limit=500``. */
export const PLP_CATALOG_FETCH_LIMIT = 240;

// Cache for API data
let _perfumesCache: PerfumeCard[] | null = null;
let _cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased for stability)
let _fetchPromise: Promise<PerfumeCard[]> | null = null;
let _lastFetchError: Error | null = null;
const _perfumeQueryCache = new Map<string, { data: PerfumeCard[]; timestamp: number }>();
const _perfumeQueryPromise = new Map<string, Promise<PerfumeCard[]>>();

interface PerfumeQueryParams {
  gender?: string[];
  category?: string[];
  brand?: string[];
  season?: string[];
  occasion?: string[];
  accord?: string[];
  style?: string[];
  concentration?: string[];
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}

/**
 * API Fragrance response type for type-safe conversion.
 */
export interface ApiFragrance {
  id: string;
  name: string;
  brand?: string;        // direct perfumes table
  brand_name?: string;   // v_perfumes_card view
  gender: Gender | string | string[] | null;
  concentration?: string;
  style?: string;        // legacy
  scent_family?: string; // v_perfumes_card view
  image_url?: string;
  primary_image_url?: string; // v_perfumes_card view
  price_3ml: number | string;
  price_8ml?: number | string;
  price_12ml?: number | string;
  original_price_3ml?: number | string;
  blind_buy_score?: number;
  category?: Category;
  season?: string[] | Record<string, number> | string;
  seasons?: string[] | Record<string, number> | string; // v_perfumes_card view (can be JSON string)
  occasion?: string[] | Record<string, number> | string;
  occasions?: string[] | Record<string, number> | string; // v_perfumes_card view (can be JSON string)
  main_accords?: string[];
  sillage?: number | string;
  longevity?: number | string;
  is_on_sale?: boolean;
  is_new?: boolean;
  is_best_seller?: boolean;
  review_count?: number;
  average_rating?: number;
  in_stock?: boolean;
  catalog_updated_at?: string | null;
}

/** Volatile subset from ``POST /api/v1/fragrances/live-fields`` (batched) for PLP merge. */
export interface FragranceLiveFieldsRow {
  id: string;
  price_3ml?: number | null;
  price_8ml?: number | null;
  price_12ml?: number | null;
  original_price_3ml?: number | null;
  is_on_sale?: boolean | null;
  in_stock?: boolean | null;
  review_count?: number | null;
  average_rating?: number | null;
  blind_buy_score?: number | null;
  catalog_updated_at?: string | null;
}

/** Must match API ``_LIVE_FIELDS_MAX_IDS_PER_REQUEST`` (fragrances router). */
const LIVE_FIELDS_CHUNK = 50;
/** Parallel batch requests (each up to LIVE_FIELDS_CHUNK ids). */
const LIVE_FIELDS_FETCH_CONCURRENCY = 4;

/**
 * Fetch volatile catalog fields for many IDs (prices, stock, reviews, image version).
 * Uses Upstash cache with 60s TTL to avoid hammering the backend on PLP page loads.
 * Calls POST /fragrances/live-fields in paginated chunks (no giant query strings).
 *
 * Args:
 *     ids: Perfume UUIDs from the current catalog slice.
 *
 * Returns:
 *     Map of id → live row; empty map on failure.
 */
export async function fetchFragranceLiveFields(_ids: string[]): Promise<Map<string, FragranceLiveFieldsRow>> {
  // Live fields are served via Supabase through /api/fragrances/[id]/live - no FastAPI needed.
  return new Map();
}

function mergeLiveIntoPerfumeCards(
  cards: PerfumeCard[],
  live: Map<string, FragranceLiveFieldsRow>
): PerfumeCard[] {
  if (live.size === 0) return cards;
  return cards.map((c) => {
    const L = live.get(c.id);
    if (!L) return c;
    return {
      ...c,
      price_3ml: typeof L.price_3ml === 'number' ? L.price_3ml : c.price_3ml,
      price_8ml: typeof L.price_8ml === 'number' ? L.price_8ml : c.price_8ml,
      price_12ml: typeof L.price_12ml === 'number' ? L.price_12ml : c.price_12ml,
      original_price_3ml:
        typeof L.original_price_3ml === 'number' ? L.original_price_3ml : c.original_price_3ml,
      is_on_sale: typeof L.is_on_sale === 'boolean' ? L.is_on_sale : c.is_on_sale,
      in_stock: typeof L.in_stock === 'boolean' ? L.in_stock : c.in_stock,
      review_count: typeof L.review_count === 'number' ? L.review_count : c.review_count,
      average_rating: typeof L.average_rating === 'number' ? L.average_rating : c.average_rating,
      blind_buy_score: typeof L.blind_buy_score === 'number' ? L.blind_buy_score : c.blind_buy_score,
      catalog_updated_at:
        typeof L.catalog_updated_at === 'string' && L.catalog_updated_at
          ? L.catalog_updated_at
          : c.catalog_updated_at,
    };
  });
}

async function attachLivePricesToCards(cards: PerfumeCard[]): Promise<PerfumeCard[]> {
  if (cards.length === 0) return cards;
  const ids = cards.map((c) => c.id).filter(Boolean);
  const live = await fetchFragranceLiveFields(ids);
  return mergeLiveIntoPerfumeCards(cards, live);
}

function normalizeGender(input: ApiFragrance["gender"]): Gender {
  if (Array.isArray(input)) {
    const values = input.map(v => String(v).toLowerCase().trim());
    const hasMen = values.some(v => ['men', 'male', 'man', "men's", 'mens', 'm'].includes(v));
    const hasWomen = values.some(v => ['women', 'female', 'woman', "women's", 'womens', 'f'].includes(v));
    if (hasMen && hasWomen) return 'unisex';
    if (hasMen) return 'men';
    if (hasWomen) return 'women';
    return 'unisex';
  }

  const value = String(input ?? '').toLowerCase().trim();
  if (['men', 'male', 'man', "men's", 'mens', 'm'].includes(value)) return 'men';
  if (['women', 'female', 'woman', "women's", 'womens', 'f'].includes(value)) return 'women';
  if (['unisex', 'uni', 'all', 'everyone', 'any'].includes(value)) return 'unisex';
  return 'unisex';
}

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const toNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeAccords = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(v => String(v).toLowerCase().trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(v => v.toLowerCase().trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeOccasionKey = (value: string): string | null => {
  const v = value.toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!v) return null;
  if (v.includes('office') || v.includes('work') || v.includes('business')) return 'office';
  if (v.includes('date')) return 'date';
  if (v.includes('party') || v.includes('club')) return 'party';
  if (v.includes('wedding')) return 'wedding';
  if (v.includes('formal') || v.includes('black tie')) return 'formal';
  if (v.includes('casual')) return 'casual';
  if (v.includes('daily') || v.includes('everyday') || v.includes('day')) return 'daily';
  return null;
};

const normalizeOccasions = (value: unknown): Occasion[] => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) {
    const mapped = parsed
      .map(v => normalizeOccasionKey(String(v)))
      .filter(Boolean) as Occasion[];
    return Array.from(new Set(mapped));
  }
  if (parsed && typeof parsed === 'object') {
    const entries = Object.entries(parsed as Record<string, number>);
    const mapped = entries
      .filter(([, score]) => Number(score) > 70)
      .map(([key]) => normalizeOccasionKey(String(key)))
      .filter(Boolean) as Occasion[];
    return Array.from(new Set(mapped));
  }
  if (typeof parsed === 'string') {
    const mapped = parsed
      .split(',')
      .map(v => normalizeOccasionKey(v))
      .filter(Boolean) as Occasion[];
    return Array.from(new Set(mapped));
  }
  return [];
};

type OccasionKey = 'office' | 'daily' | 'date' | 'party' | 'wedding' | 'casual' | 'formal';

const inferOccasions = (args: {
  accords: string[];
  sillage: number | null;
  longevity: number | null;
  seasonScores: Record<string, number>;
}): Occasion[] => {
  const scores: Record<OccasionKey, number> = {
    office: 0,
    daily: 0,
    casual: 0,
    date: 0,
    party: 0,
    wedding: 0,
    formal: 0,
  };

  const accordMatches = (needles: string[]) =>
    args.accords.some(a => needles.some(n => a.includes(n)));

  if (accordMatches(['fresh', 'citrus', 'aquatic', 'green', 'aromatic', 'herbal', 'lavender', 'mint', 'ozonic', 'clean'])) {
    scores.office += 2;
    scores.daily += 2;
    scores.casual += 1;
  }
  if (accordMatches(['powdery', 'soapy', 'soft'])) {
    scores.office += 1;
    scores.formal += 1;
  }
  if (accordMatches(['floral', 'rose', 'violet', 'white floral', 'jasmine', 'magnolia', 'iris'])) {
    scores.date += 2;
    scores.wedding += 2;
    scores.formal += 1;
  }
  if (accordMatches(['woody', 'amber', 'oriental', 'warm spicy', 'spicy', 'leather', 'tobacco', 'smoky', 'oud', 'incense'])) {
    scores.party += 2;
    scores.date += 1;
    scores.formal += 1;
  }
  if (accordMatches(['sweet', 'gourmand', 'vanilla', 'caramel', 'chocolate', 'honey', 'fruity'])) {
    scores.date += 2;
    scores.party += 1;
  }
  if (accordMatches(['musky', 'musk', 'skin'])) {
    scores.date += 1;
  }

  if (args.sillage !== null) {
    if (args.sillage >= 7) {
      scores.party += 2;
      scores.date += 1;
      scores.formal += 1;
    } else if (args.sillage <= 4) {
      scores.office += 2;
      scores.daily += 1;
      scores.casual += 1;
    } else {
      scores.date += 1;
      scores.party += 1;
    }
  }

  if (args.longevity !== null) {
    if (args.longevity >= 7) {
      scores.formal += 1;
      scores.party += 1;
    } else if (args.longevity <= 4) {
      scores.daily += 1;
      scores.casual += 1;
    }
  }

  const nightScore = Number(args.seasonScores.night || 0);
  const dayScore = Number(args.seasonScores.day || 0);
  if (nightScore >= 60) {
    scores.party += 1;
    scores.date += 1;
    scores.formal += 1;
  }
  if (dayScore >= 60) {
    scores.office += 1;
    scores.daily += 1;
    scores.casual += 1;
  }

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score >= 2)
    .map(([key]) => key as OccasionKey);

  if (ranked.length === 0) {
    return ['daily'];
  }
  return ranked.slice(0, 3) as Occasion[];
};

/**
 * Convert API fragrance response to PerfumeCard format.
 */
export function convertApiFragrance(f: ApiFragrance): PerfumeCard {
  const seasonsRaw = parseMaybeJson(f.seasons ?? f.season ?? []);
  const seasonScores = (seasonsRaw && typeof seasonsRaw === 'object' && !Array.isArray(seasonsRaw))
    ? (seasonsRaw as Record<string, number>)
    : {};

  const occRaw = parseMaybeJson(f.occasions ?? f.occasion ?? []);
  const normalizedOccasions = normalizeOccasions(occRaw);

  const accords = normalizeAccords(f.main_accords);
  const sillage = toNumber(f.sillage);
  const longevity = toNumber(f.longevity);
  const inferredOccasions = normalizedOccasions.length > 0
    ? normalizedOccasions
    : inferOccasions({ accords, sillage, longevity, seasonScores });

  return {
    id: f.id,
    name: f.name,
    brand_name: f.brand_name || f.brand || '',
    gender: normalizeGender(f.gender),
    concentration: f.concentration as PerfumeCard['concentration'],
    scent_family: (f.scent_family || f.style) as PerfumeCard['scent_family'],
    primary_image_url: f.primary_image_url || f.image_url || '/images/products/p1.jpg',
    price_3ml: Number(f.price_3ml),
    price_8ml: f.price_8ml != null ? Number(f.price_8ml) : undefined,
    price_12ml: f.price_12ml != null ? Number(f.price_12ml) : undefined,
    original_price_3ml: f.original_price_3ml != null ? Number(f.original_price_3ml) : undefined,
    blind_buy_score: f.blind_buy_score ?? 4.0,
    average_rating: f.average_rating ?? f.blind_buy_score ?? 4.0,
    review_count: f.review_count ?? 0,
    category: (f.category ?? 'trending') as Category,
    is_best_seller: Boolean((f as { is_best_seller?: boolean }).is_best_seller),
    is_new: !!(f as any).is_new || f.category === 'new_arrival',
    is_on_sale: !!(f as any).is_on_sale || (
      f.original_price_3ml != null && Number(f.original_price_3ml) > 0 &&
      Number(f.price_3ml) > 0 && Number(f.price_3ml) < Number(f.original_price_3ml)
    ),
    in_stock: f.in_stock !== false,
    catalog_updated_at:
      typeof f.catalog_updated_at === 'string' && f.catalog_updated_at
        ? f.catalog_updated_at
        : undefined,
    seasons: (seasonsRaw ?? []) as PerfumeCard['seasons'],
    occasions: inferredOccasions
  };
}

/**
 * Fetch perfumes from API with timeout and error handling
 * @returns Array of PerfumeCard objects from API
 * @throws Error if API request fails
 */
const buildPerfumeQuery = (params?: PerfumeQueryParams): string => {
  const search = new URLSearchParams();
  const pushList = (key: keyof PerfumeQueryParams, values?: string[], normalize?: (val: string) => string) => {
    if (!values || values.length === 0) return;
    values
      .filter(Boolean)
      .forEach((val) => search.append(key as string, normalize ? normalize(String(val)) : String(val)));
  };

  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.min_price != null) search.set('min_price', String(params.min_price));
  if (params?.max_price != null) search.set('max_price', String(params.max_price));

  const lower = (val: string) => val.toLowerCase();
  pushList('gender', params?.gender, lower);
  pushList('category', params?.category, lower);
  pushList('brand', params?.brand);
  pushList('season', params?.season, lower);
  pushList('occasion', params?.occasion, lower);
  pushList('accord', params?.accord, lower);
  pushList('style', params?.style, lower);
  pushList('concentration', params?.concentration, lower);

  return search.toString();
};

async function fetchPerfumesFromApi(params?: PerfumeQueryParams): Promise<PerfumeCard[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout')), 10000);

  try {
    const query = buildPerfumeQuery(params);
    // Always use the Next.js proxy route - never FastAPI directly
    const url = `/api/fragrances/list?${query || 'limit=500'}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data: ApiFragrance[] = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid API response');

    const cards = data.map(convertApiFragrance);
    return attachLivePricesToCards(cards);
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort =
      (error instanceof Error && error.name === 'AbortError') ||
      (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError');
    if (!isAbort) console.warn('Failed to fetch from API:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Get perfumes asynchronously with caching and request deduplication
 * Returns cached data if available and not expired
 * @returns Promise resolving to array of PerfumeCard objects
 */
export async function getPerfumesAsync(): Promise<PerfumeCard[]> {
  const now = Date.now();
  
  // Return cached data if valid
  if (_perfumesCache && _perfumesCache.length > 0 && (now - _cacheTimestamp) < CACHE_DURATION) {
    return attachLivePricesToCards(_perfumesCache);
  }
  
  // Deduplicate concurrent requests
  if (_fetchPromise) {
    return _fetchPromise;
  }
  
  _fetchPromise = fetchPerfumesFromApi()
    .then(data => {
      _perfumesCache = data;
      _cacheTimestamp = Date.now();
      _fetchPromise = null;
      return data;
    })
    .catch((err) => {
      _fetchPromise = null;
      // Use expired cache only if we have it; never use static fallback so API is the single source of truth
      if (_perfumesCache && _perfumesCache.length > 0) {
        console.warn('API fetch failed, using stale cache:', err instanceof Error ? err.message : err);
        return _perfumesCache;
      }
      throw err;
    });
  
  return _fetchPromise;
}

/**
 * Fetch perfumes from API with query params and caching.
 * Useful for fetching only a subset (e.g. men + unisex) to reduce payload size.
 */
export async function getPerfumesAsyncWithParams(
  params: PerfumeQueryParams = { limit: 300 }
): Promise<PerfumeCard[]> {
  const query = buildPerfumeQuery(params);
  const key = query || 'all';
  const now = Date.now();

  const cached = _perfumeQueryCache.get(key);
  if (cached && cached.data.length > 0 && (now - cached.timestamp) < CACHE_DURATION) {
    return attachLivePricesToCards(cached.data);
  }

  const pending = _perfumeQueryPromise.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetchPerfumesFromApi(params)
    .then((data) => {
      _perfumeQueryCache.set(key, { data, timestamp: Date.now() });
      _perfumeQueryPromise.delete(key);
      return data;
    })
    .catch((err) => {
      _perfumeQueryPromise.delete(key);
      if (cached && cached.data.length > 0) {
        console.warn('API fetch failed, using stale query cache:', err instanceof Error ? err.message : err);
        return cached.data;
      }
      throw err;
    });

  _perfumeQueryPromise.set(key, promise);
  return promise;
}

// ==================== Fallback/Static Perfume Data ====================

/**
 * Static perfume data used as fallback when API is unavailable
 * Also exported as `perfumes` for backward compatibility with existing code
 */
const fallbackPerfumes: PerfumeCard[] = [
  // === MEN'S BEST SELLERS ===
  {
    id: 'sauvage-edt',
    name: 'Sauvage',
    brand_name: 'Dior',
    gender: 'men',
    concentration: 'EDT',
    scent_family: 'Fresh & Clean',
    primary_image_url: '/images/products/p1.jpg',
    price_3ml: 349,
    price_8ml: 649,
    price_12ml: 899,
    original_price_3ml: 449,
    blind_buy_score: 4.8,
    average_rating: 4.7,
    review_count: 2847,
    category: 'best_seller',
    is_new: false,
    is_on_sale: true,
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['office', 'daily', 'date']
  },
  {
    id: 'bleu-de-chanel-edp',
    name: 'Bleu de Chanel',
    brand_name: 'Chanel',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Woody & Spicy',
    primary_image_url: '/images/products/p2.jpg',
    price_3ml: 399,
    price_8ml: 749,
    price_12ml: 1049,
    blind_buy_score: 4.7,
    average_rating: 4.8,
    review_count: 1923,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    occasions: ['office', 'daily', 'date', 'formal']
  },
  {
    id: 'aventus',
    name: 'Aventus',
    brand_name: 'Creed',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Woody & Spicy',
    primary_image_url: '/images/products/p3.jpg',
    price_3ml: 699,
    price_8ml: 1299,
    price_12ml: 1899,
    original_price_3ml: 899,
    blind_buy_score: 4.9,
    average_rating: 4.9,
    review_count: 3421,
    category: 'best_seller',
    is_new: false,
    is_on_sale: true,
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['office', 'party', 'date', 'wedding']
  },
  {
    id: 'eros-edt',
    name: 'Eros',
    brand_name: 'Versace',
    gender: 'men',
    concentration: 'EDT',
    scent_family: 'Sweet & Gourmand',
    primary_image_url: '/images/products/p4.jpg',
    price_3ml: 279,
    price_8ml: 529,
    price_12ml: 749,
    blind_buy_score: 4.5,
    average_rating: 4.6,
    review_count: 1567,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['party', 'date', 'evening']
  },
  {
    id: 'acqua-di-gio-profumo',
    name: 'Acqua di Gio Profumo',
    brand_name: 'Giorgio Armani',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Citrus & Aquatic',
    primary_image_url: '/images/products/p1.jpg',
    price_3ml: 349,
    price_8ml: 649,
    price_12ml: 899,
    blind_buy_score: 4.6,
    average_rating: 4.5,
    review_count: 1234,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['summer', 'spring'],
    occasions: ['office', 'daily', 'casual']
  },
  {
    id: 'y-edp',
    name: 'Y Eau de Parfum',
    brand_name: 'Yves Saint Laurent',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Fresh & Clean',
    primary_image_url: '/images/products/p2.jpg',
    price_3ml: 329,
    price_8ml: 619,
    price_12ml: 869,
    blind_buy_score: 4.4,
    average_rating: 4.5,
    review_count: 987,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['office', 'daily', 'date']
  },
  // === WOMEN'S BEST SELLERS ===
  {
    id: 'miss-dior-edp',
    name: 'Miss Dior',
    brand_name: 'Dior',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p5.jpg',
    price_3ml: 379,
    price_8ml: 699,
    price_12ml: 979,
    blind_buy_score: 4.6,
    average_rating: 4.7,
    review_count: 1876,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['spring', 'summer'],
    occasions: ['office', 'date', 'wedding']
  },
  {
    id: 'coco-mademoiselle',
    name: 'Coco Mademoiselle',
    brand_name: 'Chanel',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p6.jpg',
    price_3ml: 429,
    price_8ml: 799,
    price_12ml: 1099,
    blind_buy_score: 4.7,
    average_rating: 4.8,
    review_count: 2341,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['spring', 'fall'],
    occasions: ['office', 'date', 'formal']
  },
  {
    id: 'black-opium',
    name: 'Black Opium',
    brand_name: 'Yves Saint Laurent',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Sweet & Gourmand',
    primary_image_url: '/images/products/p2.jpg',
    price_3ml: 349,
    price_8ml: 649,
    price_12ml: 899,
    original_price_3ml: 449,
    blind_buy_score: 4.5,
    average_rating: 4.6,
    review_count: 1654,
    category: 'best_seller',
    is_new: false,
    is_on_sale: true,
    seasons: ['fall', 'winter'],
    occasions: ['party', 'date', 'evening']
  },
  {
    id: 'la-vie-est-belle',
    name: 'La Vie Est Belle',
    brand_name: 'Lancôme',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Sweet & Gourmand',
    primary_image_url: '/images/products/p6.jpg',
    price_3ml: 359,
    price_8ml: 669,
    price_12ml: 929,
    blind_buy_score: 4.4,
    average_rating: 4.5,
    review_count: 1432,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['date', 'party', 'evening']
  },
  {
    id: 'good-girl',
    name: 'Good Girl',
    brand_name: 'Carolina Herrera',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Oriental & Amber',
    primary_image_url: '/images/products/p5.jpg',
    price_3ml: 369,
    price_8ml: 689,
    price_12ml: 959,
    blind_buy_score: 4.3,
    average_rating: 4.4,
    review_count: 1123,
    category: 'best_seller',
    is_new: false,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['party', 'date', 'evening']
  },
  {
    id: 'baccarat-rouge-540',
    name: 'Baccarat Rouge 540',
    brand_name: 'Maison Francis Kurkdjian',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Oriental & Amber',
    primary_image_url: '/images/products/p1.jpg',
    price_3ml: 799,
    price_8ml: 1499,
    price_12ml: 2199,
    original_price_3ml: 999,
    blind_buy_score: 4.8,
    average_rating: 4.9,
    review_count: 2156,
    category: 'best_seller',
    is_new: false,
    is_on_sale: true,
    seasons: ['fall', 'winter', 'spring'],
    occasions: ['date', 'party', 'wedding', 'formal']
  },
  // === MEN'S NEW ARRIVALS ===
  {
    id: 'sauvage-elixir',
    name: 'Sauvage Elixir',
    brand_name: 'Dior',
    gender: 'men',
    concentration: 'Parfum',
    scent_family: 'Smoky & Dark',
    primary_image_url: '/images/products/p3.jpg',
    price_3ml: 549,
    price_8ml: 999,
    price_12ml: 1399,
    blind_buy_score: 4.7,
    average_rating: 4.8,
    review_count: 456,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['date', 'party', 'evening']
  },
  {
    id: 'ultra-male',
    name: 'Ultra Male',
    brand_name: 'Jean Paul Gaultier',
    gender: 'men',
    concentration: 'EDT',
    scent_family: 'Sweet & Gourmand',
    primary_image_url: '/images/products/p4.jpg',
    price_3ml: 329,
    price_8ml: 619,
    price_12ml: 869,
    blind_buy_score: 4.4,
    average_rating: 4.5,
    review_count: 234,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['party', 'date', 'evening']
  },
  {
    id: 'tobacco-vanille',
    name: 'Tobacco Vanille',
    brand_name: 'Tom Ford',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Leather & Tobacco',
    primary_image_url: '/images/products/p2.jpg',
    price_3ml: 649,
    price_8ml: 1199,
    price_12ml: 1699,
    blind_buy_score: 4.6,
    average_rating: 4.7,
    review_count: 312,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['winter'],
    occasions: ['party', 'date', 'wedding']
  },
  {
    id: 'oud-wood',
    name: 'Oud Wood',
    brand_name: 'Tom Ford',
    gender: 'men',
    concentration: 'EDP',
    scent_family: 'Woody & Spicy',
    primary_image_url: '/images/products/p1.jpg',
    price_3ml: 649,
    price_8ml: 1199,
    price_12ml: 1699,
    blind_buy_score: 4.5,
    average_rating: 4.6,
    review_count: 287,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['fall', 'winter'],
    occasions: ['formal', 'wedding', 'evening']
  },
  // === WOMEN'S NEW ARRIVALS ===
  {
    id: 'libre-edp',
    name: 'Libre',
    brand_name: 'Yves Saint Laurent',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p5.jpg',
    price_3ml: 369,
    price_8ml: 689,
    price_12ml: 959,
    blind_buy_score: 4.5,
    average_rating: 4.6,
    review_count: 389,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['spring', 'fall'],
    occasions: ['office', 'date', 'daily']
  },
  {
    id: 'chance-eau-tendre',
    name: 'Chance Eau Tendre',
    brand_name: 'Chanel',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p6.jpg',
    price_3ml: 399,
    price_8ml: 749,
    price_12ml: 1049,
    blind_buy_score: 4.4,
    average_rating: 4.5,
    review_count: 267,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['spring', 'summer'],
    occasions: ['daily', 'office', 'casual']
  },
  {
    id: 'flowerbomb',
    name: 'Flowerbomb',
    brand_name: 'Viktor & Rolf',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p5.jpg',
    price_3ml: 379,
    price_8ml: 699,
    price_12ml: 979,
    blind_buy_score: 4.3,
    average_rating: 4.4,
    review_count: 198,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['spring', 'fall'],
    occasions: ['date', 'party', 'wedding']
  },
  {
    id: 'delina',
    name: 'Delina',
    brand_name: 'Parfums de Marly',
    gender: 'women',
    concentration: 'EDP',
    scent_family: 'Floral & Elegant',
    primary_image_url: '/images/products/p6.jpg',
    price_3ml: 599,
    price_8ml: 1099,
    price_12ml: 1549,
    blind_buy_score: 4.6,
    average_rating: 4.7,
    review_count: 345,
    category: 'new_arrival',
    is_new: true,
    is_on_sale: false,
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['date', 'wedding', 'formal']
  }
];

// ==================== Synchronous Data Access ====================

/**
 * Synchronous access to perfume data.
 * Returns cached API data only; no static fallback so the app never shows fake data when API is the source.
 * @returns Array of PerfumeCard objects (empty until API has been fetched)
 */
export function getPerfumesSync(): PerfumeCard[] {
  return _perfumesCache && _perfumesCache.length > 0 ? _perfumesCache : [];
}

/**
 * Static fallback data - exported for backward compatibility only.
 * Prefer getPerfumesAsync() / getPerfumesSync(); do not use for listing pages.
 */
export const perfumes: PerfumeCard[] = fallbackPerfumes;

// Initialize cache on module load (client-side only)
if (typeof window !== 'undefined') {
  getPerfumesAsync().catch(console.error);
}

// ==================== Helper Functions ====================

/**
 * Get all unique brands from the perfume catalog
 * @returns Sorted array of unique brand names
 */
export function getUniqueBrands(): string[] {
  const data = getPerfumesSync();
  return [...new Set(data.map(p => p.brand_name))].sort();
}

/**
 * Get perfumes by gender
 * @param gender - The gender to filter by
 * @returns Array of perfumes matching the gender
 */
export function getPerfumesByGender(gender: Gender): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.gender === gender);
}

/**
 * Get perfumes by category
 * @param category - The category to filter by
 * @returns Array of perfumes matching the category
 */
export function getPerfumesByCategory(category: Category): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.category === category);
}

/**
 * Get best sellers by gender
 * @param gender - The gender to filter by
 * @returns Array of best seller perfumes for the specified gender
 */
export function getBestSellersByGender(gender: Gender): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.gender === gender && p.category === 'best_seller');
}

/**
 * Get new arrivals by gender
 * @param gender - The gender to filter by
 * @returns Array of new arrival perfumes for the specified gender
 */
export function getNewArrivalsByGender(gender: Gender): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.gender === gender && p.category === 'new_arrival');
}

/**
 * Get all best sellers
 * @returns Array of all best seller perfumes
 */
export function getAllBestSellers(): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.category === 'best_seller');
}

/**
 * Get all new arrivals
 * @returns Array of all new arrival perfumes
 */
export function getAllNewArrivals(): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.category === 'new_arrival');
}

/**
 * Get perfume by ID
 * @param id - The perfume ID to search for
 * @returns The perfume if found, undefined otherwise
 */
export function getPerfumeById(id: string): PerfumeCard | undefined {
  const data = getPerfumesSync();
  return data.find(p => p.id === id);
}

/**
 * Filter options with counts for UI display
 */
export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/**
 * All available filter options with counts
 */
export interface FilterOptions {
  brands: FilterOption[];
  concentrations: FilterOption[];
  scent_families: FilterOption[];
  seasons: FilterOption[];
  occasions: FilterOption[];
  price_ranges: FilterOption[];
}

/**
 * Get filter options with counts from a perfume array
 * @param sourcePerfumes - Array of perfumes to calculate filter options from
 * @returns FilterOptions object with counts for each filter category
 */
export function getFilterOptions(sourcePerfumes: PerfumeCard[]): FilterOptions {
  const brandCounts: Record<string, number> = {};
  const concentrationCounts: Record<string, number> = {};
  const scentFamilyCounts: Record<string, number> = {};
  const seasonCounts: Record<string, number> = {};
  const occasionCounts: Record<string, number> = {};
  const priceRangeCounts: Record<string, number> = {};

  sourcePerfumes.forEach(p => {
    // Brand counts
    brandCounts[p.brand_name] = (brandCounts[p.brand_name] || 0) + 1;
    
    // Concentration counts
    if (p.concentration) {
      concentrationCounts[p.concentration] = (concentrationCounts[p.concentration] || 0) + 1;
    }
    
    // Scent family counts
    if (p.scent_family) {
      scentFamilyCounts[p.scent_family] = (scentFamilyCounts[p.scent_family] || 0) + 1;
    }
    
    // Season counts
    if (p.seasons) {
      p.seasons.forEach(s => {
        seasonCounts[s] = (seasonCounts[s] || 0) + 1;
      });
    }
    
    // Occasion counts
    if (p.occasions) {
      p.occasions.forEach(o => {
        occasionCounts[o] = (occasionCounts[o] || 0) + 1;
      });
    }
    
    // Price range counts
    const price = p.price_3ml;
    let range = 'Above ₹700';
    if (price < 200) range = 'Under ₹200';
    else if (price <= 400) range = '₹200 - ₹400';
    else if (price <= 700) range = '₹400 - ₹700';
    priceRangeCounts[range] = (priceRangeCounts[range] || 0) + 1;
  });

  const toFilterOptions = (counts: Record<string, number>): FilterOption[] => {
    return Object.entries(counts)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    brands: toFilterOptions(brandCounts),
    concentrations: toFilterOptions(concentrationCounts),
    scent_families: toFilterOptions(scentFamilyCounts),
    seasons: toFilterOptions(seasonCounts),
    occasions: toFilterOptions(occasionCounts),
    price_ranges: toFilterOptions(priceRangeCounts)
  };
}

/**
 * Filters for perfume filtering
 */
export interface PerfumeFilters {
  gender?: string[];
  brand?: string[];
  concentration?: string[];
  scent_family?: string[];
  season?: string[];
  occasion?: string[];
  price_range?: string[];
  category?: string[];
  is_on_sale?: boolean;
  search?: string;
}

/**
 * Get perfumes filtered by multiple criteria
 * @param sourcePerfumes - Array of perfumes to filter (or filters object for backward compatibility)
 * @param filters - Optional filter criteria when sourcePerfumes is an array
 * @returns Array of perfumes matching all filter criteria
 */
export function filterPerfumes(
  sourcePerfumes: PerfumeCard[] | PerfumeFilters,
  filters?: PerfumeFilters
): PerfumeCard[] {
  // Handle backward compatibility: if first arg is filters object (not array)
  let source: PerfumeCard[];
  let filterCriteria: PerfumeFilters;
  
  if (Array.isArray(sourcePerfumes)) {
    source = sourcePerfumes;
    filterCriteria = filters || {};
  } else {
    // Old API: filterPerfumes(filters) - use current data
    source = getPerfumesSync();
    filterCriteria = sourcePerfumes;
  }

  return source.filter(p => {
    // Search filter
    if (filterCriteria.search) {
      const searchLower = filterCriteria.search.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(searchLower) ||
        p.brand_name.toLowerCase().includes(searchLower) ||
        (p.scent_family && p.scent_family.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Gender filter
    if (filterCriteria.gender?.length && !filterCriteria.gender.includes(p.gender)) return false;
    
    // Brand filter
    if (filterCriteria.brand?.length && !filterCriteria.brand.includes(p.brand_name)) return false;
    
    // Concentration filter
    if (filterCriteria.concentration?.length && p.concentration && !filterCriteria.concentration.includes(p.concentration)) return false;
    
    // Scent family filter
    if (filterCriteria.scent_family?.length && p.scent_family && !filterCriteria.scent_family.includes(p.scent_family)) return false;
    
    // Season filter
    if (filterCriteria.season?.length && p.seasons) {
      const hasMatchingSeason = p.seasons.some(s => filterCriteria.season!.includes(s));
      if (!hasMatchingSeason) return false;
    }
    
    // Occasion filter
    if (filterCriteria.occasion?.length && p.occasions) {
      const hasMatchingOccasion = p.occasions.some(o => filterCriteria.occasion!.includes(o));
      if (!hasMatchingOccasion) return false;
    }
    
    // Category filter (best seller: flag or legacy category column)
    if (filterCriteria.category?.length) {
      const ok = filterCriteria.category.some((cat) => {
        if (cat === 'best_seller') {
          return p.is_best_seller === true || p.category === 'best_seller';
        }
        return p.category === cat;
      });
      if (!ok) return false;
    }
    
    // Sale filter
    if (filterCriteria.is_on_sale !== undefined && p.is_on_sale !== filterCriteria.is_on_sale) return false;
    
    return true;
  });
}

/**
 * Get perfumes currently on sale
 * @returns Array of perfumes that are on sale
 */
export function getSalePerfumes(): PerfumeCard[] {
  const data = getPerfumesSync();
  return data.filter(p => p.is_on_sale);
}
