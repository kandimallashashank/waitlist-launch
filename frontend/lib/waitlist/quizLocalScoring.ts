/**
 * Deterministic quiz → match score (shared by catalog fetch and Supabase fallbacks).
 */

import type { QuizAnswersPayload, QuizRecommendation } from "@/lib/waitlist/quizPipeline";

export interface RawFragranceRow {
  id: string;
  slug?: string | null;
  name?: string;
  brand_name?: string;
  brand?: string;
  gender?: string;
  scent_family?: string;
  primary_image_url?: string;
  image_url?: string;
  price_3ml?: number;
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  main_accords?: string[];
}

function budgetMaxInr(range: string | null | undefined): number {
  switch (range) {
    case "budget":
      return 299;
    case "mid":
    case "mid_range":
      return 500;
    case "premium":
      return 800;
    case "luxury":
    case "no_limit":
      return 1_000_000;
    default:
      return 1_000_000;
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function genderMatches(
  pref: string | null | undefined,
  fragGender: string | undefined,
): number {
  if (!pref || !fragGender) return 0.5;
  const g = norm(fragGender);
  const p = norm(pref);
  if (p === "unisex" || g === "unisex") return 1;
  if (p === g) return 1;
  if (g === "men" && p === "women") return 0;
  if (g === "women" && p === "men") return 0;
  return 0.4;
}

function familyScore(families: string[], scentFamily: string | undefined): number {
  if (!families.length || !scentFamily) return 0.3;
  const sf = norm(scentFamily);
  let best = 0;
  for (const f of families) {
    const fn = norm(f);
    if (sf.includes(fn) || fn.includes(sf)) {
      best = 1;
      break;
    }
    if (sf.split(/[\s,/]+/).some((t) => t === fn)) {
      best = Math.max(best, 0.8);
    }
  }
  return best || 0.2;
}

function notesScore(
  prefs: { top: string[]; middle: string[]; base: string[] },
  f: RawFragranceRow,
): number {
  const liked = [...prefs.top, ...prefs.middle, ...prefs.base].map(norm);
  if (!liked.length) return 0.35;
  const blob = [
    ...(f.notes_top || []),
    ...(f.notes_middle || []),
    ...(f.notes_base || []),
    ...(f.main_accords || []),
  ]
    .join(" ")
    .toLowerCase();
  let hits = 0;
  for (const n of liked) {
    if (n.length > 2 && blob.includes(n)) hits += 1;
  }
  return Math.min(1, hits / Math.max(3, liked.length * 0.4));
}

/**
 * Score and sort catalog rows from any source (API JSON or Supabase).
 *
 * Args:
 *   answers: Quiz answers.
 *   rows: Fragrance-shaped rows.
 *
 * Returns:
 *   Top recommendations by deterministic score.
 */
export function scoreFragranceRowsForQuiz(
  answers: QuizAnswersPayload,
  rows: RawFragranceRow[],
): QuizRecommendation[] {
  const np = answers.note_preferences ?? {};
  const prefs = {
    top: np.top_notes ?? [],
    middle: np.middle_notes ?? [],
    base: np.base_notes ?? [],
  };
  const families = answers.scent_families ?? [];
  const budgetKey = answers.budget_range?.trim() || null;
  const maxPrice = budgetKey ? budgetMaxInr(budgetKey) : null;

  const scored = rows
    .filter((r) => {
      if (!r.id) return false;
      if (maxPrice == null) return true;
      if (typeof r.price_3ml !== "number" || !Number.isFinite(r.price_3ml)) {
        return false;
      }
      return r.price_3ml <= maxPrice;
    })
    .map((f) => {
      const g = genderMatches(answers.preferred_gender ?? null, f.gender);
      const fam = familyScore(families, f.scent_family);
      const n = notesScore(prefs, f);
      const match_score =
        Math.round((0.25 * g + 0.35 * fam + 0.4 * n) * 1000) / 10;
      const brand =
        typeof f.brand_name === "string"
          ? f.brand_name
          : typeof f.brand === "string"
            ? f.brand
            : "";
      const img = f.primary_image_url ?? f.image_url;
      const slug =
        typeof f.slug === "string" && f.slug.trim() ? f.slug.trim() : null;
      return {
        id: String(f.id),
        slug,
        brand,
        name: typeof f.name === "string" ? f.name : "Fragrance",
        image_url: typeof img === "string" ? img : null,
        match_score,
      };
    });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored.slice(0, 24);
}
