/**
 * Listing / card pricing helpers.
 *
 * Product detail pages pick a decant size; grids should show the lowest tier price
 * as "From ₹…" so the amount matches what customers see after choosing ml on PDP.
 * API fields remain ``price_3ml`` / ``price_8ml`` / ``price_12ml``; UI copy shows 10ml for the largest tier.
 */

export interface ListingPriceFragrance {
  price_3ml?: unknown;
  price_8ml?: unknown;
  price_12ml?: unknown;
  original_price_3ml?: unknown;
  original_price_8ml?: unknown;
  original_price_12ml?: unknown;
}

/**
 * Returns the lowest current price in INR across 3ml / 8ml / ``price_12ml`` (shown as 10ml in UI).
 *
 * Missing 8ml or largest-tier prices fall back to 3ml for that tier (same as PDP).
 *
 * Args:
 *     f: Raw fragrance row or API object with snake_case price fields.
 *
 * Returns:
 *     Rounded INR amount, or 0 if no valid price.
 */
export function getListingFromPriceInr(f: ListingPriceFragrance): number {
  const p3 = Math.round(Number(f.price_3ml));
  const p8 =
    f.price_8ml != null && Number(f.price_8ml) > 0 ? Math.round(Number(f.price_8ml)) : p3;
  const p12 =
    f.price_12ml != null && Number(f.price_12ml) > 0 ? Math.round(Number(f.price_12ml)) : p3;
  const candidates = [p3, p8, p12].filter((n) => Number.isFinite(n) && n > 0);
  return candidates.length ? Math.min(...candidates) : 0;
}

/**
 * Original (strikethrough) price for the tier that has the lowest current price.
 *
 * Args:
 *     f: Fragrance with optional original_* per size.
 *
 * Returns:
 *     Rounded INR, or undefined if not on sale for that tier.
 */
export function getListingFromOriginalPriceInr(f: ListingPriceFragrance): number | undefined {
  const p3 = Math.round(Number(f.price_3ml));
  const p8 =
    f.price_8ml != null && Number(f.price_8ml) > 0 ? Math.round(Number(f.price_8ml)) : p3;
  const p12 =
    f.price_12ml != null && Number(f.price_12ml) > 0 ? Math.round(Number(f.price_12ml)) : p3;
  const o3 =
    f.original_price_3ml != null && Number(f.original_price_3ml) > 0
      ? Math.round(Number(f.original_price_3ml))
      : undefined;
  const o8 =
    f.original_price_8ml != null && Number(f.original_price_8ml) > 0
      ? Math.round(Number(f.original_price_8ml))
      : o3;
  const o12 =
    f.original_price_12ml != null && Number(f.original_price_12ml) > 0
      ? Math.round(Number(f.original_price_12ml))
      : o3;

  const tiers = [
    { cur: p3, orig: o3 },
    { cur: p8, orig: o8 },
    { cur: p12, orig: o12 },
  ].filter((t) => Number.isFinite(t.cur) && t.cur > 0);
  if (!tiers.length) return undefined;

  const minCur = Math.min(...tiers.map((t) => t.cur));
  const tier = tiers.find((t) => t.cur === minCur) ?? tiers[0];
  const orig = tier.orig;
  if (orig == null || !Number.isFinite(orig) || orig <= minCur) return undefined;
  return orig;
}

/** Decant sizes used on PLP / PDP size toggles (largest maps to ``price_12ml`` in API). */
export type ListedDecantSize = '3ml' | '8ml' | '12ml';

/**
 * User-facing label for catalog size pills (largest tier displayed as 10ml).
 *
 * Args:
 *     size: Internal listed size key.
 *
 * Returns:
 *     String shown on PLP / PDP toggles.
 */
export function listedDecantSizeDisplayLabel(size: ListedDecantSize): string {
  return size === '12ml' ? '10ml' : size;
}

/**
 * Map internal/API decant id to the label shown in cart lines and summaries.
 *
 * Args:
 *     sizeId: ``selectedSize`` / cart size string.
 *
 * Returns:
 *     User-facing ml label.
 */
export function uiListedDecantLabel(sizeId: string): string {
  if (sizeId === '12ml') return '10ml';
  return sizeId;
}

/**
 * Whether the product has an active list price for the given decant size (no cross-tier fallback).
 *
 * Args:
 *     f: Fragrance row with price_* fields.
 *     size: Selected 3ml / 8ml / 12ml (12ml = API ``price_12ml``, shown as 10ml).
 *
 * Returns:
 *     True if that tier has a positive numeric price.
 */
export function hasListedSizePrice(f: ListingPriceFragrance, size: ListedDecantSize): boolean {
  return getPriceForListedSizeInr(f, size) > 0;
}

/**
 * Rounded INR price for a single decant size (0 if that tier is not sold).
 *
 * Args:
 *     f: Fragrance row with price_* fields.
 *     size: Selected size.
 *
 * Returns:
 *     Rounded INR, or 0 if missing.
 */
export function getPriceForListedSizeInr(
  f: ListingPriceFragrance,
  size: ListedDecantSize
): number {
  const n = (v: unknown): number => {
    if (v == null || v === '') return 0;
    const x = Math.round(Number(v));
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  if (size === '3ml') return n(f.price_3ml);
  if (size === '8ml') {
    if (f.price_8ml != null && Number(f.price_8ml) > 0) return n(f.price_8ml);
    return 0;
  }
  if (f.price_12ml != null && Number(f.price_12ml) > 0) return n(f.price_12ml);
  return 0;
}

/**
 * Strikethrough MSRP for the selected size, if on sale for that tier.
 *
 * Args:
 *     f: Fragrance with original_price_* optional fields.
 *     size: Selected decant size.
 *
 * Returns:
 *     Rounded INR original price, or undefined if not on sale.
 */
export function getOriginalPriceForListedSizeInr(
  f: ListingPriceFragrance,
  size: ListedDecantSize
): number | undefined {
  const cur = getPriceForListedSizeInr(f, size);
  if (cur <= 0) return undefined;
  let origRaw: unknown;
  if (size === '3ml') {
    origRaw = f.original_price_3ml;
  } else if (size === '8ml') {
    origRaw =
      f.original_price_8ml != null && Number(f.original_price_8ml) > 0
        ? f.original_price_8ml
        : f.original_price_3ml;
  } else {
    origRaw =
      f.original_price_12ml != null && Number(f.original_price_12ml) > 0
        ? f.original_price_12ml
        : f.original_price_3ml;
  }
  const o =
    origRaw != null && Number(origRaw) > 0 ? Math.round(Number(origRaw)) : undefined;
  if (o == null || !Number.isFinite(o) || o <= cur) return undefined;
  return o;
}
