/**
 * Warms browser cache for URLs the waitlist actually paints (catalog marquee = plain proxy).
 */

import { getProxiedImageUrl, isProductPerfumeUrl } from '@/lib/imageProxy';

export interface PrefetchWaitlistCatalogImagesOptions {
  /**
   * When true, also prefetch mat-knockout URLs (PDP / quiz cutouts). Off by default so the
   * home page does not double-fetch every bottle.
   */
  includeMatKnockout?: boolean;
}

/**
 * Prefetches unique proxied image URLs used by the waitlist catalog strip.
 *
 * Args:
 *   imageUrls: Raw `primary_image_url` / `image_url` values from the catalog pool.
 *   options: Set `includeMatKnockout` only when mat variants are shown on the same route.
 */
export function prefetchWaitlistCatalogImages(
  imageUrls: string[],
  options?: PrefetchWaitlistCatalogImagesOptions,
): void {
  if (typeof window === 'undefined') return;

  const includeMat = options?.includeMatKnockout === true;
  const seen = new Set<string>();
  for (const raw of imageUrls) {
    const u = raw?.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);

    const plain = getProxiedImageUrl(u);
    if (plain) {
      const img = new Image();
      img.decoding = 'async';
      img.src = plain;
    }

    if (includeMat && isProductPerfumeUrl(u)) {
      const mat = getProxiedImageUrl(u, { knockOutWhiteMat: true });
      if (mat && mat !== plain) {
        const imgMat = new Image();
        imgMat.decoding = 'async';
        imgMat.src = mat;
      }
    }
  }
}
