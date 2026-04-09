"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { type Fragrance } from '@/api/base44Client';
import { normalizeGender } from '@/lib/filterUtils';
import * as SliderPrimitive from '@radix-ui/react-slider';

// Brands list is built dynamically from available products. Concentrations aligned with Supabase (EDC, EDP, EDT, Parfum, Extrait).
const concentrations = ['EDP', 'EDT', 'EDC', 'Parfum', 'Extrait', 'Cologne'];
const scentAccords = [
  'Fresh', 'Floral', 'Woody', 'Citrus', 'Fruity', 'Aquatic',
  'Aromatic', 'Amber', 'Musky', 'Powdery', 'Aldehydic', 'Green', 'Sweet',
  'Vanilla', 'Leather', 'Oud', 'Rose', 'Spicy', 'Smoky', 'Chypre'
];
const seasons = ['Spring', 'Summer', 'Monsoon', 'Fall', 'Winter', 'All Seasons'];
/** Align with backend `occasions` keys and admin (evening, outdoor). */
const occasions = [
  'Office',
  'Date Night',
  'Party',
  'Daily',
  'Wedding',
  'Casual',
  'Formal',
  'Evening',
  'Outdoor',
];
const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 2000;
const PRICE_SLIDER_STEP = 50;

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = false }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1.5 text-left hover:bg-gray-50 rounded px-1 transition-colors min-h-[36px]"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-[#1A1A1A] text-xs uppercase tracking-tight">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-4 h-4 text-[#404040]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -4 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.05 }}
              className="pt-1 pb-0.5"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}

const CheckboxItem = ({ label, checked, onChange, count }: CheckboxItemProps) => (
  <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-gray-50 px-1 rounded text-xs min-h-[32px] items-center group">
    <div className="flex items-center gap-2 min-w-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded border border-[#E5DDD6] bg-white accent-terracotta-500 text-terracotta-500"
      />
      <span className="text-[#1A1A1A] group-hover:text-[#B85A3A] truncate">{label}</span>
    </div>
    {count !== undefined && (
      <span className="text-[10px] text-[#404040] shrink-0 ml-2">{count}</span>
    )}
  </label>
);

interface FilterOptionsProps {
  options: string[];
  category: string;
  filters: string[] | undefined;
  counts: Record<string, number>;
  onToggle: (category: string, value: string) => void;
}

const FilterOptions = ({ options, category, filters, counts, onToggle }: FilterOptionsProps) => {
  return (
    <>
      {options.map(option => {
        const count = counts[option] || 0;
        const selected = filters?.includes(option) ?? false;
        // Show row when it has products or is active (e.g. deep-linked ?occasion=evening with 0 count)
        if (count === 0 && !selected) return null;
        return (
          <CheckboxItem
            key={option}
            label={option}
            checked={filters?.includes(option) || false}
            onChange={() => onToggle(category, option)}
            count={count}
          />
        );
      })}
    </>
  );
};

interface FilterCounts {
  gender: Record<string, number>;
  brand: Record<string, number>;
  concentration: Record<string, number>;
  scentFamily: Record<string, number>;
  season: Record<string, number>;
  occasion: Record<string, number>;
  price: Record<string, number>;
  category: Record<string, number>;
}

/** Server-provided counts (full catalog); when set, used instead of availableProducts for counts. */
export interface ServerFilterCounts {
  gender: Record<string, number>;
  brand: Record<string, number>;
  concentration: Record<string, number>;
  scentFamily: Record<string, number>;
  season: Record<string, number>;
  occasion: Record<string, number>;
  price: Record<string, number>;
  category: Record<string, number>;
}

interface EnhancedSidebarProps {
  filters: {
    gender?: string[];
    brand?: string[];
    concentration?: string[];
    scentFamily?: string[];
    season?: string[];
    occasion?: string[];
    price?: string[];
    priceMin?: number;
    priceMax?: number;
    category?: string[];
  };
  onFilterChange: (category: string, values: string[]) => void;
  onClearAll: () => void;
  availableProducts?: Fragrance[];
  priceBasis?: '3ml' | '8ml' | '12ml';
  /** When provided, filter counts come from server (full catalog); idempotent and correct. */
  serverFilterCounts?: ServerFilterCounts | null;
}

// Helper functions for data normalization
const normalizeString = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const mapOccasionName = (occasion: string): string => {
  const normalized = normalizeString(occasion);
  return normalized === 'Date' ? 'Date Night' : normalized;
};

const getPriceRange = (price: number | string): string => {
  const p = Number(price);
  if (p < 200) return 'Under ₹200';
  if (p <= 400) return '₹200 - ₹400';
  if (p <= 700) return '₹400 - ₹700';
  return 'Above ₹700';
};

// Calculate filter counts from available products
const getPriceForBasis = (product: Fragrance, priceBasis: '3ml' | '8ml' | '12ml'): number | null => {
  const raw =
    priceBasis === '3ml'
      ? (product as any).price_3ml
      : priceBasis === '8ml'
        ? ((product as any).price_8ml ?? (product as any).price_3ml)
        : ((product as any).price_12ml ?? (product as any).price_3ml);
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const calculateFilterCounts = (
  products: Fragrance[],
  priceBasis: '3ml' | '8ml' | '12ml'
): FilterCounts => {
  const counts: FilterCounts = {
    gender: {},
    brand: {},
    concentration: {},
    scentFamily: {},
    season: {},
    occasion: {},
    price: {},
    category: {}
  };

  products.forEach((product) => {
    // Gender normalize to lowercase so "Men"/"men" and "Women"/"women" are idempotent (Supabase may return either)
    const genderKey = normalizeGender(product.gender);
    if (genderKey) {
      counts.gender[genderKey] = (counts.gender[genderKey] || 0) + 1;
    }

    // Brand view returns brand_name
    const brandName = (product as any).brand_name || product.brand;
    if (brandName) {
      counts.brand[brandName] = (counts.brand[brandName] || 0) + 1;
    }

    // Concentration
    const conc = (product as any).concentration as string | undefined;
    if (conc) {
      counts.concentration[conc] = (counts.concentration[conc] || 0) + 1;
    }

    // Scent Family count from main_accords array
    const accords: string[] = (product as any).main_accords ?? [];
    accords.forEach((accord: string) => {
      // Capitalize first letter to match scentAccords list (e.g. "fresh" -> "Fresh")
      const normalized = accord.charAt(0).toUpperCase() + accord.slice(1).toLowerCase();
      // Only count accords that are in our known list
      if (scentAccords.some(sa => sa.toLowerCase() === normalized.toLowerCase())) {
        const matched = scentAccords.find(sa => sa.toLowerCase() === normalized.toLowerCase())!;
        counts.scentFamily[matched] = (counts.scentFamily[matched] || 0) + 1;
      }
    });

    // Season only count seasons with score > 70
    const seasonSource = (product as any).seasons ?? (product as any).season;
    if (Array.isArray(seasonSource)) {
      seasonSource.forEach((s) => {
        const sk = String(s).toLowerCase();
        if (sk === 'day' || sk === 'night') return;
        const normalized = normalizeString(String(s));
        counts.season[normalized] = (counts.season[normalized] || 0) + 1;
      });
    } else if (seasonSource && typeof seasonSource === 'object') {
      Object.entries(seasonSource).forEach(([k, v]) => {
        if (k === 'day' || k === 'night') return;
        if ((v as number) > 70) {
          const normalized = normalizeString(k);
          counts.season[normalized] = (counts.season[normalized] || 0) + 1;
        }
      });
    }

    // Occasion JSONB object {office: 80, date: 85} only count score > 70
    const occSource = (product as any).occasions ?? (product as any).occasion;
    const occasionKeyToDisplay: Record<string, string> = {
      'office': 'Office', 'date': 'Date Night', 'party': 'Party',
      'daily': 'Daily', 'wedding': 'Wedding', 'casual': 'Casual', 'formal': 'Formal',
      'evening': 'Evening', 'outdoor': 'Outdoor'
    };
    if (Array.isArray(occSource)) {
      occSource.forEach((o: string) => {
        const displayName = mapOccasionName(String(o));
        counts.occasion[displayName] = (counts.occasion[displayName] || 0) + 1;
      });
    } else if (occSource && typeof occSource === 'object') {
      Object.entries(occSource).forEach(([k, v]) => {
        if ((v as number) > 70) {
          const displayName = occasionKeyToDisplay[k.toLowerCase()] || mapOccasionName(k);
          counts.occasion[displayName] = (counts.occasion[displayName] || 0) + 1;
        }
      });
    }

    // Price (based on selected size)
    const priceValue = getPriceForBasis(product, priceBasis);
    if (priceValue !== null) {
      const range = getPriceRange(priceValue);
      counts.price[range] = (counts.price[range] || 0) + 1;
    }

    // Category (best_seller, new_arrival, sale) sale can come from category or is_on_sale (Supabase)
    const cat = (product as { category?: string }).category;
    if (cat) {
      counts.category[cat] = (counts.category[cat] || 0) + 1;
    }
    if ((product as { is_on_sale?: boolean }).is_on_sale) {
      counts.category['sale'] = (counts.category['sale'] || 0) + 1;
    }
  });

  return counts;
};

export default function EnhancedSidebar({
  filters,
  onFilterChange,
  onClearAll,
  availableProducts = [],
  priceBasis = '3ml',
  serverFilterCounts
}: EnhancedSidebarProps) {
  const [brandSearch, setBrandSearch] = useState('');
  const [scentSearch, setScentSearch] = useState('');

  // Prefer server counts (full catalog) when provided; otherwise derive from availableProducts
  const filterCounts = useMemo((): FilterCounts => {
    if (serverFilterCounts != null) return serverFilterCounts as FilterCounts;
    return calculateFilterCounts(availableProducts, priceBasis);
  }, [serverFilterCounts, availableProducts, priceBasis]);

  // Price slider bounds from available products (or defaults)
  const priceBounds = useMemo(() => {
    const prices = availableProducts
      .map(p => getPriceForBasis(p, priceBasis))
      .filter((v): v is number => v !== null);
    if (prices.length === 0) return { min: PRICE_SLIDER_MIN, max: PRICE_SLIDER_MAX };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return {
      min: Math.max(0, Math.floor(min / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP),
      max: Math.min(PRICE_SLIDER_MAX, Math.ceil(max / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP)
    };
  }, [availableProducts, priceBasis]);

  // Build brand list dynamically from available products
  const availableBrands = useMemo(() => {
    return Object.entries(filterCounts.brand)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filterCounts.brand]);

  // Memoize filtered brands based on search
  const filteredBrands = useMemo(() => {
    if (!brandSearch) return availableBrands;
    const searchLower = brandSearch.toLowerCase();
    return availableBrands.filter(brand =>
      brand.name.toLowerCase().includes(searchLower)
    );
  }, [availableBrands, brandSearch]);

  const selectedScents = useMemo(() => {
    return (filters.scentFamily || [])
      .map(value => value.trim())
      .filter(Boolean);
  }, [filters.scentFamily]);

  const selectedScentsLower = useMemo(() => {
    return new Set(selectedScents.map(value => value.toLowerCase()));
  }, [selectedScents]);

  const scentAccordsWithSelected = useMemo(() => {
    const map = new Map<string, string>();
    scentAccords.forEach((accord) => {
      map.set(accord.toLowerCase(), accord);
    });
    selectedScents.forEach((accord) => {
      const key = accord.toLowerCase();
      if (!map.has(key)) {
        map.set(key, accord);
      }
    });
    return Array.from(map.values());
  }, [selectedScents]);

  // Memoize available scent accords with counts
  const availableScentAccords = useMemo(() => {
    return scentAccordsWithSelected
      .map(scent => ({
        name: scent,
        count: filterCounts.scentFamily[scent] || 0,
        isSelected: selectedScentsLower.has(scent.toLowerCase())
      }))
      .filter(s => s.count > 0 || s.isSelected);
  }, [filterCounts.scentFamily, scentAccordsWithSelected, selectedScentsLower]);

  // Memoize filtered scent accords based on search
  const filteredScentAccords = useMemo(() => {
    if (!scentSearch) return availableScentAccords;
    const searchLower = scentSearch.toLowerCase();
    return availableScentAccords.filter(scent =>
      scent.name.toLowerCase().includes(searchLower)
    );
  }, [availableScentAccords, scentSearch]);

  const toggleFilter = (category: string, value: string) => {
    const raw = filters[category as keyof typeof filters];
    const current: string[] = Array.isArray(raw) ? raw : [];
    let updated: string[];
    // Category (gender): single-select so list shows only Men's / Women's / Unisex based on selection
    if (category === 'gender') {
      updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [value];
    } else if (category === 'scentFamily') {
      const valueLower = value.toLowerCase();
      const exists = current.some(v => v.toLowerCase() === valueLower);
      updated = exists
        ? current.filter(v => v.toLowerCase() !== valueLower)
        : [...current, value];
    } else {
      updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
    }
    onFilterChange(category, updated);
  };

  const activeFilterCount = useMemo(() => {
    const fromArrays = Object.entries(filters)
      .filter(([k]) => k !== 'priceMin' && k !== 'priceMax')
      .reduce((acc, [, v]) => acc + (Array.isArray(v) ? v.length : 0), 0);
    const hasPriceRange =
      filters.priceMin != null || filters.priceMax != null ? 1 : 0;
    return fromArrays + hasPriceRange;
  }, [filters]);

  const quickFilters = useMemo(() => {
    const hasOccasion = (name: string) => (filterCounts.occasion[name] || 0) > 0;
    const hasSeason = (name: string) => (filterCounts.season[name] || 0) > 0;
    const hasScent = (name: string) => (filterCounts.scentFamily[name] || 0) > 0;

    const pickScent = (options: string[]) => options.find(opt => hasScent(opt));

    const presets: { name: string; filters: Record<string, string[]> }[] = [];

    const addOccasionPreset = (name: string, occasion: string, preferredScents: string[]) => {
      if (!hasOccasion(occasion)) return;
      const scent = pickScent(preferredScents);
      const filters: Record<string, string[]> = { occasion: [occasion] };
      if (scent) filters.scentFamily = [scent];
      presets.push({ name, filters });
    };

    const addSeasonPreset = (name: string, season: string, preferredScents: string[]) => {
      if (!hasSeason(season)) return;
      const scent = pickScent(preferredScents);
      const filters: Record<string, string[]> = { season: [season] };
      if (scent) filters.scentFamily = [scent];
      presets.push({ name, filters });
    };

    addOccasionPreset('Office Safe', 'Office', ['Fresh', 'Aromatic', 'Green', 'Citrus']);
    addOccasionPreset('Date Night', 'Date Night', ['Floral', 'Amber', 'Sweet', 'Powdery']);
    addOccasionPreset('Party Night', 'Party', ['Woody', 'Spicy', 'Amber', 'Smoky']);
    addOccasionPreset('Wedding Ready', 'Wedding', ['Floral', 'Powdery', 'Rose']);
    addOccasionPreset('Formal', 'Formal', ['Woody', 'Leather', 'Amber']);
    addOccasionPreset('Daily Wear', 'Daily', ['Fresh', 'Aromatic', 'Citrus']);
    addOccasionPreset('Casual', 'Casual', ['Fresh', 'Green', 'Aquatic']);

    addSeasonPreset('Summer Fresh', 'Summer', ['Fresh', 'Citrus', 'Aquatic']);
    addSeasonPreset('Winter Warm', 'Winter', ['Amber', 'Woody', 'Spicy', 'Smoky']);
    addSeasonPreset('Spring Bloom', 'Spring', ['Floral', 'Fresh', 'Green']);
    addSeasonPreset('Fall Cozy', 'Fall', ['Woody', 'Amber', 'Spicy']);

    const scored = presets.map(preset => {
      const score = Object.entries(preset.filters).reduce((sum, [key, values]) => {
        const counts = (filterCounts as unknown as Record<string, Record<string, number>>)[key] || {};
        return sum + values.reduce((acc: number, v: string) => acc + (counts[v] || 0), 0);
      }, 0);
      return { ...preset, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ score, ...preset }) => preset);
  }, [filterCounts]);

  const applyPreset = (preset: typeof quickFilters[0]) => {
    Object.entries(preset.filters).forEach(([key, values]) => {
      onFilterChange(key, values);
    });
  };

  return (
    <div className="min-h-0 overflow-y-auto border-r border-gray-200 bg-white p-4 pb-6 [color-scheme:light]">
      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h4 className="text-[10px] font-bold text-[#404040] uppercase tracking-wider mb-3 px-1">Quick Filters</h4>
          <div className="flex flex-wrap gap-1.5 px-1">
            {quickFilters.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="text-[11px] px-2.5 py-1.5 bg-neutral-100 hover:bg-[#B85A3A] hover:text-white text-[#1A1A1A] rounded-full transition-colors min-h-[28px]"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-[#1A1A1A]">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-[#B85A3A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-[#B85A3A] hover:text-[#A04D2F] flex items-center gap-1 transition-colors shrink-0"
            aria-label="Clear all filters"
          >
            Clear All
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Gender / Category */}
      <FilterSection title="Category" defaultOpen>
        <CheckboxItem
          label="Women's Perfume"
          checked={filters.gender?.includes('women') || false}
          onChange={() => toggleFilter('gender', 'women')}
          count={filterCounts.gender['women'] || 0}
        />
        <CheckboxItem
          label="Men's Cologne"
          checked={filters.gender?.includes('men') || false}
          onChange={() => toggleFilter('gender', 'men')}
          count={filterCounts.gender['men'] || 0}
        />
        <CheckboxItem
          label="Unisex"
          checked={filters.gender?.includes('unisex') || false}
          onChange={() => toggleFilter('gender', 'unisex')}
          count={filterCounts.gender['unisex'] || 0}
        />
      </FilterSection>

      {/* Best Sellers / New / Sale */}
      {(filterCounts.category['best_seller'] || filterCounts.category['new_arrival'] || filterCounts.category['sale']) ? (
        <FilterSection title="Shop by">
          {filterCounts.category['best_seller'] ? (
            <CheckboxItem
              label="Best Sellers"
              checked={filters.category?.includes('best_seller') || false}
              onChange={() => toggleFilter('category', 'best_seller')}
              count={filterCounts.category['best_seller'] || 0}
            />
          ) : null}
          {filterCounts.category['new_arrival'] ? (
            <CheckboxItem
              label="New Arrival"
              checked={filters.category?.includes('new_arrival') || false}
              onChange={() => toggleFilter('category', 'new_arrival')}
              count={filterCounts.category['new_arrival'] || 0}
            />
          ) : null}
          {filterCounts.category['sale'] ? (
            <CheckboxItem
              label="On Sale"
              checked={filters.category?.includes('sale') || false}
              onChange={() => toggleFilter('category', 'sale')}
              count={filterCounts.category['sale'] || 0}
            />
          ) : null}
        </FilterSection>
      ) : null}

      {/* Brand / Designer */}
      <FilterSection title="Brand / Designer" defaultOpen>
        <div className="relative mb-2 px-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#404040]" />
          <input
            type="text"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Search brands..."
            className="w-full rounded-md border border-[#E5DDD6] bg-white py-1.5 pl-8 pr-2 text-xs text-[#1A1A1A] placeholder:text-[#8A8580] focus:border-terracotta-500/40 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>
        <div className="max-h-40 overflow-y-auto space-y-0.5 px-1">
          {filteredBrands.length > 0 ? (
            filteredBrands.map(brand => (
              <CheckboxItem
                key={brand.name}
                label={brand.name}
                checked={filters.brand?.includes(brand.name) || false}
                onChange={() => toggleFilter('brand', brand.name)}
                count={brand.count}
              />
            ))
          ) : (
            <p className="text-sm text-[#404040] py-1.5 px-2">No brands found</p>
          )}
        </div>
      </FilterSection>

      {/* Concentration */}
      <FilterSection title="Concentration">
        <FilterOptions
          options={concentrations}
          category="concentration"
          filters={filters.concentration}
          counts={filterCounts.concentration}
          onToggle={toggleFilter}
        />
      </FilterSection>

      {/* Scent Accords */}
      <FilterSection title="Scent Accords">
        <div className="relative mb-2 px-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#404040]" />
          <input
            type="text"
            value={scentSearch}
            onChange={(e) => setScentSearch(e.target.value)}
            placeholder="Search scents..."
            className="w-full rounded-md border border-[#E5DDD6] bg-white py-1.5 pl-8 pr-2 text-xs text-[#1A1A1A] placeholder:text-[#8A8580] focus:border-terracotta-500/40 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
          />
        </div>
        <div className="max-h-40 overflow-y-auto space-y-0.5 px-1">
          {filteredScentAccords.length > 0 ? (
            filteredScentAccords.map(scent => (
              <CheckboxItem
                key={scent.name}
                label={scent.name}
                checked={selectedScentsLower.has(scent.name.toLowerCase())}
                onChange={() => toggleFilter('scentFamily', scent.name)}
                count={scent.count}
              />
            ))
          ) : (
            <p className="text-sm text-[#404040] py-1.5 px-2">No scents found</p>
          )}
        </div>
      </FilterSection>

      {/* Season */}
      <FilterSection title="Season">
        <FilterOptions
          options={seasons}
          category="season"
          filters={filters.season}
          counts={filterCounts.season}
          onToggle={toggleFilter}
        />
      </FilterSection>

      {/* Occasion */}
      <FilterSection title="Recommended Uses">
        <FilterOptions
          options={occasions}
          category="occasion"
          filters={filters.occasion}
          counts={filterCounts.occasion}
          onToggle={toggleFilter}
        />
      </FilterSection>

      {/* Price min/max range slider */}
      <FilterSection title="Price Range">
        <div className="px-1 pt-1 pb-1 space-y-2">
          <SliderPrimitive.Root
            min={priceBounds.min}
            max={priceBounds.max}
            step={PRICE_SLIDER_STEP}
            value={[
              filters.priceMin ?? priceBounds.min,
              filters.priceMax ?? priceBounds.max
            ]}
            onValueChange={([minVal, maxVal]) => {
              const min = minVal ?? priceBounds.min;
              const max = maxVal ?? priceBounds.max;
              onFilterChange('priceRange', [String(min), String(max)]);
            }}
            className="relative flex w-full touch-none select-none items-center py-2"
          >
            <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-100">
              <SliderPrimitive.Range className="absolute h-full bg-[#B85A3A]" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-[#B85A3A]/50 bg-white shadow-sm transition-colors focus-visible:outline-none" />
            <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-[#B85A3A]/50 bg-white shadow-sm transition-colors focus-visible:outline-none" />
          </SliderPrimitive.Root>
          <p className="text-[11px] font-medium text-[#404040] text-center">
            ₹{filters.priceMin ?? priceBounds.min} – ₹{filters.priceMax ?? priceBounds.max}
          </p>
        </div>
      </FilterSection>
    </div>
  );
}
