/**
 * Build-time product PDP paths for next-sitemap `additionalPaths`.
 *
 * Paginates the FastAPI fragrances list (same caps as the main storefront sitemap).
 * Set `NEXT_PUBLIC_API_URL` during `next build` so the API is reachable.
 */

/** @typedef {{ loc: string, changefreq?: string, priority?: number, lastmod?: string }} SitemapPath */

const MAX_PAGINATED_PAGES = 200
const LIST_TIMEOUT_MS = 12_000

/**
 * @param {string} apiBase
 * @returns {Promise<SitemapPath[]>}
 */
async function fetchFragrancePaths(apiBase) {
  const pageSize = 500
  /** @type {SitemapPath[]} */
  const out = []

  for (let page = 0; page < MAX_PAGINATED_PAGES; page++) {
    const offset = page * pageSize
    try {
      const response = await fetch(
        `${apiBase}/api/v1/fragrances/?limit=${pageSize}&offset=${offset}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
        },
      )
      if (!response.ok) break

      const fragrances = await response.json()
      if (!Array.isArray(fragrances) || fragrances.length === 0) break

      for (const fragrance of fragrances) {
        if (!fragrance?.id) continue
        const lastmod =
          fragrance.updated_at != null
            ? new Date(fragrance.updated_at).toISOString()
            : undefined
        out.push({
          loc: `/product/${fragrance.id}`,
          changefreq: 'weekly',
          priority: 0.85,
          lastmod,
        })
      }

      if (fragrances.length < pageSize) break
    } catch {
      break
    }
  }

  return out
}

/**
 * @param {{ apiBase: string }} params
 * @returns {Promise<SitemapPath[]>}
 */
async function fetchCatalogSitemapPaths({ apiBase }) {
  return fetchFragrancePaths(apiBase)
}

/**
 * @param {string} url
 * @returns {string}
 */
function trimTrailingSlash(url) {
  return url.replace(/\/$/, '')
}

module.exports = {
  fetchCatalogSitemapPaths,
  trimTrailingSlash,
}
