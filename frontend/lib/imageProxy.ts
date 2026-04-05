/**
 * Helpers for proxying external perfume images to avoid CORS / hotlink blocking.
 *
 * Use getProxiedImageUrl() for any image URL that might be from fimgs.net or
 * other external hosts that block direct browser requests.
 */

const PROXY_PATH = '/api/proxy-image';

/** Hosts that are proxied (CORS or hotlink blocked when loaded directly). */
const PROXY_HOSTS = [
  'fimgs.net',
  'www.fimgs.net',
  'images.unsplash.com',
  'source.unsplash.com',
  'cdn.fragrantica.com',
];

/** Public Supabase Storage (any project): same allowlist as `/api/proxy-image`. */
function isSupabasePublicStorageUrl(parsed: URL): boolean {
  if (!parsed.hostname.endsWith('.supabase.co')) return false;
  return parsed.pathname.includes('/storage/v1/object/public/');
}

/** Cloudflare R2 public bucket (pub-*.r2.dev or custom domain from env). */
function isR2PublicUrl(parsed: URL): boolean {
  const h = parsed.hostname.toLowerCase();
  if (h.endsWith('.r2.dev')) return true;
  const custom = (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_R2_IMAGE_HOSTNAME) ||
    ''
  )
    .toLowerCase()
    .trim();
  return Boolean(custom && h === custom);
}

function shouldUseProxy(parsed: URL): boolean {
  if (isSupabasePublicStorageUrl(parsed)) return true;
  if (isR2PublicUrl(parsed)) return true;
  return PROXY_HOSTS.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h)
  );
}

/**
 * True when URL should be treated as a catalog / product bottle shot (vs stock photo).
 * Product URLs use mat knock-out for cutout-style heroes; editorial hosts stay as-is.
 *
 * Args:
 *   raw: Image URL from API or CMS.
 *
 * Returns:
 *   Whether to pass `knockOutWhiteMat` for this URL.
 */
export function isProductPerfumeUrl(raw: string | null | undefined): boolean {
  if (raw == null || typeof raw !== 'string') return false;
  const u = raw.trim();
  if (!u) return false;
  return !u.includes('unsplash.com') && !u.includes('pexels.com');
}

export interface GetProxiedImageUrlOptions {
  /**
   * When true (and URL is proxied), append `mat=1` so the server returns a PNG
   * with near-white studio mats knocked out. Use sparingly (CPU); good for
   * full-bleed hero bottle shots.
   */
  knockOutWhiteMat?: boolean;
  /**
   * Appended as `cv=` on the upstream URL (inside the proxy `url` param when proxied)
   * so browsers and CDNs refetch when catalog rows change without renaming storage objects.
   */
  catalogAssetVersion?: string | number | null;
}

function withCatalogAssetVersion(
  trimmed: string,
  version: string | number | null | undefined
): string {
  if (version == null || version === '') return trimmed;
  const v = encodeURIComponent(String(version));
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}cv=${v}`;
}

/**
 * Returns the image URL to use for display.
 * For allowlisted external hosts, returns the app's proxy URL so the image
 * loads without CORS. Otherwise returns the original URL.
 *
 * Args:
 *   url: Raw image URL (e.g. from API).
 *   options: Optional `knockOutWhiteMat` for quiz/hero cutout-style rendering.
 *
 * Returns:
 *   URL to use as img src, or undefined if url is falsy.
 */
export function getProxiedImageUrl(
  url: string | undefined | null,
  options?: GetProxiedImageUrlOptions
): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const mat = options?.knockOutWhiteMat === true;
  const source = withCatalogAssetVersion(trimmed, options?.catalogAssetVersion ?? null);
  try {
    const parsed = new URL(source);
    if (shouldUseProxy(parsed)) {
      const q = new URLSearchParams({ url: source });
      if (mat) q.set('mat', '1');
      return `${PROXY_PATH}?${q.toString()}`;
    }
    return source;
  } catch {
    return source;
  }
}
