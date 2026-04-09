/**
 * GET /api/layering/curated-combos
 *
 * Curated layering combos from Supabase (no FastAPI). Public read.
 */

import { NextResponse } from "next/server";

import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";

export const dynamic = "force-dynamic";

interface CardRow {
  id: string;
  name?: string | null;
  brand_name?: string | null;
  primary_image_url?: string | null;
  price_3ml?: number | null;
  price_8ml?: number | null;
  price_12ml?: number | null;
  scent_family?: string | null;
  concentration?: string | null;
}

interface ComboRow {
  id: string;
  title: string;
  subtitle?: string | null;
  harmony_score?: number | null;
  summary?: string | null;
  dominant_accords?: unknown;
  performance?: unknown;
  applause_count?: number | null;
  sort_order?: number | null;
  fragrance_ids?: string[] | null;
  fragrance_names?: string[] | null;
  fragrance_brands?: string[] | null;
  fragrance_images?: string[] | null;
}

/**
 * Merge curated combo row with live card prices (same shape as FastAPI).
 *
 * Args:
 *   row: Row from ``curated_layering_combos``.
 *   priceMap: Map of id -> ``v_perfumes_card`` row.
 *
 * Returns:
 *   Public combo object with ``fragrances`` list.
 */
function buildCuratedComboPublic(
  row: ComboRow,
  priceMap: Record<string, CardRow>,
): Record<string, unknown> {
  const ids = row.fragrance_ids ?? [];
  const names = row.fragrance_names ?? [];
  const brands = row.fragrance_brands ?? [];
  const images = row.fragrance_images ?? [];
  const fragrances: Record<string, unknown>[] = [];
  ids.forEach((fid, i) => {
    const fidStr = String(fid);
    const card = priceMap[fidStr] ?? ({} as CardRow);
    const name = i < names.length ? names[i] : card.name;
    const brand = i < brands.length ? brands[i] : card.brand_name;
    const img =
      (i < images.length ? images[i] : null) || card.primary_image_url;
    fragrances.push({
      id: fidStr,
      name,
      brand_name: brand,
      primary_image_url: img,
      price_3ml: card.price_3ml,
      price_8ml: card.price_8ml,
      price_12ml: card.price_12ml,
      scent_family: card.scent_family,
      concentration: card.concentration,
    });
  });
  return {
    id: String(row.id),
    title: row.title,
    subtitle: row.subtitle ?? null,
    harmony_score: Number(row.harmony_score ?? 0),
    summary: row.summary ?? "",
    dominant_accords: row.dominant_accords ?? [],
    performance: row.performance ?? null,
    applause_count: Number(row.applause_count ?? 0),
    sort_order: Number(row.sort_order ?? 0),
    fragrances,
  };
}

/**
 * List active curated layering combos with live prices.
 *
 * Returns:
 *   JSON ``{ combos: [...] }`` or empty list on failure.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("curated_layering_combos")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("[waitlist] curated combos:", error.message);
      return NextResponse.json(
        { combos: [] },
        { status: 200, headers: responseNoStoreHeaders },
      );
    }

    const list = (rows ?? []) as ComboRow[];
    if (list.length === 0) {
      return NextResponse.json(
        { combos: [] },
        { status: 200, headers: responseNoStoreHeaders },
      );
    }

    list.sort((a, b) => {
      const ap = a.applause_count ?? 0;
      const bp = b.applause_count ?? 0;
      if (bp !== ap) return bp - ap;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    const allIds: string[] = [];
    for (const r of list) {
      for (const fid of r.fragrance_ids ?? []) {
        allIds.push(String(fid));
      }
    }
    const uniqueIds = [...new Set(allIds)];

    const priceMap: Record<string, CardRow> = {};
    if (uniqueIds.length > 0) {
      const pr = await supabase
        .from("v_perfumes_card")
        .select(
          "id, name, brand_name, primary_image_url, price_3ml, price_8ml, price_12ml, scent_family, concentration",
        )
        .in("id", uniqueIds);
      if (!pr.error) {
        for (const row of (pr.data ?? []) as CardRow[]) {
          priceMap[String(row.id)] = row;
        }
      }
    }

    const combos = list.map((r) => buildCuratedComboPublic(r, priceMap));
    return NextResponse.json(
      { combos },
      { status: 200, headers: responseNoStoreHeaders },
    );
  } catch (e: unknown) {
    console.error("[waitlist] curated combos:", e);
    return NextResponse.json(
      { combos: [] },
      { status: 200, headers: responseNoStoreHeaders },
    );
  }
}
