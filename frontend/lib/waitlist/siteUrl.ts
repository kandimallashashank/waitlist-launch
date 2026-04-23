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

export function getWaitlistSiteUrl(): string {
  // 1. Explicit override (e.g. configured in Vercel dashboard)
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  // 2. Vercel deployment URL (e.g. for preview branches)
  // This must come BEFORE the production fallback to ensure preview links
  // resolve their own absolute assets (OG images, etc.) correctly.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  // 3. Production fallback: use the custom domain
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return "https://scentrev.com";
  }

  // 4. Fallback to storage or default
  const store = process.env.NEXT_PUBLIC_STORE_URL?.trim();
  if (store) return trimTrailingSlash(store);
  return "https://scentrev.com";
}
