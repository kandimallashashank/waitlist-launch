/**
 * Canonical public origin for Open Graph, Twitter cards, and other absolute URLs.
 * ``next-sitemap.config.js`` uses a fixed production ``siteUrl``; runtime metadata still uses env + this helper.
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
  // 1. Explicit override (e.g. configured in Vercel dashboard)
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  // 2. Production fallback: always use the custom domain to avoid Vercel login walls
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://scentrev.com";
  }

  // 3. Vercel deployment URL (e.g. for preview branches)
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  // 4. Fallback to storage or default
  const store = process.env.NEXT_PUBLIC_STORE_URL?.trim();
  if (store) return trimTrailingSlash(store);
  return "https://scentrev.com";
}
