/**
 * Shared waitlist catalog entries: one fetch/cache pool for hero, showcase, and marquees.
 */

export interface WaitlistCatalogEntry {
  id: string;
  name: string;
  brand: string;
  image: string;
  blind_buy_score?: number;
}

/** Subset of PerfumeCard fields used by waitlist ambient strips + catalog marquee. */
export interface WaitlistMarqueePick {
  id: string;
  name: string;
  brand_name: string;
  primary_image_url: string;
  blind_buy_score: number;
}

/**
 * Maps catalog entries to the shape expected by catalog card UIs.
 *
 * Args:
 *   entries: Rows from the shared waitlist pool.
 *
 * Returns:
 *   Picks safe to pass to marquee components.
 */
export function toWaitlistMarqueePicks(entries: WaitlistCatalogEntry[]): WaitlistMarqueePick[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    brand_name: e.brand,
    primary_image_url: e.image,
    blind_buy_score: e.blind_buy_score ?? 0,
  }));
}
