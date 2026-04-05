/**
 * Server-only: turn flat light-grey / white product-photo mats into transparency.
 *
 * Heuristic: pixels that are bright and low-chroma (near-neutral) become fully
 * transparent. Colored bottle glass, labels, and caps are preserved.
 */

import sharp from 'sharp';

/**
 * Max dimension after resize. Quiz loader shows ~300px-wide bottles; 480px is
 * enough for 2x DPR and cuts pixel work vs 960 (~4× fewer pixels to scan).
 */
const MAX_EDGE = 480;

/** Minimum R/G/B for a channel to count as "mat" (tune if halos remain). */
const MIN_CHANNEL = 228;

/** Max spread between min and max RGB; rejects saturated pixels. */
const MAX_RGB_SPREAD = 20;

/**
 * Decode image bytes, knock out near-white/neutral mat, re-encode as WebP.
 *
 * Args:
 *   input: Raw image bytes (JPEG, WebP, PNG, etc. supported by sharp).
 *
 * Returns:
 *   WebP buffer with alpha (smaller and faster to encode than max-level PNG).
 *
 * Raises:
 *   Error: If sharp cannot decode or raw processing fails.
 */
export async function knockOutWhiteMatFromBuffer(input: Buffer): Promise<Buffer> {
  const pipeline = sharp(input, { sequentialRead: true })
    .ensureAlpha()
    .resize(MAX_EDGE, MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    });

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) {
    throw new Error(`knockOutWhiteMat: expected 4 channels, got ${info.channels}`);
  }

  const { width, height } = info;
  const px = data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lo = Math.min(r, g, b);
    const hi = Math.max(r, g, b);
    if (lo >= MIN_CHANNEL && hi - lo <= MAX_RGB_SPREAD) {
      px[i + 3] = 0;
    }
  }

  return sharp(px, {
    raw: { width, height, channels: 4 },
  })
    .webp({
      quality: 82,
      alphaQuality: 85,
      effort: 2,
    })
    .toBuffer();
}
