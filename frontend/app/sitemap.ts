import type { MetadataRoute } from "next";

/**
 * App Router ``/sitemap.xml``. Overrides a static ``public/sitemap.xml`` from
 * ``postbuild`` (next-sitemap) when both exist — keep entries in sync with SEO needs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://scentrev.com",
      lastModified: new Date(),
    },
  ];
}
