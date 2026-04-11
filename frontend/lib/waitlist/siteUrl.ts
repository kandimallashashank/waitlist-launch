/**
 * Canonical public origin for Open Graph, Twitter cards, and other absolute URLs.
 * Logic mirrors ``next-sitemap.config.js`` ``getSiteUrl()`` — update both if rules change.
 */

/**
 * Removes a single trailing slash from a URL string.
 *
 * @param url - Origin or path URL
 * @returns URL without trailing slash
 */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Resolves the waitlist app's public base URL from environment variables.
 *
 * @returns HTTPS origin (no trailing slash)
 */
export function getWaitlistSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  const store = process.env.NEXT_PUBLIC_STORE_URL?.trim();
  if (store) return trimTrailingSlash(store);
  return "https://scentrev.com";
}
