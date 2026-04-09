/**
 * Shared sort options and logic for fragrance listing pages.
 * Used by shop-all, womens-perfume, mens-cologne, new-arrivals, sale, collections.
 */

export type FragranceSortOption =
  | 'name-az'
  | 'name-za'
  | 'rating'
  | 'price-low'
  | 'price-high';

export const FRAGRANCE_SORT_OPTIONS: { value: FragranceSortOption; label: string }[] = [
  { value: 'name-az', label: 'Name: A–Z' },
  { value: 'name-za', label: 'Name: Z–A' },
  { value: 'rating', label: 'Rating' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

type ItemWithPriceAndRating = {
  id?: string;
  name: string;
  blind_buy_score?: number;
  review_count?: number;
  price_3ml?: number;
  price_8ml?: number;
  price_12ml?: number;
};

/**
 * Get price for an item based on selected size.
 */
function getPriceForSort(
  item: ItemWithPriceAndRating,
  selectedSize: '3ml' | '8ml' | '12ml'
): number {
  const p = item as Record<string, unknown>;
  const parse = (v: unknown) => (v != null ? Number(v) : 0);
  if (selectedSize === '3ml') return parse(p.price_3ml);
  if (selectedSize === '8ml') return parse(p.price_8ml ?? p.price_3ml);
  return parse(p.price_12ml ?? p.price_3ml);
}

/**
 * Sort an array of fragrance-like items by the given option.
 * Does not mutate the array; returns a new sorted array.
 */
export function sortFragrances<T extends ItemWithPriceAndRating>(
  list: T[],
  sortBy: FragranceSortOption,
  selectedSize: '3ml' | '8ml' | '12ml' = '8ml'
): T[] {
  const arr = [...list];
  switch (sortBy) {
    case 'name-az':
      return arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    case 'name-za':
      return arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' }));
    case 'rating':
      return arr.sort((a, b) => {
        const scoreA = a.blind_buy_score ?? 0;
        const scoreB = b.blind_buy_score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const revA = a.review_count ?? 0;
        const revB = b.review_count ?? 0;
        return revB - revA;
      });
    case 'price-low':
      return arr.sort((a, b) => getPriceForSort(a, selectedSize) - getPriceForSort(b, selectedSize));
    case 'price-high':
      return arr.sort((a, b) => getPriceForSort(b, selectedSize) - getPriceForSort(a, selectedSize));
    default:
      return arr;
  }
}
