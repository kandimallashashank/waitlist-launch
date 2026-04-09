"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const filterSections = {
  category: {
    title: 'Category',
    options: [
      { id: 'womens-perfume', label: "Women's Perfume", count: 183 },
      { id: 'mens-cologne', label: "Men's Cologne", count: 173 },
      { id: 'unisex', label: 'Unisex', count: 113 }
    ]
  },
  concentration: {
    title: 'Concentration',
    options: [
      { id: 'EDC', label: 'Eau de Cologne (EDC)', count: 3 },
      { id: 'EDT', label: 'Eau de Toilette (EDT)', count: 36 },
      { id: 'EDP', label: 'Eau de Parfum (EDP)', count: 229 },
      { id: 'Parfum', label: 'Parfum', count: 28 }
    ]
  },
  recommended: {
    title: 'Recommended Uses',
    options: [
      { id: 'casual', label: 'Casual', count: 196 },
      { id: 'daytime', label: 'Daytime', count: 49 },
      { id: 'evening', label: 'Evening', count: 38 },
      { id: 'romantic', label: 'Romantic', count: 13 }
    ]
  },
  scent: {
    title: 'Scent Accords',
    options: [
      { id: 'animal', label: 'Animal', count: 4 },
      { id: 'aquatic', label: 'Aquatic', count: 24 },
      { id: 'chypre', label: 'Chypre', count: 7 },
      { id: 'citrus', label: 'Citrus', count: 64 },
      { id: 'creamy', label: 'Creamy', count: 74 },
      { id: 'floral', label: 'Floral', count: 194 }
    ]
  },
  season: {
    title: 'Season',
    options: [
      { id: 'fall', label: 'Fall', count: 174 },
      { id: 'spring', label: 'Spring', count: 212 },
      { id: 'summer', label: 'Summer', count: 135 },
      { id: 'winter', label: 'Winter', count: 118 }
    ]
  },
  price: {
    title: 'Price',
    options: [
      { id: 'under-100', label: '₹0.99', count: null },
      { id: '100-199', label: '₹1.00 - ₹1.99', count: null },
      { id: '200-699', label: '₹2.00 - ₹6.99', count: null },
      { id: '700-1499', label: '₹7.00 - ₹14.99', count: null },
      { id: '1500+', label: '₹15.00 and up', count: null }
    ]
  },
  year: {
    title: 'Year Introduced',
    options: [
      { id: '2025', label: '2025', count: 9 },
      { id: '2024', label: '2024', count: 21 },
      { id: '2023', label: '2023', count: 19 },
      { id: '2022', label: '2022', count: 22 },
      { id: '2021', label: '2021', count: 22 },
      { id: '2020', label: '2020', count: 9 }
    ]
  }
};

const brands = [
  { id: 'acqua-di-parma', label: 'Acqua Di Parma', count: 1 },
  { id: 'afnan', label: 'Afnan', count: 4 },
  { id: 'al-haramain', label: 'Al Haramain Perfumes', count: 1 },
  { id: 'ariana-grande', label: 'Ariana Grande', count: 4 },
  { id: 'atelier', label: 'Atelier Des Ors', count: 1 },
  { id: 'bdk', label: 'BDK Parfums', count: 1 },
  { id: 'better-world', label: 'Better World Fragrance House', count: 1 },
  { id: 'bharoro', label: 'Bharoro', count: 1 },
  { id: 'bond-9', label: 'Bond No. 9', count: 12 },
  { id: 'burberry', label: 'Burberry', count: 6 }
];

interface SidebarFiltersProps {
  onFilterChange: (section: string, optionId: string) => void;
  selectedFilters?: Record<string, string[]>;
}

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, isExpanded, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-[#E5E5E5] pb-4 mb-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left font-semibold text-base text-[#1A1A1A] mb-3 hover:text-[#D4A574] transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterOptionProps {
  option: { id: string; label: string; count?: number | null };
  isSelected: boolean;
  onToggle: () => void;
}

function FilterOption({ option, isSelected, onToggle }: FilterOptionProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1.5 hover:text-[#D4A574] transition-colors">
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={onToggle}
          className="h-4.5 w-4.5 rounded border border-[#D5D5D5] bg-white accent-[#B85A3A] text-[#B85A3A]"
        />
        <span className="text-base text-[#1A1A1A] group-hover:text-[#D4A574] transition-colors">
          {option.label}
        </span>
      </div>
      {option.count !== null && option.count !== undefined && (
        <span className="text-sm text-[#404040]">{option.count}</span>
      )}
    </label>
  );
}

export default function SidebarFilters({ onFilterChange, selectedFilters = {} }: SidebarFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    concentration: false,
    recommended: false,
    scent: false,
    season: false,
    price: false,
    year: false
  });
  
  const [brandSearch, setBrandSearch] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const handleFilterToggle = (section: string, optionId: string) => {
    onFilterChange(section, optionId);
  };

  const filteredBrands = brands.filter(brand =>
    brand.label.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="w-full lg:w-64 bg-white border-r border-[#E5E5E5] h-full overflow-y-auto">
      <div className="p-6">
        {/* Category Section */}
        <FilterSection
          title="Category"
          isExpanded={expandedSections.category}
          onToggle={() => toggleSection('category')}
        >
          {filterSections.category.options.map(option => (
            <FilterOption
              key={option.id}
              option={option}
              isSelected={selectedFilters?.category?.includes?.(option.id) || false}
              onToggle={() => handleFilterToggle('category', option.id)}
            />
          ))}
        </FilterSection>

        {/* Brand Section with Search */}
        <FilterSection
          title="Brand / Designer"
          isExpanded={expandedSections.brand}
          onToggle={() => toggleSection('brand')}
        >
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#404040]" />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search Brand / Designer"
                className="w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-lg text-base focus:outline-none focus:border-[#D4A574]"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredBrands.map(option => (
              <FilterOption
                key={option.id}
                option={option}
                isSelected={selectedFilters?.brand?.includes?.(option.id) || false}
                onToggle={() => handleFilterToggle('brand', option.id)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Other Sections */}
        {Object.entries(filterSections).map(([key, section]) => {
          if (key === 'category') return null; // Already rendered
          
          return (
            <FilterSection
              key={key}
              title={section.title}
              isExpanded={expandedSections[key as keyof typeof expandedSections]}
              onToggle={() => toggleSection(key)}
            >
              {section.options.map(option => (
                <FilterOption
                  key={option.id}
                  option={option}
                  isSelected={selectedFilters?.[key]?.includes?.(option.id) || false}
                  onToggle={() => handleFilterToggle(key, option.id)}
                />
              ))}
            </FilterSection>
          );
        })}
      </div>
    </div>
  );
}
