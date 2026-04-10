'use client';

import React, { Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Filter, Info, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { type Fragrance } from '@/api/base44Client';
import { createProductUrl } from '@/utils';
import { useAppContext } from '@/contexts/AppContext';
import {
  ForYouStyleProductCard,
  type ForYouStyleProductCardFragrance,
} from '@/components/recommendations/ForYouStyleProductCard';
import PlpProductGridSkeleton from '@/components/common/PlpProductGridSkeleton';
import { PRODUCT_LISTING_GRID_CLASS } from '@/lib/sectionCardSizes';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { ListingViewToggle } from '@/components/common/ListingViewToggle';
import { usePlpListingView } from '@/hooks/usePlpListingView';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  normalizeGender,
  occasionDisplayToKey,
  priceQueryLabelToMinMax,
  normalizeOccasionTokenFromUrl,
} from '@/lib/filterUtils';
import {
  type FragranceSortOption,
  FRAGRANCE_SORT_OPTIONS,
  sortFragrances,
} from '@/lib/sortFragrances';
import { useFilterOptionsFromApi } from '@/hooks/useFilterOptionsFromApi';
import { getPerfumesSync } from '@/lib/perfumeData';
import { WaitlistGate } from '@/components/waitlist/WaitlistGate';
import {
  PLP_CATALOG_PAGE_SIZE,
  fetchHybridSearchFragrances,
  fetchPlpCatalogPage,
  fetchPlpCatalogPageWithCount,
  fetchPlpCatalogTotal,
} from '@/lib/plpCatalogFetch';
import { getPublicApiBaseUrl } from '@/lib/publicApiBase';
import { isFragranceInStock } from '@/lib/fragranceStock';
import {
  getPriceForListedSizeInr,
  hasListedSizePrice,
  listedDecantSizeDisplayLabel,
} from '@/lib/fragranceCardPricing';
// Lazy-load heavy below-fold components
const EnhancedSidebar = dynamic(() => import('@/components/filters/EnhancedSidebar'), {
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-neutral-100" />,
});
const IS_WAITLIST_PREVIEW =
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === 'true' ||
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === '1';

interface FilterState {
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

/** Counts active sidebar filters for the mobile filter button badge. */
function catalogActiveFilterCount(f: FilterState): number {
  let n =
    f.gender.length +
    f.category.length +
    f.scentFamily.length +
    f.brand.length +
    f.concentration.length +
    f.season.length +
    f.occasion.length +
    f.price.length;
  if (f.priceMin != null || f.priceMax != null) n += 1;
  return n;
}

/** PLP rows may be full `Fragrance` or minimal API shapes; normalize image/brand access. */
function plpCardImageUrl(row: Record<string, unknown>): string | undefined {
  const raw = row.primary_image_url ?? row.image_url;
  return typeof raw === 'string' ? raw : undefined;
}

function plpCardBrand(row: Record<string, unknown>): string {
  const raw = row.brand_name ?? row.brand;
  return typeof raw === 'string' ? raw : '';
}

function plpCornerBadgeForFragrance(f: unknown): 'best_seller' | 'new' | null {
  const row = f as Record<string, unknown>;
  if (row.is_new === true) return 'new';
  if (row.category === 'best_seller' || row.is_best_seller === true) return 'best_seller';
  return null;
}

/**
 * Maps a shop-all PLP row to the shared For You tile shape.
 */
function plpFragranceToForYou(f: unknown): ForYouStyleProductCardFragrance {
  const row = f as Record<string, unknown>;
  const frag = f as Fragrance;
  const id = frag.id || '';
  const brand = plpCardBrand(row);
  return {
    id,
    name: frag.name || '',
    brand,
    brand_slug:
      typeof row.brand_slug === 'string'
        ? row.brand_slug
        : brand.toLowerCase().replace(/\s+/g, '-'),
    price_3ml: Math.round(Number(frag.price_3ml)) || 0,
    price_8ml: frag.price_8ml != null ? Math.round(Number(frag.price_8ml)) : undefined,
    price_12ml: frag.price_12ml != null ? Math.round(Number(frag.price_12ml)) : undefined,
    original_price_3ml:
      frag.original_price_3ml != null ? Math.round(Number(frag.original_price_3ml)) : undefined,
    original_price_8ml:
      row.original_price_8ml != null ? Math.round(Number(row.original_price_8ml)) : undefined,
    original_price_12ml:
      row.original_price_12ml != null ? Math.round(Number(row.original_price_12ml)) : undefined,
    primary_image_url: plpCardImageUrl(row),
    image_url: plpCardImageUrl(row),
    blind_buy_score: Number(frag.blind_buy_score) || 0,
    is_on_sale: row.category === 'sale' || row.is_on_sale === true,
    occasions: Array.isArray(row.occasions) ? (row.occasions as string[]) : undefined,
    in_stock: isFragranceInStock(frag as { in_stock?: boolean }),
  };
}

const normalizeScentFamilyValue = (value: string): string => {
  return value
    .split(' ')
    .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
    .join(' ')
    .trim();
};

function ShopAllPageContent() {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [selectedSize, setSelectedSize] = useState<string>('8ml');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hybridResults, setHybridResults] = useState<Fragrance[] | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    gender: [],
    category: [],
    price: [],
    priceMin: undefined,
    priceMax: undefined,
    scentFamily: [],
    brand: [],
    concentration: [],
    season: [],
    occasion: []
  });
  const { addToCart: contextAddToCart } = useAppContext();
  const analytics = useAnalytics();

  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const fragrancesRef = useRef(fragrances);
  fragrancesRef.current = fragrances;
  const catalogFetchGen = useRef(0);

  useLayoutEffect(() => {
    const c = getPerfumesSync();
    if (c.length === 0) return;
    setFragrances((prev) =>
      prev.length === 0 ? (c as unknown as Fragrance[]) : prev
    );
    setLoading(false);
  }, []);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [sortBy, setSortBy] = useState<FragranceSortOption>('rating');
  const [listPage, setListPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [listingAddingId, setListingAddingId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { mode: listingViewMode, setMode: setListingViewMode, productGridClassName } = usePlpListingView();
  const apiBase = getPublicApiBaseUrl();
  const { filterCounts: serverFilterCounts } = useFilterOptionsFromApi(apiBase);

  // Enable scroll restoration with query params
  useScrollRestoration();

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const newFilters: FilterState = {
      gender: [],
      category: [],
      price: [],
      priceMin: undefined,
      priceMax: undefined,
      scentFamily: [],
      brand: [],
      concentration: [],
      season: [],
      occasion: [],
    };

    const seasonMap: Record<string, string> = {
      monsoon: 'Monsoon',
      summer: 'Summer',
      spring: 'Spring',
      fall: 'Fall',
      winter: 'Winter',
      'all seasons': 'All Seasons',
    };

    ['gender', 'brand', 'concentration', 'scentFamily', 'price', 'category', 'style'].forEach((key) => {
      const value = params.get(key);
      if (!value) return;
      if (key === 'style' || key === 'scentFamily') {
        (newFilters as unknown as Record<string, string[]>).scentFamily = value
          .split(',')
          .map(normalizeScentFamilyValue)
          .filter(Boolean);
      } else if (key in newFilters) {
        (newFilters as unknown as Record<string, string[]>)[key] = value.split(',').filter(Boolean);
      }
    });

    if (newFilters.price.length > 0) {
      const parsed = priceQueryLabelToMinMax(newFilters.price[0]);
      if (parsed) {
        newFilters.priceMin = parsed.priceMin;
        newFilters.priceMax = parsed.priceMax;
        newFilters.price = [];
      }
    }

    // Also read numeric priceMin/priceMax directly from URL (written by the URL-sync effect)
    const urlPriceMin = params.get('priceMin');
    const urlPriceMax = params.get('priceMax');
    if (urlPriceMin && newFilters.priceMin == null) {
      const v = Number(urlPriceMin);
      if (Number.isFinite(v)) newFilters.priceMin = v;
    }
    if (urlPriceMax && newFilters.priceMax == null) {
      const v = Number(urlPriceMax);
      if (Number.isFinite(v)) newFilters.priceMax = v;
    }

    const seasonParam = params.get('season');
    if (seasonParam) {
      const seasonValues = seasonParam.split(',').map((s) => {
        return seasonMap[s.toLowerCase()] || s.charAt(0).toUpperCase() + s.slice(1);
      });
      newFilters.season = seasonValues;
    }

    const occasionParam = params.get('occasion');
    const occasionValues: string[] = [];
    if (occasionParam) {
      occasionParam.split(',').forEach((o) => {
        const normalized = normalizeOccasionTokenFromUrl(o);
        if (normalized) occasionValues.push(normalized);
      });
    }
    const timeParam = params.get('time');
    if (timeParam === 'day' && !occasionValues.includes('Office')) occasionValues.push('Office');
    if (timeParam === 'night' && !occasionValues.includes('Date Night')) occasionValues.push('Date Night');
    if (occasionValues.length > 0) newFilters.occasion = occasionValues;

    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
      if (fragrancesRef.current.length === 0) {
        setLoading(true);
      }
      fetchHybridSearchFragrances(searchParam, apiBase).then((hybridData) => {
        if (hybridData.length > 0) {
          setHybridResults(hybridData);
          setLoading(false);
        } else {
          setHybridResults(null);
          setLoading(false);
        }
      });
    } else {
      setSearchQuery('');
      setHybridResults(null);
    }

    const sizeParam = params.get('size');
    if (sizeParam && ['3ml', '8ml', '12ml'].includes(sizeParam)) {
      setSelectedSize(sizeParam);
    }

    const pageParam = params.get('page');
    const parsedPage = pageParam ? parseInt(pageParam, 10) : NaN;
    setListPage(Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1);

    setFilters(newFilters);
    setFiltersInitialized(true);
  }, [searchParamsString, apiBase]);

  const handleListingAddToCart = async (cardFrag: ForYouStyleProductCardFragrance) => {
    if (!isFragranceInStock(cardFrag)) return;
    setListingAddingId(cardFrag.id);
    try {
      await contextAddToCart({
        item_id: cardFrag.id,
        item_type: 'fragrance',
        item_name: cardFrag.name,
        item_brand: cardFrag.brand,
        price:
          getPriceForListedSizeInr(cardFrag, selectedSize as '3ml' | '8ml' | '12ml') ||
          cardFrag.price_3ml,
        size: selectedSize,
        quantity: 1,
        image_url: cardFrag.image_url || cardFrag.primary_image_url,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.message('Pilot preview', {
        description: 'Cart opens on the full ScentRev site at launch.',
      });
    } finally {
      setListingAddingId(null);
    }
  };

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  const activeFilterCount = useMemo(() => catalogActiveFilterCount(filters), [filters]);

  // (duplicate init effect removed handled by the filtersInitialized effect above)

  const catalogFilterKey = [
    filters.gender.join(','),
    filters.season.join(','),
    filters.occasion.join(','),
    filters.scentFamily.join(','),
    filters.brand.join(','),
    filters.concentration.join(','),
    filters.category.join(','),
    filters.price.join(','),
    filters.priceMin ?? '',
    filters.priceMax ?? '',
  ].join('|');

  // Total row count for current filters (catalog only; not per page).
  // Combined catalog list + count in a single API call (saves ~200-400ms vs two separate calls).
  useEffect(() => {
    if (!filtersInitialized) return;
    if (searchQuery.trim()) return;

    let cancelled = false;
    setTotalCount(null);

    const gen = ++catalogFetchGen.current;
    setLoadError(false);

    const syncCatalog = getPerfumesSync();
    if (fragrancesRef.current.length === 0 && syncCatalog.length > 0) {
      setFragrances(syncCatalog as unknown as Fragrance[]);
    }
    // Only show the skeleton when there's nothing to display yet.
    // If we already have cards (from cache or a previous fetch), keep them
    // visible while the background refresh runs so images don't disappear.
    if (fragrancesRef.current.length === 0 && syncCatalog.length === 0) {
      setLoading(true);
    }

    void (async () => {
      try {
        const { items, count } = await fetchPlpCatalogPageWithCount(filters, listPage, sortBy);
        if (catalogFetchGen.current !== gen || cancelled) return;
        setFragrances(items);
        setTotalCount(count);
        setLoadError(false);
      } catch (error) {
        console.error('Error loading fragrances:', error);
        if (catalogFetchGen.current !== gen || cancelled) return;
        setFragrances([]);
        setTotalCount(null);
        setLoadError(true);
      } finally {
        if (catalogFetchGen.current === gen && !cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filtersInitialized, searchQuery, listPage, sortBy, catalogFilterKey]);

  useEffect(() => {
    if (searchQuery.trim() || listPage <= 1) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listPage, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() || totalCount === null || totalCount <= 0) return;
    const maxPage = Math.max(1, Math.ceil(totalCount / PLP_CATALOG_PAGE_SIZE));
    if (listPage > maxPage) setListPage(maxPage);
  }, [totalCount, listPage, searchQuery]);

  // Debounced hybrid search when user types in the search box
  useEffect(() => {
    if (!filtersInitialized) return;
    const q = searchQuery.trim();
    if (!q) {
      setHybridResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetchHybridSearchFragrances(q, apiBase).then((data) => {
        setHybridResults(data.length > 0 ? data : null);
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, filtersInitialized, apiBase]);

  useEffect(() => {
    // Only update URL after filters have been initialized from URL
    if (typeof window !== 'undefined' && filtersInitialized) {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, values]) => {
        if (key === 'priceMin' || key === 'priceMax') return;
        if (Array.isArray(values) && values.length > 0) {
          params.set(key, values.join(','));
        }
      });

      // Persist numeric price range so it survives the URL round-trip
      if (filters.priceMin != null) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax != null) params.set('priceMax', String(filters.priceMax));

      if (searchQuery) params.set('search', searchQuery);

      if (listPage > 1) params.set('page', String(listPage));
      else params.delete('page');

      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [filters, searchQuery, filtersInitialized, listPage]);

  const handleFilterChange = (category: string, values: string[]) => {
    setListPage(1);
    if (category === 'priceRange') {
      const min = values[0] ? Number(values[0]) : undefined;
      const max = values[1] ? Number(values[1]) : undefined;
      setFilters((prev) => {
        const next = { ...prev, priceMin: min, priceMax: max };
        analytics.shopAllFilterApplied({
          ...next,
          priceRange: [min, max],
        });
        return next;
      });
      return;
    }
    setFilters((prev) => {
      const next = { ...prev, [category]: values };
      analytics.shopAllFilterApplied({
        gender: next.gender,
        category: next.category,
        price: next.price,
        scentFamily: next.scentFamily,
        brand: next.brand,
        concentration: next.concentration,
        season: next.season,
        occasion: next.occasion,
        priceMin: next.priceMin,
        priceMax: next.priceMax,
      });
      return next;
    });
  };

  const clearAllFilters = () => {
    setListPage(1);
    setFilters({
      gender: [],
      category: [],
      price: [],
      priceMin: undefined,
      priceMax: undefined,
      scentFamily: [],
      brand: [],
      concentration: [],
      season: [],
      occasion: []
    });
    setSearchQuery('');
    setHybridResults(null);
  };

  const filteredFragrances = useMemo(() => {
    const sizeKey = selectedSize as '3ml' | '8ml' | '12ml';

    if (hybridResults && hybridResults.length > 0 && searchQuery.trim()) {
      return hybridResults.filter((f) => hasListedSizePrice(f, sizeKey));
    }

    const sourceFragrances = fragrances ?? [];

    // Server already applied filters and sort for the paginated catalog.
    if (!searchQuery.trim()) {
      return sourceFragrances.filter((f) => hasListedSizePrice(f, sizeKey));
    }

    const priceFromLabel =
      filters.price.length > 0 ? priceQueryLabelToMinMax(filters.price[0]) : null;
    const priceFilterMin = filters.priceMin ?? priceFromLabel?.priceMin;
    const priceFilterMax = filters.priceMax ?? priceFromLabel?.priceMax;

    let list = sourceFragrances.filter((f) => {
      if (searchQuery && !hybridResults) {
        const query = searchQuery.toLowerCase();
        const brandName = ((f as { brand_name?: string }).brand_name || f.brand || '').toLowerCase();
        if (!f.name.toLowerCase().includes(query) && !brandName.includes(query)) {
          return false;
        }
      }

      if (filters.gender.length > 0) {
        const selected = new Set(filters.gender.map((g: string) => (g || '').toLowerCase()));
        const g = normalizeGender(f.gender);
        if (!g) return false;
        const matches =
          (selected.has('men') && (g === 'men' || g === 'unisex')) ||
          (selected.has('women') && (g === 'women' || g === 'unisex')) ||
          (selected.has('unisex') && g === 'unisex') ||
          selected.has(g);
        if (!matches) return false;
      }

      if (filters.category.length > 0) {
        const matches = filters.category.some((cat) => {
          if (cat === 'sale') return !!(f as { is_on_sale?: boolean }).is_on_sale;
          if (cat === 'best_seller') {
            return (
              (f as { is_best_seller?: boolean }).is_best_seller === true ||
              f.category === 'best_seller'
            );
          }
          return f.category === cat;
        });
        if (!matches) return false;
      }

      if (priceFilterMin != null || priceFilterMax != null) {
        const price =
          selectedSize === '3ml'
            ? Number(f.price_3ml)
            : selectedSize === '8ml'
              ? Number((f as { price_8ml?: number }).price_8ml ?? f.price_3ml)
              : Number((f as { price_12ml?: number }).price_12ml ?? f.price_3ml);
        if (priceFilterMin != null && price < priceFilterMin) return false;
        if (priceFilterMax != null && price > priceFilterMax) return false;
      }

      if (filters.season.length > 0) {
        const fSeasons = (f as { seasons?: unknown; season?: unknown }).seasons ??
          (f as { season?: unknown }).season;
        let matchesSeason = false;
        if (Array.isArray(fSeasons)) {
          matchesSeason = filters.season.some((s) =>
            fSeasons.some((fs: string) => fs.toLowerCase() === s.toLowerCase())
          );
        } else if (fSeasons && typeof fSeasons === 'object') {
          matchesSeason = filters.season.some((s) => {
            const key = s.toLowerCase().replace(/\s+/g, '_');
            const matchedKey = Object.keys(fSeasons as object).find((k) => k.toLowerCase() === key);
            const score =
              matchedKey != null
                ? ((fSeasons as Record<string, number>)[matchedKey] ?? 0)
                : 0;
            return score > 70;
          });
        }
        if (!matchesSeason) return false;
      }

      if (filters.occasion.length > 0) {
        const fOccasions = (f as { occasions?: unknown; occasion?: unknown }).occasions ??
          (f as { occasion?: unknown }).occasion;
        let matchesOccasion = false;
        if (Array.isArray(fOccasions)) {
          matchesOccasion = filters.occasion.some((o) =>
            fOccasions.some(
              (fo: string) =>
                fo.toLowerCase() === o.toLowerCase() ||
                occasionDisplayToKey(o) === String(fo).toLowerCase()
            )
          );
        } else if (fOccasions && typeof fOccasions === 'object') {
          matchesOccasion = filters.occasion.some(
            (o) => ((fOccasions as Record<string, number>)[occasionDisplayToKey(o)] ?? 0) > 70
          );
        }
        if (!matchesOccasion) return false;
      }

      if (filters.scentFamily.length > 0) {
        const accords: string[] = (f as { main_accords?: string[] }).main_accords ?? [];
        const matchesAccord = filters.scentFamily.some((sf) => {
          const filterLower = sf.toLowerCase();
          return accords.some((a: string) => {
            const al = a.toLowerCase();
            return al === filterLower || al.includes(filterLower) || filterLower.includes(al);
          });
        });
        if (!matchesAccord) return false;
      }

      const fBrand = (f as { brand_name?: string }).brand_name || f.brand || '';
      if (filters.brand.length > 0 && !filters.brand.includes(fBrand)) {
        return false;
      }

      if (filters.concentration.length > 0) {
        const fConcentration = (f as { concentration?: string }).concentration || '';
        if (!filters.concentration.includes(fConcentration)) {
          return false;
        }
      }

      return true;
    });

    list = list.filter((f) => hasListedSizePrice(f, sizeKey));

    return sortFragrances(list, sortBy, sizeKey);
  }, [filters, searchQuery, fragrances, hybridResults, selectedSize, sortBy]);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#F5F2EE]">

      {/* ── Page hero strip ── */}
      <div className="relative overflow-hidden border-b border-[#E8DDD5] bg-[#F5F2EE] px-4 py-8 sm:px-6 sm:py-10">
        {/* Subtle orb */}
        <div className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.09)_0%,transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(ellipse,rgba(212,165,116,0.07)_0%,transparent_70%)]" aria-hidden />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#B85A3A]/20 bg-[#B85A3A]/8 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B85A3A]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">Pilot catalog</span>
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-[#1A1A1A] sm:text-3xl">
                Browse fragrances
              </h1>
              {/* min-height avoids hero reflow when totalCount hydrates (was shifting sticky toolbar). */}
              <p className="mt-1 min-h-[2.75rem] text-sm leading-snug text-[#6B6560] sm:min-h-0">
                {totalCount != null ? (
                  <><span className="font-semibold tabular-nums text-[#1A1A1A]">{totalCount.toLocaleString()}</span> fragrances · decants in 3, 5, 8 &amp; 10 ml · from ₹199</>
                ) : (
                  '450+ fragrances · decants in 3, 5, 8 & 10 ml · from ₹199'
                )}
              </p>
              <p className="mt-3 flex max-w-2xl gap-2 text-xs leading-relaxed text-[#8A7A72]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#B85A3A]/85" aria-hidden />
                <span>
                  On this pilot, catalog tiles and product pages show the retail bottle for reference only; you receive a
                  decant in your chosen size, not the full bottle. Decant-size bottle photography is not on the site yet.
                  At launch, each size will include its own imagery so you can see exactly how 3 ml, 5 ml, 8 ml, and 10 ml
                  bottles and cases look before you buy.
                </span>
              </p>
            </div>

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: '3 · 5 · 8 · 10 ml', sub: 'Decant sizes' },
                { label: 'Free shipping', sub: 'On all orders' },
                { label: 'India-first', sub: 'Heat & humidity' },
              ].map(({ label, sub }) => (
                <div key={label} className="rounded-xl border border-[#E4D9D0] bg-white/70 px-3 py-2 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-[#1A1A1A]">{label}</p>
                  <p className="text-[10px] text-[#8A7A72]">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-60 shrink-0 sticky top-12 self-start h-[calc(100dvh-3rem)] overflow-y-auto border-r border-[#E8E0D8] bg-white/80">
          <EnhancedSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={clearAllFilters}
            availableProducts={fragrances}
            priceBasis={selectedSize as '3ml' | '8ml' | '12ml'}
            serverFilterCounts={serverFilterCounts}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">

          {/* ── Sticky toolbar: top-12 matches WaitlistPreviewNav h-12 (was 3.25rem → subtle gap/jump). ── */}
          <div className="sticky top-12 z-40 border-b border-[#E4D9D0] bg-[#F5F2EE]/95 px-3 py-2 backdrop-blur-sm sm:px-4">
            <div className="flex min-h-10 items-center gap-2">
              {/* Mobile filter button: badge slot reserved so flex neighbors don’t shift width */}
              <button
                type="button"
                className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E4D9D0] bg-white/90 px-2.5 text-xs font-semibold text-[#5C534C] shadow-sm transition-colors hover:border-[#B85A3A] hover:text-[#B85A3A] lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="catalog-mobile-filters"
              >
                <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Filters
                <span
                  className={`ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    activeFilterCount > 0
                      ? 'bg-[#B85A3A] text-white'
                      : 'invisible pointer-events-none'
                  }`}
                  aria-hidden={activeFilterCount === 0}
                >
                  {activeFilterCount > 0 ? activeFilterCount : '0'}
                </span>
              </button>

              {/* Search */}
              <div className="relative min-h-9 min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A09088]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fragrances…"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  className="h-9 w-full rounded-lg border border-[#E4D9D0] bg-white/90 pl-9 pr-3 text-sm text-[#1A1A1A] placeholder:text-[#B0A898] shadow-sm transition-colors focus:border-[#B85A3A] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Size pills */}
              <div className="hidden h-9 shrink-0 items-center gap-1 border-l border-[#E0D8D0] pl-2 sm:flex">
                {(['3ml', '8ml', '12ml'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      selectedSize === size
                        ? 'bg-[#1A1A1A] text-white'
                        : 'text-[#5C534C] hover:bg-white hover:text-[#1A1A1A]'
                    }`}
                  >
                    {listedDecantSizeDisplayLabel(size)}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="hidden h-9 shrink-0 items-center gap-1.5 border-l border-[#E0D8D0] pl-2 sm:flex">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as FragranceSortOption); setListPage(1); }}
                  className="h-9 rounded-lg border border-[#E0D8D0] bg-white px-2.5 text-xs font-semibold text-[#1A1A1A] focus:border-[#B85A3A] focus:outline-none"
                  aria-label="Sort by"
                >
                  {FRAGRANCE_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* View toggle + count */}
              <div className="flex min-h-9 shrink-0 items-center gap-2 border-l border-[#E0D8D0] pl-2">
                <ListingViewToggle value={listingViewMode} onChange={setListingViewMode} />
                <span className="hidden text-xs text-[#A09088] tabular-nums lg:block">
                  {searchQuery.trim()
                    ? `${filteredFragrances.length}`
                    : totalCount ?? '…'}
                </span>
              </div>
            </div>

            {/* Mobile: size + sort row */}
            <div className="mt-2 flex items-center gap-2 sm:hidden">
              <div className="flex items-center gap-1">
                {(['3ml', '8ml', '12ml'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                      selectedSize === size
                        ? 'bg-[#1A1A1A] text-white'
                        : 'border border-[#E0D8D0] bg-white text-[#5C534C]'
                    }`}
                  >
                    {listedDecantSizeDisplayLabel(size)}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as FragranceSortOption); setListPage(1); }}
                className="ml-auto rounded-lg border border-[#E0D8D0] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1A1A] focus:outline-none"
                aria-label="Sort by"
              >
                {FRAGRANCE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[...filters.gender, ...filters.category, ...filters.scentFamily, ...filters.brand, ...filters.concentration, ...filters.season, ...filters.occasion].map((chip) => (
                  <span key={chip} className="inline-flex items-center rounded-full border border-[#E8D4C4] bg-white px-2 py-0.5 text-[11px] font-medium text-[#B85A3A]">
                    {chip}
                  </span>
                ))}
                {(filters.priceMin != null || filters.priceMax != null) && (
                  <span className="inline-flex items-center rounded-full border border-[#E8D4C4] bg-white px-2 py-0.5 text-[11px] font-medium text-[#B85A3A]">
                    ₹{filters.priceMin ?? 0}–{filters.priceMax != null ? `₹${filters.priceMax}` : '+'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-semibold text-[#8A6A5D] underline underline-offset-2 hover:text-[#B85A3A]"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ── Product grid ── */}
          <div className="px-3 pt-3 pb-6 sm:px-4">
            {loading ? (
              <PlpProductGridSkeleton
                gridClassName={productGridClassName}
                statusLabel="Loading products"
              />
            ) : loadError ? (
              <div className="rounded-2xl border border-[#E8E0D8] bg-white p-12 text-center shadow-sm">
                <p className="text-[#1A1A1A] text-base font-semibold mb-1">Couldn&apos;t load products</p>
                <p className="text-[#8A6A5D] text-sm mb-6">Check your connection and try again.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery.trim()) return;
                      const gen = ++catalogFetchGen.current;
                      setLoadError(false);
                      setLoading(true);
                      void (async () => {
                        try {
                          const rows = await fetchPlpCatalogPage(filters, listPage, sortBy);
                          if (catalogFetchGen.current !== gen) return;
                          setFragrances(rows);
                          setLoadError(false);
                        } catch {
                          if (catalogFetchGen.current !== gen) return;
                          setFragrances([]);
                          setLoadError(true);
                        } finally {
                          if (catalogFetchGen.current === gen) setLoading(false);
                        }
                      })();
                    }}
                    className="px-5 py-2.5 bg-[#B85A3A] text-white text-sm font-bold rounded-xl hover:bg-[#A04D2F] transition-colors"
                  >
                    Retry
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-[#2A2A2A] transition-colors"
                  >
                    Go home
                  </Link>
                </div>
              </div>
            ) : filteredFragrances.length === 0 ? (
              <div className="rounded-2xl border border-[#E8E0D8] bg-white p-12 text-center shadow-sm">
                <p className="text-[#1A1A1A] text-base font-semibold mb-1">No fragrances found</p>
                <p className="text-[#8A6A5D] text-sm mb-6">Try adjusting your filters or search query</p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#B85A3A] text-white text-sm font-bold rounded-xl hover:bg-[#A04D2F] transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <LazyMotion features={domAnimation}>
                <div className={productGridClassName}>
                  <AnimatePresence>
                    {filteredFragrances.map((fragrance, index) => {
                      const cardFrag = plpFragranceToForYou(fragrance);
                      const slug = (fragrance as { slug?: string }).slug;
                      const detailHref = `${createProductUrl(fragrance.id || '', slug)}?source=plp`;
                      return (
                        <m.div
                          key={fragrance.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ delay: Math.min(index * 0.025, 0.25) }}
                        >
                          <ForYouStyleProductCard
                            fragrance={cardFrag}
                            index={index}
                            addingToCartId={listingAddingId}
                            onAddToCart={handleListingAddToCart}
                            listedDecantSize={selectedSize as '3ml' | '8ml' | '12ml'}
                            plpCornerBadge={plpCornerBadgeForFragrance(fragrance)}
                            pilotShopCorner={IS_WAITLIST_PREVIEW}
                            reviewCount={null}
                            detailHref={detailHref}
                            priorityImage={index < 6}
                          />
                        </m.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {!searchQuery.trim() && totalCount !== null && totalCount > PLP_CATALOG_PAGE_SIZE && (
                  <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Catalog pages">
                    <button
                      type="button"
                      disabled={listPage <= 1 || loading}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                      className="min-h-[40px] px-4 rounded-xl border border-[#E8E0D8] bg-white text-sm font-semibold text-[#5C534C] hover:border-[#B85A3A] hover:text-[#B85A3A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-[#8A6A5D] tabular-nums">
                      Page {listPage} of {Math.max(1, Math.ceil(totalCount / PLP_CATALOG_PAGE_SIZE))}
                    </span>
                    <button
                      type="button"
                      disabled={loading || listPage >= Math.ceil(totalCount / PLP_CATALOG_PAGE_SIZE)}
                      onClick={() => setListPage((p) => p + 1)}
                      className="min-h-[40px] px-4 rounded-xl border border-[#E8E0D8] bg-white text-sm font-semibold text-[#5C534C] hover:border-[#B85A3A] hover:text-[#B85A3A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </LazyMotion>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="catalog-mobile-filters-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 lg:bg-black/40 lg:backdrop-blur-sm"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <aside
            id="catalog-mobile-filters"
            className="absolute inset-y-0 left-0 flex w-[min(100vw-2.5rem,22rem)] max-w-full flex-col border-r border-[#EDE0D8] bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#EDE0D8] px-4 py-3">
              <h2 id="catalog-mobile-filters-title" className="text-base font-bold text-[#1A1A1A]">
                Filters
              </h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8A6A5D] hover:bg-[#F5F0EC] transition-colors"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
              <EnhancedSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={clearAllFilters}
                availableProducts={fragrances}
                priceBasis={selectedSize as '3ml' | '8ml' | '12ml'}
                serverFilterCounts={serverFilterCounts}
              />
            </div>
            <div className="shrink-0 border-t border-[#EDE0D8] p-3">
              <button
                type="button"
                className="w-full min-h-[44px] rounded-xl bg-[#1A1A1A] py-3 text-sm font-bold text-white hover:bg-[#B85A3A] transition-colors"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show results
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/**
 * `useSearchParams` must run under Suspense in Next.js App Router.
 */
export default function WaitlistCatalogPage() {
  return (
    <WaitlistGate featureName="the Catalog">
      <Suspense
        fallback={
          <div className="min-h-screen bg-white store-main-scroll-offset">
            <div className="border-b border-neutral-100 bg-white shadow-sm h-[52px]" aria-hidden />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
              <PlpProductGridSkeleton
                gridClassName={PRODUCT_LISTING_GRID_CLASS}
                statusLabel="Loading shop catalog"
              />
            </div>
          </div>
        }
      >
        <ShopAllPageContent />
      </Suspense>
    </WaitlistGate>
  );
}
