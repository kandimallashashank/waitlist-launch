"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X, SlidersHorizontal } from 'lucide-react';
import type { FilterOptionsData, PriceRangeOption, FilterOption } from '@/api/base44Client';

/**
 * CollectionSidebarFilters - Enhanced sidebar filters for Brand Collection Page
 * 
 * Features:
 * - Display filter sections for gender, concentration, price, season, occasion, accords, year
 * - Show product count next to each option
 * - Support multi-select for each filter category
 * - Include search box for brand filter
 * 
 * Requirements: 3.4-3.11
 */

// ==================== Types ====================

export interface CollectionFilters {
  gender: string[];
  concentration: string[];
  priceRange: { min?: number; max?: number } | null;
  season: string[];
  occasion: string[];
  scentAccord: string[];
  year: number[];
}

interface CollectionSidebarFiltersProps {
  /** Filter options with counts from API */
  filterOptions: FilterOptionsData | null;
  /** Currently selected filters */
  filters: CollectionFilters;
  /** Callback when filters change */
  onFilterChange: (filters: CollectionFilters) => void;
  /** Callback to clear all filters */
  onClearAll: () => void;
  /** Whether filter options are loading */
  isLoading?: boolean;
  /** Brand name for context */
  brandName?: string;
}

// ==================== Sub-Components ====================

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}

const FilterSection = ({ title, children, defaultOpen = false, count }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#E5E5E5] pb-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded px-2 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#1A1A1A]">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-xs bg-[#B85A3A] text-white px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 px-2">
              {children}
            </div>
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
  disabled?: boolean;
}

const CheckboxItem = ({ label, checked, onChange, count, disabled }: CheckboxItemProps) => (
  <label 
    className={`flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 px-2 rounded transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border border-[#D5D5D5] bg-white accent-[#B85A3A] text-[#B85A3A] disabled:opacity-50"
      />
      <span className="text-sm text-[#1A1A1A]">{label}</span>
    </div>
    {count !== undefined && (
      <span className="text-xs text-[#404040]">({count})</span>
    )}
  </label>
);

interface SearchableFilterSectionProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  defaultOpen?: boolean;
}

const SearchableFilterSection = ({
  title,
  options,
  selectedValues,
  onToggle,
  placeholder = 'Search...',
  defaultOpen = false,
}: SearchableFilterSectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const selectedCount = selectedValues.length;

  return (
    <FilterSection title={title} defaultOpen={defaultOpen} count={selectedCount}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#404040]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(option => (
            <CheckboxItem
              key={option.value}
              label={option.label}
              checked={selectedValues.includes(option.value)}
              onChange={() => onToggle(option.value)}
              count={option.count}
              disabled={option.count === 0}
            />
          ))
        ) : (
          <p className="text-sm text-[#404040] py-2 px-2">No options found</p>
        )}
      </div>
    </FilterSection>
  );
};

// ==================== Main Component ====================

export default function CollectionSidebarFilters({
  filterOptions,
  filters,
  onFilterChange,
  onClearAll,
  isLoading = false,
  brandName,
}: CollectionSidebarFiltersProps) {
  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.gender.length;
    count += filters.concentration.length;
    count += filters.priceRange ? 1 : 0;
    count += filters.season.length;
    count += filters.occasion.length;
    count += filters.scentAccord.length;
    count += filters.year.length;
    return count;
  }, [filters]);

  // Toggle handlers for each filter category
  const toggleGender = useCallback((value: string) => {
    const newGenders = filters.gender.includes(value)
      ? filters.gender.filter(g => g !== value)
      : [...filters.gender, value];
    onFilterChange({ ...filters, gender: newGenders });
  }, [filters, onFilterChange]);

  const toggleConcentration = useCallback((value: string) => {
    const newConcentrations = filters.concentration.includes(value)
      ? filters.concentration.filter(c => c !== value)
      : [...filters.concentration, value];
    onFilterChange({ ...filters, concentration: newConcentrations });
  }, [filters, onFilterChange]);

  const togglePriceRange = useCallback((priceRange: PriceRangeOption) => {
    const currentMin = filters.priceRange?.min;
    const currentMax = filters.priceRange?.max;
    
    // If same range is selected, deselect it
    if (currentMin === priceRange.minPrice && currentMax === priceRange.maxPrice) {
      onFilterChange({ ...filters, priceRange: null });
    } else {
      onFilterChange({ 
        ...filters, 
        priceRange: { min: priceRange.minPrice, max: priceRange.maxPrice } 
      });
    }
  }, [filters, onFilterChange]);

  const toggleSeason = useCallback((value: string) => {
    const newSeasons = filters.season.includes(value)
      ? filters.season.filter(s => s !== value)
      : [...filters.season, value];
    onFilterChange({ ...filters, season: newSeasons });
  }, [filters, onFilterChange]);

  const toggleOccasion = useCallback((value: string) => {
    const newOccasions = filters.occasion.includes(value)
      ? filters.occasion.filter(o => o !== value)
      : [...filters.occasion, value];
    onFilterChange({ ...filters, occasion: newOccasions });
  }, [filters, onFilterChange]);

  const toggleScentAccord = useCallback((value: string) => {
    const newAccords = filters.scentAccord.includes(value)
      ? filters.scentAccord.filter(a => a !== value)
      : [...filters.scentAccord, value];
    onFilterChange({ ...filters, scentAccord: newAccords });
  }, [filters, onFilterChange]);

  const toggleYear = useCallback((value: string) => {
    const yearNum = parseInt(value, 10);
    const newYears = filters.year.includes(yearNum)
      ? filters.year.filter(y => y !== yearNum)
      : [...filters.year, yearNum];
    onFilterChange({ ...filters, year: newYears });
  }, [filters, onFilterChange]);

  // Check if a price range is selected
  const isPriceRangeSelected = useCallback((priceRange: PriceRangeOption) => {
    return filters.priceRange?.min === priceRange.minPrice && 
           filters.priceRange?.max === priceRange.maxPrice;
  }, [filters.priceRange]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white p-6 h-full">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-24" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-4 bg-gray-100 rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#B85A3A]" />
          <h3 className="font-semibold text-lg text-[#1A1A1A]">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-[#B85A3A] text-white text-xs font-medium px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-[#B85A3A] hover:text-[#A04D2F] flex items-center gap-1 transition-colors"
            aria-label="Clear all filters"
          >
            Clear All
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {brandName && (
        <div className="mb-6 pb-4 border-b border-[#E5E5E5]">
          <p className="text-sm text-[#404040]">Filtering</p>
          <p className="font-medium text-[#1A1A1A]">{brandName}</p>
        </div>
      )}

      {/* Gender / Category Filter */}
      <FilterSection title="Category" defaultOpen count={filters.gender.length}>
        {filterOptions?.genders && filterOptions.genders.length > 0 ? (
          filterOptions.genders.map(option => (
            <CheckboxItem
              key={option.value}
              label={option.label}
              checked={filters.gender.includes(option.value)}
              onChange={() => toggleGender(option.value)}
              count={option.count}
              disabled={option.count === 0}
            />
          ))
        ) : (
          <>
            <CheckboxItem label="Women's Perfume" checked={filters.gender.includes('women')} onChange={() => toggleGender('women')} />
            <CheckboxItem label="Men's Cologne" checked={filters.gender.includes('men')} onChange={() => toggleGender('men')} />
            <CheckboxItem label="Unisex" checked={filters.gender.includes('unisex')} onChange={() => toggleGender('unisex')} />
          </>
        )}
      </FilterSection>

      {/* Concentration Filter */}
      <FilterSection title="Concentration" defaultOpen={false} count={filters.concentration.length}>
        {filterOptions?.concentrations && filterOptions.concentrations.length > 0 ? (
          filterOptions.concentrations.map(option => (
            <CheckboxItem
              key={option.value}
              label={option.label}
              checked={filters.concentration.includes(option.value)}
              onChange={() => toggleConcentration(option.value)}
              count={option.count}
              disabled={option.count === 0}
            />
          ))
        ) : (
          <>
            <CheckboxItem label="Eau de Parfum (EDP)" checked={filters.concentration.includes('EDP')} onChange={() => toggleConcentration('EDP')} />
            <CheckboxItem label="Eau de Toilette (EDT)" checked={filters.concentration.includes('EDT')} onChange={() => toggleConcentration('EDT')} />
            <CheckboxItem label="Parfum" checked={filters.concentration.includes('Parfum')} onChange={() => toggleConcentration('Parfum')} />
            <CheckboxItem label="Eau de Cologne (EDC)" checked={filters.concentration.includes('EDC')} onChange={() => toggleConcentration('EDC')} />
            <CheckboxItem label="Extrait" checked={filters.concentration.includes('Extrait')} onChange={() => toggleConcentration('Extrait')} />
          </>
        )}
      </FilterSection>

      {/* Price Range Filter */}
      <FilterSection title="Price Range" defaultOpen={false} count={filters.priceRange ? 1 : 0}>
        {filterOptions?.priceRanges && filterOptions.priceRanges.length > 0 ? (
          filterOptions.priceRanges.map((priceRange, index) => (
            <CheckboxItem
              key={index}
              label={priceRange.label}
              checked={isPriceRangeSelected(priceRange)}
              onChange={() => togglePriceRange(priceRange)}
              count={priceRange.count}
              disabled={priceRange.count === 0}
            />
          ))
        ) : (
          <>
            <CheckboxItem label="Under ₹200" checked={filters.priceRange?.max === 200} onChange={() => togglePriceRange({ label: 'Under ₹200', maxPrice: 200, count: 0 })} />
            <CheckboxItem label="₹200 - ₹400" checked={filters.priceRange?.min === 200 && filters.priceRange?.max === 400} onChange={() => togglePriceRange({ label: '₹200 - ₹400', minPrice: 200, maxPrice: 400, count: 0 })} />
            <CheckboxItem label="₹400 - ₹700" checked={filters.priceRange?.min === 400 && filters.priceRange?.max === 700} onChange={() => togglePriceRange({ label: '₹400 - ₹700', minPrice: 400, maxPrice: 700, count: 0 })} />
            <CheckboxItem label="Above ₹700" checked={filters.priceRange?.min === 700} onChange={() => togglePriceRange({ label: 'Above ₹700', minPrice: 700, count: 0 })} />
          </>
        )}
      </FilterSection>

      {/* Season Filter */}
      <FilterSection title="Season" defaultOpen={false} count={filters.season.length}>
        {filterOptions?.seasons && filterOptions.seasons.length > 0 ? (
          filterOptions.seasons.map(option => (
            <CheckboxItem
              key={option.value}
              label={option.label}
              checked={filters.season.includes(option.value)}
              onChange={() => toggleSeason(option.value)}
              count={option.count}
              disabled={option.count === 0}
            />
          ))
        ) : (
          <>
            <CheckboxItem label="Spring" checked={filters.season.includes('spring')} onChange={() => toggleSeason('spring')} />
            <CheckboxItem label="Summer" checked={filters.season.includes('summer')} onChange={() => toggleSeason('summer')} />
            <CheckboxItem label="Fall" checked={filters.season.includes('fall')} onChange={() => toggleSeason('fall')} />
            <CheckboxItem label="Winter" checked={filters.season.includes('winter')} onChange={() => toggleSeason('winter')} />
            <CheckboxItem label="Monsoon" checked={filters.season.includes('monsoon')} onChange={() => toggleSeason('monsoon')} />
          </>
        )}
      </FilterSection>

      {/* Occasion / Recommended Uses Filter */}
      <FilterSection title="Recommended Uses" defaultOpen={false} count={filters.occasion.length}>
        {filterOptions?.occasions && filterOptions.occasions.length > 0 ? (
          filterOptions.occasions.map(option => (
            <CheckboxItem
              key={option.value}
              label={option.label}
              checked={filters.occasion.includes(option.value)}
              onChange={() => toggleOccasion(option.value)}
              count={option.count}
              disabled={option.count === 0}
            />
          ))
        ) : (
          <>
            <CheckboxItem label="Office" checked={filters.occasion.includes('office')} onChange={() => toggleOccasion('office')} />
            <CheckboxItem label="Daily" checked={filters.occasion.includes('daily')} onChange={() => toggleOccasion('daily')} />
            <CheckboxItem label="Date Night" checked={filters.occasion.includes('date_night')} onChange={() => toggleOccasion('date_night')} />
            <CheckboxItem label="Party" checked={filters.occasion.includes('party')} onChange={() => toggleOccasion('party')} />
            <CheckboxItem label="Wedding" checked={filters.occasion.includes('wedding')} onChange={() => toggleOccasion('wedding')} />
            <CheckboxItem label="Casual" checked={filters.occasion.includes('casual')} onChange={() => toggleOccasion('casual')} />
            <CheckboxItem label="Formal" checked={filters.occasion.includes('formal')} onChange={() => toggleOccasion('formal')} />
          </>
        )}
      </FilterSection>

      {/* Scent Accords Filter - Searchable */}
      {filterOptions?.scentAccords && filterOptions.scentAccords.length > 0 ? (
        <SearchableFilterSection
          title="Scent Accords"
          options={filterOptions.scentAccords}
          selectedValues={filters.scentAccord}
          onToggle={toggleScentAccord}
          placeholder="Search accords..."
          defaultOpen={false}
        />
      ) : (
        <FilterSection title="Scent Accords" defaultOpen={false} count={filters.scentAccord.length}>
          <CheckboxItem label="Fresh" checked={filters.scentAccord.includes('fresh')} onChange={() => toggleScentAccord('fresh')} />
          <CheckboxItem label="Floral" checked={filters.scentAccord.includes('floral')} onChange={() => toggleScentAccord('floral')} />
          <CheckboxItem label="Woody" checked={filters.scentAccord.includes('woody')} onChange={() => toggleScentAccord('woody')} />
          <CheckboxItem label="Oriental" checked={filters.scentAccord.includes('oriental')} onChange={() => toggleScentAccord('oriental')} />
          <CheckboxItem label="Citrus" checked={filters.scentAccord.includes('citrus')} onChange={() => toggleScentAccord('citrus')} />
          <CheckboxItem label="Spicy" checked={filters.scentAccord.includes('spicy')} onChange={() => toggleScentAccord('spicy')} />
          <CheckboxItem label="Fruity" checked={filters.scentAccord.includes('fruity')} onChange={() => toggleScentAccord('fruity')} />
          <CheckboxItem label="Aquatic" checked={filters.scentAccord.includes('aquatic')} onChange={() => toggleScentAccord('aquatic')} />
        </FilterSection>
      )}

      {/* Year Introduced Filter */}
      <FilterSection title="Year Introduced" defaultOpen={false} count={filters.year.length}>
        {filterOptions?.years && filterOptions.years.length > 0 ? (
          <div className="max-h-48 overflow-y-auto">
            {filterOptions.years.map(option => (
              <CheckboxItem
                key={option.value}
                label={option.label}
                checked={filters.year.includes(parseInt(option.value, 10))}
                onChange={() => toggleYear(option.value)}
                count={option.count}
                disabled={option.count === 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#404040] py-2">No year data available</p>
        )}
      </FilterSection>
    </div>
  );
}
