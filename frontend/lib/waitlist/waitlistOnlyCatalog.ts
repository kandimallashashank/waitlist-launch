/**
 * Waitlist app always reads from Supabase via Next.js API routes - no FastAPI.
 */
export function isWaitlistOnlyCatalog(): boolean {
  return true;
}
