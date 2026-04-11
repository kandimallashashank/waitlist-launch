/**
 * next-sitemap: writes `public/sitemap.xml` (and `sitemap-*.xml` when split).
 * Runs in `postbuild` after `next build`. `app/robots.ts` references the same
 * sitemap URL for crawlers.
 */

const {
  fetchCatalogSitemapPaths,
  trimTrailingSlash,
} = require('./lib/sitemap/nextSitemapCatalogPaths.js')

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://scentrev.com',
  generateRobotsTxt: true,
  sitemapSize: 45_000,
  generateIndexSitemap: true,
  autoLastmod: true,
  exclude: ['/api/*'],
  transform: async (config, path) => {
    if (path === '/api' || path.startsWith('/api/')) {
      return null
    }

    const meta = STATIC_ROUTE_META[path]
    if (meta) {
      return {
        loc: path,
        changefreq: meta.changefreq,
        priority: meta.priority,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
        alternateRefs: config.alternateRefs ?? [],
      }
    }

    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
  additionalPaths: async () => {
    const apiRaw = process.env.NEXT_PUBLIC_API_URL?.trim()
    const apiBase = apiRaw ? trimTrailingSlash(apiRaw) : 'http://localhost:8000'
    return fetchCatalogSitemapPaths({ apiBase })
  },
}

/** Marketing / pilot routes (explicit changefreq + priority). */
const STATIC_ROUTE_META = {
  '/': { changefreq: 'daily', priority: 1 },
  '/quiz': { changefreq: 'weekly', priority: 0.9 },
  '/gift': { changefreq: 'weekly', priority: 0.9 },
  '/share/scent-dna': { changefreq: 'monthly', priority: 0.55 },
  '/about': { changefreq: 'monthly', priority: 0.65 },
  '/corporate-gifting': { changefreq: 'monthly', priority: 0.7 },
  '/layering-lab': { changefreq: 'weekly', priority: 0.85 },
  '/catalog': { changefreq: 'daily', priority: 0.9 },
  '/subscribe': { changefreq: 'weekly', priority: 0.8 },
}
