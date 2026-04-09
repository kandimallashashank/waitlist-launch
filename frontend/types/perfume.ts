/**
 * Comprehensive Perfume Schema
 * Designed for data warehouse compatibility with granular attributes
 * 
 * This schema supports:
 * - Full product catalog management
 * - Analytics and reporting
 * - Recommendation engines
 * - Inventory management
 * - Customer behavior tracking
 * 
 * @module types/perfume
 * @description Extended type definitions for the ScentRev perfume catalog.
 * These types extend the base types in `api/base44Client.ts` with additional
 * fields for analytics, performance metrics, and warehouse compatibility.
 * 
 * @example
 * // Import specific types
 * import type { Perfume, PerfumeCard, ActiveFilters } from '@/types/perfume';
 * 
 * // Use in component
 * const [filters, setFilters] = useState<ActiveFilters>({...});
 */

// ==================== Enums ====================

/**
 * Gender classification for fragrances
 * @description Matches backend Gender enum in models.py
 */
export type Gender = 'men' | 'women' | 'unisex';

/**
 * Fragrance concentration levels
 * @description Higher concentration = longer lasting, stronger projection
 */
export type Concentration = 
  | 'EDT'      // Eau de Toilette (5-15% concentration)
  | 'EDP'      // Eau de Parfum (15-20% concentration)
  | 'Parfum'   // Pure Parfum (20-30% concentration)
  | 'EDC'      // Eau de Cologne (2-5% concentration)
  | 'Extrait'; // Extrait de Parfum (20-40% concentration)

/**
 * Seasonal suitability for fragrances
 * @description Includes 'monsoon' for Indian market specificity
 */
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'monsoon';

/**
 * Occasion categories for fragrance recommendations
 */
export type Occasion = 
  | 'office' 
  | 'daily' 
  | 'date' 
  | 'party' 
  | 'wedding' 
  | 'formal' 
  | 'casual' 
  | 'evening'
  | 'sport';

/**
 * Scent family classifications
 * @description Used for filtering and recommendation algorithms
 */
export type ScentFamily = 
  | 'Fresh & Clean'
  | 'Woody & Spicy'
  | 'Floral & Elegant'
  | 'Sweet & Gourmand'
  | 'Smoky & Dark'
  | 'Citrus & Aquatic'
  | 'Oriental & Amber'
  | 'Leather & Tobacco'
  | 'Green & Herbal'
  | 'Powdery & Soft';

/**
 * Product category classifications
 */
export type Category = 
  | 'best_seller' 
  | 'new_arrival' 
  | 'sale' 
  | 'exclusive' 
  | 'limited_edition'
  | 'trending';

/**
 * Available vial sizes for sample purchases
 * @description Core business model - sample sizes before full bottle commitment
 */
export type VialSize = '3ml' | '8ml' | '12ml';

/**
 * Review moderation status
 * @description Matches backend ReviewStatus enum
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// ==================== Core Interfaces ====================

/**
 * Fragrance Notes - Top, Middle, Base pyramid
 * @description The three-tier structure of fragrance composition
 * 
 * Note: This uses string arrays for individual notes.
 * The base44Client.ts uses comma-separated strings for compatibility
 * with the current backend. Use `parseNotes()` utility to convert.
 */
export interface FragranceNotes {
  /** Opening notes (first 15-30 minutes) */
  top: string[];
  /** Heart notes (30 min - 2 hours) */
  middle: string[];
  /** Base notes (2+ hours) */
  base: string[];
}

/**
 * Convert comma-separated notes string to array
 * @param notes - Comma-separated string of notes
 * @returns Array of individual note strings
 */
export function parseNotes(notes: string | undefined): string[] {
  if (!notes) return [];
  return notes.split(',').map(n => n.trim()).filter(Boolean);
}

/**
 * Convert notes array to comma-separated string
 * @param notes - Array of note strings
 * @returns Comma-separated string
 */
export function stringifyNotes(notes: string[]): string {
  return notes.join(', ');
}

/**
 * Pricing structure for different vial sizes
 */
export interface PricingTier {
  size: VialSize;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  in_stock: boolean;
  stock_quantity?: number;
}

/**
 * Performance metrics for the fragrance
 */
export interface PerformanceMetrics {
  longevity_hours: number;        // Average wear time in hours
  sillage: 'intimate' | 'moderate' | 'strong' | 'beast';
  projection: 'close' | 'moderate' | 'far' | 'massive';
  versatility_score: number;      // 1-10 scale
  value_score: number;            // 1-10 scale
  compliment_factor: number;      // 1-10 scale
}

/**
 * Weather and climate suitability
 */
export interface WeatherSuitability {
  min_temp_celsius: number;
  max_temp_celsius: number;
  humidity_tolerance: 'low' | 'medium' | 'high';
  indian_summer_tested: boolean;
  ac_performance: 'poor' | 'good' | 'excellent';
}

/**
 * Brand information
 */
export interface Brand {
  id: string;
  name: string;
  country: string;
  founded_year?: number;
  logo_url?: string;
  description?: string;
  tier: 'designer' | 'niche' | 'luxury' | 'indie' | 'celebrity';
}

/**
 * Perfumer/Nose information
 */
export interface Perfumer {
  id: string;
  name: string;
  notable_creations?: string[];
  house_affiliation?: string;
}

/**
 * Product images
 */
export interface ProductImage {
  id: string;
  url: string;
  alt_text: string;
  type: 'primary' | 'bottle' | 'box' | 'lifestyle' | 'detail';
  sort_order: number;
}

/**
 * User review
 */
export interface PerfumeReview {
  id: string;
  perfume_id: string;
  user_id: string;
  user_name: string;
  user_city?: string;
  rating: number;                 // 1-5 stars
  title?: string;
  comment: string;
  longevity_rating?: number;      // 1-5
  sillage_rating?: number;        // 1-5
  value_rating?: number;          // 1-5
  verified_purchase: boolean;
  helpful_count: number;
  reported_count: number;
  status: ReviewStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Review summary statistics
 */
export interface ReviewSummary {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
    one_star: number;
  };
  average_longevity: number;
  average_sillage: number;
  average_value: number;
}

// ==================== Main Perfume Schema ====================

/**
 * Complete Perfume Entity
 * This is the master schema for all perfume data
 */
export interface Perfume {
  // === Identification ===
  id: string;
  sku: string;                    // Stock Keeping Unit
  slug: string;                   // URL-friendly identifier
  barcode?: string;               // EAN/UPC code
  
  // === Basic Information ===
  name: string;
  brand_id: string;
  brand: Brand;
  gender: Gender;
  concentration: Concentration;
  year_released?: number;
  perfumer_id?: string;
  perfumer?: Perfumer;
  
  // === Description ===
  tagline?: string;               // Short marketing tagline
  description: string;            // Full product description
  story?: string;                 // Brand story/inspiration
  
  // === Fragrance Profile ===
  notes: FragranceNotes;
  scent_family: ScentFamily;
  accords: string[];              // Main scent accords (e.g., "woody", "fresh")
  
  // === Categorization ===
  category: Category;
  categories: Category[];         // Can belong to multiple categories
  tags: string[];                 // Searchable tags
  
  // === Seasonality & Occasion ===
  seasons: Season[];
  occasions: Occasion[];
  best_time_of_day: ('morning' | 'afternoon' | 'evening' | 'night')[];
  
  // === Pricing ===
  pricing: PricingTier[];
  currency: 'INR';
  
  // === Performance ===
  performance: PerformanceMetrics;
  weather_suitability: WeatherSuitability;
  
  // === Ratings & Scores ===
  blind_buy_score: number;        // 1-5 scale, our proprietary score
  review_summary: ReviewSummary;
  trending_score?: number;        // Algorithm-based trending score
  
  // === Media ===
  images: ProductImage[];
  video_url?: string;
  
  // === Inventory ===
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  launch_date?: string;
  
  // === Analytics Metadata ===
  view_count: number;
  cart_add_count: number;
  purchase_count: number;
  wishlist_count: number;
  
  // === Regional Data (India-specific) ===
  trending_cities: string[];
  popular_age_groups: string[];
  reorder_rate: number;           // Percentage of repeat purchases
  
  // === Timestamps ===
  created_at: string;
  updated_at: string;
  
  // === Related Products ===
  similar_perfume_ids: string[];
  layering_suggestions: string[];
  frequently_bought_together: string[];
}

// ==================== Simplified Views ====================

/**
 * Perfume Card - Minimal data for list/grid views
 */
export interface PerfumeCard {
  id: string;
  name: string;
  brand_name: string;
  gender: Gender;
  concentration: Concentration;
  scent_family: ScentFamily;
  primary_image_url: string;
  price_3ml: number;
  price_8ml?: number;
  price_12ml?: number;
  original_price_3ml?: number;
  original_price_8ml?: number;
  original_price_12ml?: number;
  blind_buy_score: number;
  average_rating: number;
  review_count: number;
  category: Category;
  /** True when marked best seller in admin; may coexist with category e.g. ``trending``. */
  is_best_seller?: boolean;
  is_new: boolean;
  is_on_sale: boolean;
  /** False when marked out of stock in admin; omit/undefined treated as in stock. */
  in_stock?: boolean;
  /** From ``v_perfumes_card.catalog_updated_at`` bumps image cache when the row changes. */
  catalog_updated_at?: string;
  seasons: Season[];
  occasions: Occasion[];
}

/**
 * Perfume Detail - Full data for product page
 */
export interface PerfumeDetail extends Perfume {
  reviews: PerfumeReview[];
  similar_perfumes: PerfumeCard[];
  layering_perfumes: PerfumeCard[];
}

// ==================== Filter Types ====================

/**
 * Filter options with counts
 */
export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterOptions {
  genders: FilterOption[];
  brands: FilterOption[];
  concentrations: FilterOption[];
  scent_families: FilterOption[];
  seasons: FilterOption[];
  occasions: FilterOption[];
  price_ranges: FilterOption[];
  categories: FilterOption[];
}

/**
 * Active filters state
 */
export interface ActiveFilters {
  gender: Gender[];
  brand: string[];
  concentration: Concentration[];
  scent_family: ScentFamily[];
  season: Season[];
  occasion: Occasion[];
  price_range: string[];
  category: Category[];
  search: string;
  sort_by: 'popularity' | 'price_low' | 'price_high' | 'rating' | 'newest';
}

// ==================== Cart Types ====================

/**
 * Cart item for the extended schema
 * 
 * @description This extends the base Cart type from base44Client.ts
 * with perfume-specific fields. For API operations, use the Cart type
 * from base44Client.ts instead.
 * 
 * @see {@link import('@/api/base44Client').Cart} for API-compatible type
 */
export interface CartItem {
  id: string;
  perfume_id: string;
  perfume_name: string;
  brand_name: string;
  size: VialSize;
  price: number;
  quantity: number;
  image_url: string;
  added_at: string;
}

// ==================== Kit Types ====================

/**
 * Fragrance included in a discovery kit
 * @description Simplified fragrance data for kit display
 */
export interface KitFragrance {
  perfume_id: string;
  name: string;
  brand: string;
  notes: FragranceNotes;
  blind_buy_score: number;
  best_for: string;
}

/**
 * Discovery Kit - Curated fragrance sample collection
 * 
 * @description Extended kit type with full details.
 * For API operations, use DiscoveryKit from base44Client.ts
 * 
 * @see {@link import('@/api/base44Client').DiscoveryKit} for API-compatible type
 */
export interface DiscoveryKit {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  original_price?: number;
  vial_count: number;
  vial_size_ml: number;
  gender: Gender;
  seasons: Season[];
  occasions: Occasion[];
  scent_family: ScentFamily;
  fragrances: KitFragrance[];
  why_this_kit: string;
  blind_buy_score: number;
  trending_city?: string;
  trending_age_group?: string;
  reorder_rate: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== Utility Types ====================

/**
 * Sort option for product listings
 */
export interface SortOption {
  value: string;
  label: string;
}

/**
 * Price range filter option
 */
export interface PriceRange {
  value: string;
  label: string;
  min: number;
  max: number;
}

// ==================== Constants ====================
// Note: These are runtime constants, exported separately from types

/**
 * Available sort options for product listings
 */
export const SORT_OPTIONS: readonly SortOption[] = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
] as const;

/**
 * Price range filter options (INR)
 * @description Tailored for Indian market pricing
 */
export const PRICE_RANGES: readonly PriceRange[] = [
  { value: 'under_200', label: 'Under ₹200', min: 0, max: 199 },
  { value: '200_400', label: '₹200 - ₹400', min: 200, max: 400 },
  { value: '400_700', label: '₹400 - ₹700', min: 400, max: 700 },
  { value: 'above_700', label: 'Above ₹700', min: 700, max: Infinity },
] as const;

/**
 * All available scent families
 */
export const SCENT_FAMILIES: readonly ScentFamily[] = [
  'Fresh & Clean',
  'Woody & Spicy',
  'Floral & Elegant',
  'Sweet & Gourmand',
  'Smoky & Dark',
  'Citrus & Aquatic',
  'Oriental & Amber',
  'Leather & Tobacco',
  'Green & Herbal',
  'Powdery & Soft',
] as const;

/**
 * All available seasons
 */
export const SEASONS: readonly Season[] = [
  'spring',
  'summer',
  'fall',
  'winter',
  'monsoon',
] as const;

/**
 * All available occasions
 */
export const OCCASIONS: readonly Occasion[] = [
  'office',
  'daily',
  'date',
  'party',
  'wedding',
  'formal',
  'casual',
  'evening',
  'sport',
] as const;

/**
 * All available concentrations
 */
export const CONCENTRATIONS: readonly Concentration[] = [
  'EDT',
  'EDP',
  'Parfum',
  'EDC',
  'Extrait',
] as const;
