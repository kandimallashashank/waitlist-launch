/**
 * Waitlist preview has no Supabase Auth session. Storefront implements real token retrieval.
 */

/**
 * Returns null on the pilot site; layering history / save use preview JWT or stay empty.
 */
export async function getAccessToken(): Promise<string | null> {
  return null;
}
