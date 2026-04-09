/**
 * Maps URL segments mistaken for fragrance IDs to real App Router paths.
 *
 * ``/fragrances/[slug]`` historically redirected every slug to ``/product/[slug]``;
 * slugs like ``layering-lab`` are shop sections, not product UUIDs.
 */

/** Standard fragrance id: UUID v4-style (matches backend ``UUID_RE``). */
export const FRAGRANCE_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Args:
 *   id: Raw segment from ``/product/[id]`` or ``/fragrances/[id]`` (may include slug prefix).
 *
 * Returns:
 *   true if ``id`` is exactly a UUID or ends with ``-uuid`` (slug-style PDP URLs).
 */
export function segmentContainsFragranceUuid(id: string): boolean {
  const t = id.trim();
  if (!t) return false;
  if (FRAGRANCE_ID_UUID_RE.test(t)) return true;
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

/**
 * Args:
 *   id: Canonical product id after extracting trailing UUID from slug-url, or raw segment.
 *
 * Returns:
 *   true when ``id`` is safe to send to ``GET /fragrances/{id}`` and recent-views APIs.
 */
export function isCanonicalFragranceProductId(id: string): boolean {
  return FRAGRANCE_ID_UUID_RE.test(id.trim());
}

/**
 * Lowercase slug -> absolute path (leading slash) for public shop pages.
 * Keep in sync with top-level App Router pages (e.g. app/gift-finder/page.tsx).
 */
export const FRAGRANCE_SLUG_TO_APP_PATH: Readonly<Record<string, `/${string}`>> = {
  'layering-lab': '/layering-lab',
  'gift-finder': '/gift-finder',
  'discovery-sets': '/discovery-sets',
  'shop-all': '/shop-all',
  sale: '/sale',
  cart: '/cart',
  wishlist: '/wishlist',
  subscription: '/subscription',
  quiz: '/quiz',
  'mens-cologne': '/mens-cologne',
  'womens-perfume': '/womens-perfume',
  'mens-best-sellers': '/mens-best-sellers',
  'womens-best-sellers': '/womens-best-sellers',
  'new-arrivals': '/new-arrivals',
  'new-arrivals-men': '/new-arrivals-men',
  'new-arrivals-women': '/new-arrivals-women',
  'for-you': '/for-you',
  'recommended-for-you': '/recommended-for-you',
  profile: '/profile',
  compare: '/compare',
  education: '/education',
  forum: '/forum',
  checkout: '/checkout',
  collections: '/collections',
  about: '/about',
  faq: '/faq',
  returns: '/returns',
  shipping: '/shipping',
  terms: '/terms',
  privacy: '/privacy',
};
