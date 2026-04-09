/**
 * Persisted product-listing layout preference (grid vs single column) across catalog pages.
 */

export const PLP_LISTING_VIEW_STORAGE_KEY = 'scentrev:plp-listing-view:v1';

export type PlpListingViewMode = 'grid' | 'single';

/**
 * Parses stored listing view; unknown values fall back to grid.
 *
 * Args:
 *     raw: Value from ``localStorage`` (or null).
 *
 * Returns:
 *     Either ``grid`` or ``single``.
 */
export function parsePlpListingViewMode(raw: string | null): PlpListingViewMode {
  return raw === 'single' ? 'single' : 'grid';
}
