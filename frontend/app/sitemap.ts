import type { MetadataRoute } from "next";

const SITE_URL = "https://scentrev.com";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  "http://localhost:8000";

/** Static routes with per-route priority and changefreq. */
const STATIC_ROUTES: {
  url: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { url: "/", changeFrequency: "daily", priority: 1.0 },
  { url: "/quiz", changeFrequency: "weekly", priority: 0.9 },
  { url: "/gift", changeFrequency: "weekly", priority: 0.9 },
  { url: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { url: "/perfume-samples-india", changeFrequency: "weekly", priority: 0.82 },
  { url: "/summer-perfumes-india", changeFrequency: "weekly", priority: 0.8 },
  { url: "/office-perfumes-india", changeFrequency: "weekly", priority: 0.8 },
  { url: "/subscribe", changeFrequency: "weekly", priority: 0.8 },
  { url: "/layering-lab", changeFrequency: "weekly", priority: 0.85 },
  { url: "/corporate-gifting", changeFrequency: "monthly", priority: 0.7 },
  { url: "/about", changeFrequency: "monthly", priority: 0.65 },
  { url: "/share/scent-dna", changeFrequency: "monthly", priority: 0.55 },
];

const PAGE_SIZE = 500;
const MAX_PAGES = 200;
const TIMEOUT_MS = 12_000;

/**
 * Fetches all product/PDP paths from the FastAPI fragrances endpoint.
 * Gracefully falls back to an empty list if the API is unreachable at build time.
 */
async function fetchProductEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/fragrances/?limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          // Revalidate daily so the sitemap stays fresh without a full redeploy.
          next: { revalidate: 86_400 },
        },
      );
      if (!res.ok) break;

      const fragrances: { id?: string; updated_at?: string }[] =
        await res.json();
      if (!Array.isArray(fragrances) || fragrances.length === 0) break;

      for (const f of fragrances) {
        if (!f?.id) continue;
        entries.push({
          url: `${SITE_URL}/product/${f.id}`,
          changeFrequency: "weekly",
          priority: 0.85,
          lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
        });
      }

      if (fragrances.length < PAGE_SIZE) break;
    } catch {
      // API unreachable (e.g. local dev without backend) – stop gracefully.
      break;
    }
  }

  return entries;
}

/**
 * App Router dynamic sitemap.
 *
 * Serves at /sitemap.xml and is kept fresh via ISR (revalidate: 86400).
 * Covers all static marketing/waitlist routes + every fragrance PDP page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.url}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    lastModified: now,
  }));

  const productEntries = await fetchProductEntries();

  return [...staticEntries, ...productEntries];
}
