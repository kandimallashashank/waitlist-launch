/**
 * Waitlist quiz fallback catalog fetch + deterministic scoring.
 * Prefer ``runWaitlistQuizSupabasePipeline`` (embeddings + pgvector) from the submit route.
 */

import { fetchNoStore } from "@/lib/waitlist/httpNoStore";
import { scoreFragranceRowsForQuiz, type RawFragranceRow } from "@/lib/waitlist/quizLocalScoring";

export interface QuizAnswersPayload {
  note_preferences?: {
    top_notes?: string[];
    middle_notes?: string[];
    base_notes?: string[];
    disliked_notes?: string[];
  };
  preferred_occasions?: string[];
  preferred_seasons?: string[];
  preferred_intensity?: string | null;
  preferred_longevity?: string | null;
  preferred_sillage?: string | null;
  preferred_gender?: string | null;
  scent_families?: string[];
  mood_preferences?: string[];
  budget_range?: string | null;
  experience_level?: string | null;
  age_group?: string | null;
  climate?: string | null;
}

export interface QuizRecommendation {
  id: string;
  slug?: string | null;
  brand: string;
  name: string;
  image_url?: string | null;
  match_score: number;
  /** Short overlap lines for results UI (notes, family, etc.). */
  match_reasons?: string[];
}

/** Persisted row in ``waitlist_quiz_preferences.recommendation_snapshot`` (JSON array). */
export interface QuizRecommendationSnapshotRow {
  id: string;
  name: string;
  brand: string;
  slug?: string | null;
  image_url?: string | null;
  match_score?: number;
  match_reasons?: string[];
}

function serverApiBase(): string {
  const u =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    `http://${process.env.NEXT_PUBLIC_API_HOST || "localhost"}:${process.env.NEXT_PUBLIC_API_PORT || "8000"}`;
  return u.replace(/\/+$/, "");
}

/**
 * Fetch catalog from FastAPI and score by quiz answers.
 *
 * Args:
 *   answers: Quiz payload (same shape as main app ``answers`` wrapper body).
 *
 * Returns:
 *   Sorted recommendations (highest match first).
 */
export async function runWaitlistQuizPipeline(
  answers: QuizAnswersPayload,
): Promise<QuizRecommendation[]> {
  const base = serverApiBase();
  const res = await fetch(`${base}/api/v1/fragrances?limit=400`, {
    headers: { Accept: "application/json" },
    ...fetchNoStore,
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`);
  }
  const rows = (await res.json()) as RawFragranceRow[];
  if (!Array.isArray(rows)) {
    return [];
  }

  return scoreFragranceRowsForQuiz(answers, rows);
}
