/**
 * Minimal API surface used by ``useWaitlistPerfumes``; mirrors ``base44.entities.Fragrance.list``.
 */

export interface FragranceListItem {
  id: string;
  name: string;
  gender?: string;
  brand?: string;
  brand_name?: string;
  image_url?: string;
  primary_image_url?: string;
  blind_buy_score?: number;
  [key: string]: unknown;
}

async function fragranceList(
  _sort?: string,
  limit?: number,
): Promise<FragranceListItem[]> {
  const host =
    process.env.NEXT_PUBLIC_API_URL ||
    `http://${process.env.NEXT_PUBLIC_API_HOST || "localhost"}:${process.env.NEXT_PUBLIC_API_PORT || "8000"}`;
  const base = host.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();
  const url = `${base}/api/v1/fragrances/${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fragrances request failed: ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  return data.map((raw: Record<string, unknown>) => {
    const primary =
      (raw.primary_image_url as string | undefined) ||
      (raw.image_url as string | undefined);
    return {
      ...raw,
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      gender: (raw.gender as string) || "unisex",
      brand_name: (raw.brand_name as string) || (raw.brand as string),
      brand: (raw.brand as string) || (raw.brand_name as string),
      image_url: primary,
      primary_image_url: primary,
      blind_buy_score: raw.blind_buy_score as number | undefined,
    };
  });
}

/** Drop-in subset of ``apps/web`` ``base44`` for the waitlist catalog hook. */
export const base44 = {
  entities: {
    Fragrance: {
      list: fragranceList,
    },
  },
};
