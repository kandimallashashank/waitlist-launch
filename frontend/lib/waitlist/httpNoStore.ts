/**
 * Opt out of Next.js fetch Data Cache (disk under ``.next/cache``) and long-lived HTTP caches.
 */

/** Pass to ``fetch`` so Next does not persist the response to the Data Cache. */
export const fetchNoStore = { cache: 'no-store' as const };

/** Response headers so browsers and shared CDNs avoid treating JSON as long-lived cache entries. */
export const responseNoStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
} as const;
