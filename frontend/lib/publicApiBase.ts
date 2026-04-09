/**
 * Public (browser) base URL for the FastAPI backend.
 *
 * Production bundles must set NEXT_PUBLIC_API_URL at build time. Falling back
 * to localhost in production would bake `http://localhost:8000` into the
 * client, so real users hit their own machine long hangs, timeouts, and
 * misleading APM (e.g. Sentry showing localhost:8000).
 */

import { isWaitlistOnlyCatalog } from "@/lib/waitlist/waitlistOnlyCatalog";

/**
 * Returns the API origin without a trailing slash.
 *
 * Args:
 *   None (reads `process.env.NEXT_PUBLIC_API_URL` and `NODE_ENV`).
 *
 * Returns:
 *   Backend origin string, or `""` in production when env is missing (caller
 *   should use relative `/api/...` paths or handle failure).
 */
export function getPublicApiBaseUrl(): string {
  if (isWaitlistOnlyCatalog()) {
    return "";
  }
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  if (typeof window !== 'undefined') {
    console.warn(
      '[scentrev] NEXT_PUBLIC_API_URL is not set. Configure it in your deployment environment.',
    );
  }
  return '';
}
