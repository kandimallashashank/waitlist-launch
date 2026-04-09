/**
 * Build natural-language strings for quiz → vector search (mirrors FastAPI build_preference_query).
 */

import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

const INTENSITY_MAP: Record<string, string> = {
  light: "Sillage: intimate",
  moderate: "Sillage: moderate",
  strong: "Sillage: strong",
  powerful: "Sillage: beast mode",
};

const LONGEVITY_MAP: Record<string, string> = {
  short: "Longevity: 2 hours",
  moderate: "Longevity: 4 hours",
  long: "Longevity: 6 hours",
  very_long: "Longevity: 8 hours",
};

const CLIMATE_SEASON_MAP: Record<string, string> = {
  hot: "Best for seasons: summer",
  cold: "Best for seasons: winter",
  humid: "Best for seasons: monsoon",
  dry: "Best for seasons: winter spring",
  temperate: "Best for seasons: spring fall",
};

/**
 * Primary pipe-separated query for embedding (aligned with indexed fragrance text style).
 *
 * Args:
 *   answers: Quiz payload from the storefront quiz.
 *
 * Returns:
 *   Rich query string for vector RPC.
 */
export function buildPrimaryPreferenceQuery(answers: QuizAnswersPayload): string {
  const np = answers.note_preferences ?? {};
  const parts: string[] = [];

  if (np.top_notes?.length) {
    parts.push(`Top notes: ${np.top_notes.join(", ")}`);
  }
  if (np.middle_notes?.length) {
    parts.push(`Middle notes: ${np.middle_notes.join(", ")}`);
  }
  if (np.base_notes?.length) {
    parts.push(`Base notes: ${np.base_notes.join(", ")}`);
  }
  if (answers.scent_families?.length) {
    parts.push(`Scent family: ${answers.scent_families.join(", ")}`);
  }
  if (answers.preferred_occasions?.length) {
    parts.push(`Perfect for occasions: ${answers.preferred_occasions.join(", ")}`);
  }
  if (answers.preferred_seasons?.length) {
    parts.push(`Best for seasons: ${answers.preferred_seasons.join(", ")}`);
  }

  const inten = answers.preferred_intensity?.toLowerCase().replace(/\s+/g, "_");
  if (inten && INTENSITY_MAP[inten]) {
    parts.push(INTENSITY_MAP[inten]);
  }
  const longev = answers.preferred_longevity?.toLowerCase().replace(/\s+/g, "_");
  if (longev && LONGEVITY_MAP[longev]) {
    parts.push(LONGEVITY_MAP[longev]);
  }

  const g = answers.preferred_gender?.toLowerCase();
  if (g && g !== "no_preference") {
    parts.push(`Gender: ${answers.preferred_gender}`);
  }

  const climate = answers.climate?.toLowerCase();
  if (
    climate &&
    CLIMATE_SEASON_MAP[climate] &&
    !(answers.preferred_seasons?.length)
  ) {
    parts.push(CLIMATE_SEASON_MAP[climate]);
  }

  if (answers.mood_preferences?.length) {
    parts.push(`Mood: ${answers.mood_preferences.join(", ")}`);
  }

  if (!parts.length) {
    return "Fresh versatile fragrance moderate sillage";
  }
  return parts.join(" | ");
}

/**
 * Three weighted query variants (same intent as FastAPI multi-query embedding).
 *
 * Args:
 *   answers: Quiz payload.
 *
 * Returns:
 *   Primary, occasion, and notes-focused strings plus RPC weights.
 */
export function buildWaitlistPreferenceQueries(answers: QuizAnswersPayload): {
  texts: string[];
  weights: number[];
} {
  const primary = buildPrimaryPreferenceQuery(answers);
  const occasionsStr =
    (answers.preferred_occasions ?? []).join(", ") || "daily wear";
  const genderRaw = answers.preferred_gender;
  const gender =
    genderRaw && genderRaw !== "no_preference" ? genderRaw : "unisex";
  const fam = (answers.scent_families ?? []).join(", ") || "pleasant";
  const occasion = `A fragrance perfect for ${occasionsStr}, ${gender} with ${fam} scent profile`;

  const np = answers.note_preferences ?? {};
  const noteList = [
    ...(np.top_notes ?? []),
    ...(np.middle_notes ?? []),
    ...(np.base_notes ?? []),
  ];
  const notesStr =
    noteList.slice(0, 6).join(", ") ||
    (answers.scent_families ?? []).join(", ") ||
    "pleasant";
  const intensity = answers.preferred_intensity ?? "medium";
  const notes = `Fragrance with ${notesStr} notes, ${intensity} intensity for ${gender}`;

  return {
    texts: [primary, occasion, notes],
    weights: [0.6, 0.25, 0.15],
  };
}
