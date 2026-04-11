/**
 * Short-lived server-side cache for catalog live-fields (prices, stock, etc.).
 *
 * Used only from ``fetchFragranceLiveFields`` on the server. Reduces duplicate
 * POSTs to the FastAPI ``/fragrances/live-fields`` endpoint within the TTL window
 * (e.g. repeated PLP renders). Each serverless instance keeps its own map.
 */

const TTL_MS = 60_000;

type CacheEntry = { expiresAt: number; rows: unknown[] };

const liveFieldsByKey = new Map<string, CacheEntry>();

/**
 * Builds a stable key for a set of fragrance IDs (order-independent).
 */
function keyForIds(ids: string[]): string {
  if (ids.length === 0) return '';
  return [...ids].sort().join('\u0000');
}

/**
 * Returns cached live-field rows for the given IDs, or null on miss/expiry.
 *
 * Args:
 *     ids: Chunk of fragrance UUIDs (same chunk as used for the API POST).
 *
 * Returns:
 *     Cached row array cast to ``T``, or ``null`` if not cached or expired.
 */
export async function getCachedLiveFields<T>(ids: string[]): Promise<T | null> {
  if (ids.length === 0) return null;
  const key = keyForIds(ids);
  const entry = liveFieldsByKey.get(key);
  const now = Date.now();
  if (!entry || entry.expiresAt <= now) {
    if (entry) liveFieldsByKey.delete(key);
    return null;
  }
  return entry.rows as T;
}

/**
 * Stores live-field rows for a chunk of IDs until TTL elapses.
 *
 * Args:
 *     ids: Same ID list used as the cache key (chunk from the fetcher).
 *     rows: Response body from ``/fragrances/live-fields``.
 */
export async function setCachedLiveFields(
  ids: string[],
  rows: unknown[],
): Promise<void> {
  if (ids.length === 0 || rows.length === 0) return;
  const key = keyForIds(ids);
  liveFieldsByKey.set(key, { expiresAt: Date.now() + TTL_MS, rows });
}
