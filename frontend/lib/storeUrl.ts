/**
 * Build absolute URLs to the main ScentRev storefront for outbound links from the
 * standalone launch app (quiz, collections, etc.).
 */

const DEFAULT_STORE = "https://scentrev.com";

/**
 * Prefix a path with the configured store origin.
 *
 * Args:
 *   path: Absolute path on the store (e.g. `/quiz`).
 *
 * Returns:
 *   Full URL using ``NEXT_PUBLIC_STORE_URL`` or the default ScentRev origin.
 */
export function storeUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_STORE_URL || DEFAULT_STORE).replace(
    /\/$/,
    "",
  );
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
