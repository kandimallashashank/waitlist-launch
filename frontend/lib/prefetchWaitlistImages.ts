/**
 * Warms browser HTTP cache for proxied bottle URLs (plain + mat) used on the waitlist page.
 */

import { getProxiedImageUrl, isProductPerfumeUrl } from '@/lib/imageProxy';

/**
 * Prefetches unique image URLs: standard proxy and mat knockout for catalog shots.
 *
 * Args:
 *   imageUrls: Raw `primary_image_url` / `image_url` values from the catalog pool.
 */
export function prefetchWaitlistCatalogImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return;

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

    if (isProductPerfumeUrl(u)) {
      const mat = getProxiedImageUrl(u, { knockOutWhiteMat: true });
      if (mat && mat !== plain) {
        const imgMat = new Image();
        imgMat.decoding = 'async';
        imgMat.src = mat;
      }
    }
  }
}
