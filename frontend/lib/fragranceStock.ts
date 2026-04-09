/**
 * Catalog stock helpers `in_stock` is set in admin (perfumes table).
 * Missing field defaults to in-stock for older API responses.
 */

/**
 * Returns whether a fragrance row can be added to cart.
 *
 * Args:
 *   frag: Object that may include `in_stock` from the API.
 *
 * Returns:
 *   False when `in_stock` is explicitly false; otherwise true.
 */
export function isFragranceInStock(frag: { in_stock?: boolean } | null | undefined): boolean {
  if (!frag) return false;
  return frag.in_stock !== false;
}
