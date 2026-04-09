/**
 * When true, catalog reads use Supabase from Next.js (no FastAPI / NEXT_PUBLIC_API_URL).
 */

/**
 * Returns whether the waitlist app should serve catalog data without FastAPI.
 *
 * Returns:
 *   True when ``NEXT_PUBLIC_WAITLIST_ONLY`` is ``"true"`` or ``"1"``.
 */
export function isWaitlistOnlyCatalog(): boolean {
  const v = process.env.NEXT_PUBLIC_WAITLIST_ONLY?.trim().toLowerCase();
  return v === "true" || v === "1";
}
