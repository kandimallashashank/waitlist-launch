/**
 * URL helpers for product links on the waitlist site.
 */

/**
 * Map logical page names to paths (subset of storefront; pilot routes only).
 */
export function createPageUrl(pageName: string): string {
  const routes: Record<string, string> = {
    Home: "/",
    BestSellers: "/catalog?category=best_seller",
    ScentFinder: "/quiz",
    Cart: "/",
    Checkout: "/",
    Kits: "/",
  };
  return routes[pageName] || "/";
}

/**
 * Build a product path for the waitlist catalog PDP.
 *
 * Args:
 *   id: Fragrance UUID.
 *   _slug: Reserved for parity with main app (optional).
 *
 * Returns:
 *   Path under /product/[id].
 */
export function createProductUrl(id: string, slug?: string): string {
  const trimmed = id.trim();
  if (slug) {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `/product/${cleanSlug}-${trimmed}`;
  }
  return `/product/${encodeURIComponent(trimmed)}`;
}
