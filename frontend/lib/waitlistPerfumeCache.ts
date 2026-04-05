/**
 * Session + module cache for waitlist catalog pool (avoids repeat API + flicker on revisit).
 */

import type { WaitlistCatalogEntry } from '@/types/waitlistCatalog';

const STORAGE_KEY = 'scentrev_waitlist_catalog_pool_v1';
/** How long cached JSON is considered fresh (browser + same tab navigation). */
export const WAITLIST_CATALOG_CACHE_TTL_MS = 60 * 60 * 1000;

interface StoredPayload {
  v: 1;
  poolSize: number;
  fetchedAt: number;
  perfumes: WaitlistCatalogEntry[];
}

let memoryCache: { poolSize: number; fetchedAt: number; perfumes: WaitlistCatalogEntry[] } | null =
  null;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < WAITLIST_CATALOG_CACHE_TTL_MS;
}

/**
 * Reads cached pool for the given pool size from memory or sessionStorage.
 *
 * Args:
 *   poolSize: Requested list length (cache key).
 *
 * Returns:
 *   Cached entries or null if missing/stale/wrong size.
 */
export function readWaitlistCatalogCache(poolSize: number): WaitlistCatalogEntry[] | null {
  if (
    memoryCache &&
    memoryCache.poolSize === poolSize &&
    isFresh(memoryCache.fetchedAt)
  ) {
    return memoryCache.perfumes;
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (
      parsed?.v !== 1 ||
      parsed.poolSize !== poolSize ||
      !Array.isArray(parsed.perfumes) ||
      !isFresh(parsed.fetchedAt)
    ) {
      return null;
    }
    memoryCache = {
      poolSize: parsed.poolSize,
      fetchedAt: parsed.fetchedAt,
      perfumes: parsed.perfumes,
    };
    return parsed.perfumes;
  } catch {
    return null;
  }
}

/**
 * Persists pool to memory and sessionStorage.
 *
 * Args:
 *   poolSize: Pool size used for the key.
 *   perfumes: Rows to store.
 */
export function writeWaitlistCatalogCache(
  poolSize: number,
  perfumes: WaitlistCatalogEntry[]
): void {
  const fetchedAt = Date.now();
  memoryCache = { poolSize, fetchedAt, perfumes };

  if (typeof window === 'undefined') return;

  try {
    const payload: StoredPayload = {
      v: 1,
      poolSize,
      fetchedAt,
      perfumes,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode: memory cache still helps this session.
  }
}
