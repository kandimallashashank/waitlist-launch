/**
 * Waitlist quiz recommendations: embed queries in Node (all-mpnet-base-v2) + Supabase pgvector RPC.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import { embedWeightedQueries } from "@/lib/waitlist/quizEmbeddings";
import { computeWaitlistPreferenceKpis } from "@/lib/waitlist/quizPreferenceKpis";
import { buildWaitlistPreferenceQueries } from "@/lib/waitlist/quizPreferenceQuery";
import {
  scoreFragranceRowsForQuiz,
  type RawFragranceRow,
} from "@/lib/waitlist/quizLocalScoring";
import { enrichQuizRecommendationsWithImages } from "@/lib/waitlist/enrichQuizRecommendationImages";
import type {
  QuizAnswersPayload,
  QuizRecommendation,
  QuizRecommendationSnapshotRow,
} from "@/lib/waitlist/quizPipeline";
import { buildPilotDnaCardFromAnswers } from "@/lib/waitlist/quizResultMappers";

interface SearchFragranceRow {
  fragrance_id: string;
  name: string;
  brand_name: string;
  gender: string | null;
  scent_family: string | null;
  primary_image_url: string | null;
  similarity_score: number;
  notes_top: unknown;
  notes_middle: unknown;
  notes_base: unknown;
  main_accords: unknown;
  seasons: unknown;
}

/**
 * Map quiz budget keys to inclusive INR bounds on 3ml (matches FastAPI).
 *
 * Args:
 *   budget_range: Raw quiz value.
 *
 * Returns:
 *   Optional min/max for ``search_fragrances_full``.
 */
export function quizBudgetInrBounds(
  budget_range: string | null | undefined,
): { price_min: number | null; price_max: number | null } {
  if (!budget_range) {
    return { price_min: null, price_max: null };
  }
  const key = budget_range.replace(/-/g, "_").toLowerCase();
  if (key === "no_limit") {
    return { price_min: null, price_max: null };
  }
  const bounds: Record<string, [number, number]> = {
    budget: [0, 299.99],
    mid: [300, 600],
    mid_range: [300, 500],
    premium: [500, 800],
    luxury: [800, 99999],
  };
  const b = bounds[key] ?? [0, 99999];
  return { price_min: b[0], price_max: b[1] };
}

function rpcGenderFilter(answers: QuizAnswersPayload): string | null {
  const g = answers.preferred_gender?.toLowerCase();
  if (!g || g === "no_preference" || g === "unisex") {
    return null;
  }
  if (g === "men" || g === "women") {
    return g;
  }
  return null;
}

function jsonToStringArr(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === "string");
}

function rowNotesBlob(row: SearchFragranceRow): string {
  const parts = [
    ...jsonToStringArr(row.notes_top),
    ...jsonToStringArr(row.notes_middle),
    ...jsonToStringArr(row.notes_base),
    ...jsonToStringArr(row.main_accords),
  ];
  return parts.join(" ").toLowerCase();
}

function passesDislikedNotes(blob: string, disliked: string[]): boolean {
  if (!disliked.length) {
    return true;
  }
  for (const d of disliked) {
    const dl = d.toLowerCase().trim();
    if (dl.length > 2 && blob.includes(dl)) {
      return false;
    }
  }
  return true;
}

function passesScentFamilies(
  scentFamily: string | null | undefined,
  families: string[],
): boolean {
  if (!families.length) {
    return true;
  }
  const sf = (scentFamily ?? "").toLowerCase();
  if (!sf) {
    return true;
  }
  return families.some((f) => {
    const fl = f.toLowerCase();
    return sf.includes(fl) || fl.includes(sf);
  });
}

function passesSeasons(rowSeasons: unknown, preferred: string[]): boolean {
  if (!preferred.length) {
    return true;
  }
  const blob = JSON.stringify(rowSeasons ?? {}).toLowerCase();
  return preferred.some((s) => {
    const key = s.toLowerCase().replace(/\s+/g, "_");
    return blob.includes(key) || blob.includes(s.toLowerCase());
  });
}

async function fetchSlugMap(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) {
    return map;
  }
  const { data } = await supabase
    .from("perfumes")
    .select("id, slug")
    .in("id", ids);
  for (const row of data ?? []) {
    const id = row.id != null ? String(row.id) : "";
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (id && slug) {
      map.set(id, slug);
    }
  }
  return map;
}

function recommendationRowsToSnapshot(
  recommendations: QuizRecommendation[],
): QuizRecommendationSnapshotRow[] {
  return recommendations.slice(0, 12).map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    slug: r.slug ?? null,
    image_url: r.image_url ?? null,
    match_score: r.match_score,
  }));
}

async function fallbackFromPerfumesTable(
  supabase: SupabaseClient,
  answers: QuizAnswersPayload,
  scent_profile: Record<string, unknown>,
  preference_analytics: PreferenceAnalyticsData,
): Promise<{
  recommendations: QuizRecommendation[];
  scent_profile: Record<string, unknown>;
  preference_analytics: PreferenceAnalyticsData;
  recommendation_snapshot: QuizRecommendationSnapshotRow[];
}> {
  const { data, error } = await supabase
    .from("perfumes")
    .select(
      "id, slug, name, brand_name, gender, scent_family, price_3ml, notes_top, notes_middle, notes_base, main_accords, primary_image_url, image_url",
    )
    .eq("is_active", true)
    .limit(500);

  if (error) {
    console.error("quiz fallback perfumes:", error.message);
  }

  const rows = (data ?? []) as RawFragranceRow[];
  const scored = scoreFragranceRowsForQuiz(answers, rows);
  const recommendations = await enrichQuizRecommendationsWithImages(
    supabase,
    scored,
  );
  const recommendation_snapshot =
    recommendationRowsToSnapshot(recommendations);

  return {
    recommendations,
    scent_profile,
    preference_analytics,
    recommendation_snapshot,
  };
}

/**
 * Run full waitlist quiz retrieval: embeddings + ``search_fragrances_full``, with table fallback.
 *
 * Args:
 *   supabase: Service-role client.
 *   answers: Quiz JSON body.
 *
 * Returns:
 *   Recommendations, UI profile blobs, and a compact snapshot for email / DB.
 */
export async function runWaitlistQuizSupabasePipeline(
  supabase: SupabaseClient,
  answers: QuizAnswersPayload,
): Promise<{
  recommendations: QuizRecommendation[];
  scent_profile: Record<string, unknown>;
  preference_analytics: PreferenceAnalyticsData;
  recommendation_snapshot: QuizRecommendationSnapshotRow[];
}> {
  const preference_analytics = computeWaitlistPreferenceKpis(answers);
  const dna = buildPilotDnaCardFromAnswers(answers);
  const scent_profile: Record<string, unknown> = {
    scent_profile_name: dna.scent_profile_name,
    profile_description: dna.profile_description,
    primary_families: answers.scent_families ?? [],
    signature_notes: dna.signature_notes,
    best_occasions: [...(answers.preferred_occasions ?? [])].slice(0, 5),
    best_seasons: [...(answers.preferred_seasons ?? [])].slice(0, 4),
    personality_traits: dna.personality_traits,
  };

  let queryEmbedding: number[];
  try {
    const { texts, weights } = buildWaitlistPreferenceQueries(answers);
    queryEmbedding = await embedWeightedQueries(texts, weights);
  } catch (err) {
    console.error("waitlist quiz embedding failed:", err);
    return fallbackFromPerfumesTable(
      supabase,
      answers,
      scent_profile,
      preference_analytics,
    );
  }

  const { price_min, price_max } = quizBudgetInrBounds(answers.budget_range ?? null);
  const filter_gender = rpcGenderFilter(answers);

  const { data, error } = await supabase.rpc("search_fragrances_full", {
    query_embedding: queryEmbedding,
    match_count: 120,
    filter_gender,
    filter_scent_family: null,
    filter_price_min: price_min,
    filter_price_max: price_max,
  });

  if (error) {
    console.warn("search_fragrances_full:", error.message);
    return fallbackFromPerfumesTable(
      supabase,
      answers,
      scent_profile,
      preference_analytics,
    );
  }

  const rawRows = Array.isArray(data) ? (data as SearchFragranceRow[]) : [];
  if (!rawRows.length) {
    return fallbackFromPerfumesTable(
      supabase,
      answers,
      scent_profile,
      preference_analytics,
    );
  }

  const disliked = (answers.note_preferences?.disliked_notes ?? []).map((n) =>
    n.toLowerCase(),
  );
  const families = answers.scent_families ?? [];
  const seasons = answers.preferred_seasons ?? [];

  const filterRows = (relaxFamilies: boolean): SearchFragranceRow[] =>
    rawRows.filter((row) => {
      const blob = rowNotesBlob(row);
      if (!passesDislikedNotes(blob, disliked)) {
        return false;
      }
      if (!relaxFamilies && !passesScentFamilies(row.scent_family, families)) {
        return false;
      }
      if (!passesSeasons(row.seasons, seasons)) {
        return false;
      }
      return true;
    });

  let filtered = filterRows(false);
  if (filtered.length < 6 && families.length) {
    filtered = filterRows(true);
  }
  if (!filtered.length) {
    filtered = [...rawRows].sort(
      (a, b) => b.similarity_score - a.similarity_score,
    );
  }

  filtered.sort((a, b) => b.similarity_score - a.similarity_score);
  const top = filtered.slice(0, 24);
  const ids = top.map((r) => String(r.fragrance_id));
  const slugMap = await fetchSlugMap(supabase, ids);

  const mapped: QuizRecommendation[] = top.map((r) => ({
    id: String(r.fragrance_id),
    slug: slugMap.get(String(r.fragrance_id)) ?? null,
    brand: typeof r.brand_name === "string" ? r.brand_name : "",
    name: typeof r.name === "string" ? r.name : "Fragrance",
    image_url:
      typeof r.primary_image_url === "string" && r.primary_image_url.trim()
        ? r.primary_image_url.trim()
        : null,
    match_score:
      Math.round(
        Math.max(0, Math.min(1, r.similarity_score ?? 0)) * 1000,
      ) / 10,
  }));

  const recommendations = await enrichQuizRecommendationsWithImages(
    supabase,
    mapped,
  );
  const recommendation_snapshot =
    recommendationRowsToSnapshot(recommendations);

  return {
    recommendations,
    scent_profile,
    preference_analytics,
    recommendation_snapshot,
  };
}
