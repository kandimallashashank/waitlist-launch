/**
 * Shared API fetch utilities for timeout, retries, and consistent error handling.
 * Use for client-side fetch calls to avoid long skeleton states and improve perceived performance.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 400;

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Request timeout in ms. Default 8000. */
  timeoutMs?: number;
  /** Number of retries on network failure (not 4xx). Default 1. */
  retries?: number;
  /** Delay before first retry in ms. Default 400. */
  retryDelayMs?: number;
}

/**
 * Fetch with timeout and optional retries. Fails fast on timeout so UI can show retry.
 *
 * @param url - Request URL
 * @param options - Fetch options plus timeoutMs, retries, retryDelayMs
 * @returns Response if ok
 * @throws Error on network failure, timeout, or non-ok response (after retries)
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    signal: outerSignal,
    ...fetchOpts
  } = options;

  let lastError: Error | null = null;
  const maxAttempts = retries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    if (outerSignal) {
      outerSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        (err as Error & { status?: number }).status = res.status;
        throw err;
      }
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e instanceof Error ? e : new Error(String(e));
      const isAbort = (e as Error)?.name === 'AbortError';
      const isNetwork = (e as Error)?.message === 'Failed to fetch' || isAbort;
      if (!isNetwork || attempt === maxAttempts - 1) throw lastError;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  throw lastError ?? new Error('Request failed');
}
