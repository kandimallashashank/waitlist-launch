/**
 * Maps waitlist quiz API answers into profile-style preference chips and DNA card data.
 */

import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";
import type { DNACardData, ScentFamilyData } from "@/components/profile/FragranceDNACard";

/** Profile-tab style preference rows for the pilot results panel. */
export interface PilotPreferencesView {
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
  disliked_notes: string[];
  scent_families: string[];
  mood_preferences: string[];
  preferred_occasions: string[];
  preferred_seasons: string[];
  preferred_intensity: string | null;
  preferred_longevity: string | null;
  preferred_gender: string | null;
  budget_range: string | null;
  experience_level: string | null;
}

function fmtSlug(s: string): string {
  return s.replace(/_/g, " ");
}

/**
 * Flattens ``answers`` from quiz submit body into chip-friendly preference rows.
 *
 * Args:
 *   answers: Nested quiz answers (same shape as FastAPI ``QuizAnswers``).
 *
 * Returns:
 *   PilotPreferencesView for UI lists.
 */
/**
 * Maps quiz answers to the flat shape expected by ``ScentProfileChart`` (profile parity).
 *
 * Args:
 *   answers: Quiz API answers payload.
 *
 * Returns:
 *   Preference object for the radar chart.
 */
export function pilotAnswersToScentChartPreferences(answers: QuizAnswersPayload) {
  const np = answers.note_preferences ?? {};
  const top = (np.top_notes ?? []).map(fmtSlug);
  const mid = (np.middle_notes ?? []).map(fmtSlug);
  const base = (np.base_notes ?? []).map(fmtSlug);
  return {
    liked_notes: [...top, ...mid, ...base],
    disliked_notes: (np.disliked_notes ?? []).map(fmtSlug),
    top_notes: top,
    middle_notes: mid,
    base_notes: base,
    preferred_seasons: [...(answers.preferred_seasons ?? [])],
    preferred_occasions: [...(answers.preferred_occasions ?? [])],
    scent_families: (answers.scent_families ?? []).map(fmtSlug),
    preferred_intensity: answers.preferred_intensity ?? null,
    preferred_longevity: answers.preferred_longevity ?? null,
    preferred_gender: answers.preferred_gender ?? null,
    mood_preferences: (answers.mood_preferences ?? []).map(fmtSlug),
    budget_range: answers.budget_range ?? null,
  };
}

export function quizAnswersToPilotPreferences(
  answers: QuizAnswersPayload,
): PilotPreferencesView {
  const np = answers.note_preferences ?? {};
  return {
    top_notes: (np.top_notes ?? []).map(fmtSlug),
    middle_notes: (np.middle_notes ?? []).map(fmtSlug),
    base_notes: (np.base_notes ?? []).map(fmtSlug),
    disliked_notes: (np.disliked_notes ?? []).map(fmtSlug),
    scent_families: (answers.scent_families ?? []).map(fmtSlug),
    mood_preferences: (answers.mood_preferences ?? []).map(fmtSlug),
    preferred_occasions: [...(answers.preferred_occasions ?? [])],
    preferred_seasons: [...(answers.preferred_seasons ?? [])],
    preferred_intensity: answers.preferred_intensity ?? null,
    preferred_longevity: answers.preferred_longevity ?? null,
    preferred_gender: answers.preferred_gender ?? null,
    budget_range: answers.budget_range ?? null,
    experience_level: answers.experience_level ?? null,
  };
}

const FAMILY_COLORS = ["#B85A3A", "#D4A574", "#8B9E7E", "#7A3A23"];

function distributeFamilyPercentages(names: string[]): ScentFamilyData[] {
  if (names.length === 0) return [];
  const n = names.length;
  const base = Math.floor(100 / n);
  let rest = 100 - base * n;
  return names.slice(0, 4).map((name, i) => {
    const pct = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest -= 1;
    return {
      name: fmtSlug(name),
      percentage: pct,
      color: FAMILY_COLORS[i % FAMILY_COLORS.length],
    };
  });
}

function scentProfileTitle(answers: QuizAnswersPayload): string {
  const fam = answers.scent_families?.[0];
  const exp = answers.experience_level;
  if (fam && exp === "beginner") return `${fmtSlug(fam)} curious`;
  if (fam) return `${fmtSlug(fam)} explorer`;
  if (exp === "expert" || exp === "enthusiast") return "Signature seeker";
  return "Scent explorer";
}

function profileBlurb(answers: QuizAnswersPayload): string {
  const parts: string[] = [];
  const occ = answers.preferred_occasions?.slice(0, 2).join(", ");
  if (occ) parts.push(`drawn to moments like ${occ}`);
  const moods = answers.mood_preferences?.slice(0, 2).map(fmtSlug).join(", ");
  if (moods) parts.push(`moods: ${moods}`);
  if (parts.length === 0) {
    return "Your quiz is saved browse picks below and tune filters anytime in the catalog.";
  }
  return `You’re ${parts.join(" · ")}. We’ll match you with fragrances that fit.`;
}

function signatureNotes(answers: QuizAnswersPayload): string[] {
  const np = answers.note_preferences ?? {};
  const merged = [
    ...(np.top_notes ?? []).slice(0, 2),
    ...(np.middle_notes ?? []).slice(0, 2),
    ...(np.base_notes ?? []).slice(0, 2),
  ];
  return merged.map(fmtSlug);
}

function personalityTraits(answers: QuizAnswersPayload): string[] {
  const t: string[] = [];
  if (answers.experience_level) t.push(fmtSlug(answers.experience_level));
  if (answers.preferred_intensity) t.push(fmtSlug(answers.preferred_intensity));
  (answers.mood_preferences ?? []).slice(0, 2).forEach((m) => t.push(fmtSlug(m)));
  return t.filter(Boolean).slice(0, 4);
}

/**
 * Builds Fragrance DNA card payload from quiz answers (no profile API).
 *
 * Args:
 *   answers: Quiz answers object from submit payload.
 *
 * Returns:
 *   DNACardData for ``FragranceDNACard`` (pilotTitles recommended).
 */
export function buildPilotDnaCardFromAnswers(answers: QuizAnswersPayload): DNACardData {
  const families = answers.scent_families ?? [];
  const now = new Date().toISOString();
  return {
    user_id: "waitlist-pilot",
    username: "pilot",
    display_name: "",
    scent_profile_name: scentProfileTitle(answers),
    profile_description: profileBlurb(answers),
    primary_color: "#B85A3A",
    secondary_color: "#D4A574",
    scent_families: distributeFamilyPercentages(families),
    top_notes: (answers.note_preferences?.top_notes ?? []).slice(0, 5).map(fmtSlug),
    signature_notes: signatureNotes(answers),
    favorite_occasions: [...(answers.preferred_occasions ?? [])].slice(0, 5),
    favorite_seasons: [...(answers.preferred_seasons ?? [])].slice(0, 4),
    personality_traits: personalityTraits(answers),
    share_url: "",
    generated_at: now,
  };
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * DNA card aligned with the saved quiz API payload: answers drive structure;
 * persisted ``scent_profile`` overrides title, blurb, and chart slices when present.
 *
 * Args:
 *   answers: Quiz answers (same as submit body).
 *   scent_profile: Optional JSON from ``waitlist_quiz_preferences.scent_profile``.
 *
 * Returns:
 *   ``DNACardData`` for ``FragranceDNACard`` consistent with the profile headline.
 */
export function buildPilotDnaCardForDisplay(
  answers: QuizAnswersPayload,
  scent_profile: Record<string, unknown> | null | undefined,
): DNACardData {
  const base = buildPilotDnaCardFromAnswers(answers);
  if (!scent_profile || typeof scent_profile !== "object") {
    return base;
  }

  const name =
    typeof scent_profile.scent_profile_name === "string"
      ? scent_profile.scent_profile_name.trim()
      : "";
  const desc =
    typeof scent_profile.profile_description === "string"
      ? scent_profile.profile_description.trim()
      : "";

  let scent_families = base.scent_families;
  const pf = scent_profile.primary_families;
  if (isStringArray(pf) && pf.length > 0) {
    scent_families = distributeFamilyPercentages(pf);
  }

  let signature_notes = base.signature_notes;
  const sig = scent_profile.signature_notes;
  if (isStringArray(sig) && sig.length > 0) {
    signature_notes = sig.map(fmtSlug);
  }

  let favorite_occasions = base.favorite_occasions;
  const bo = scent_profile.best_occasions;
  if (isStringArray(bo) && bo.length > 0) {
    favorite_occasions = bo.slice(0, 5);
  }

  let favorite_seasons = base.favorite_seasons;
  const bs = scent_profile.best_seasons;
  if (isStringArray(bs) && bs.length > 0) {
    favorite_seasons = bs.slice(0, 4);
  }

  let personality_traits = base.personality_traits;
  const pt = scent_profile.personality_traits;
  if (isStringArray(pt) && pt.length > 0) {
    personality_traits = pt.map(fmtSlug).slice(0, 4);
  }

  return {
    ...base,
    scent_profile_name: name || base.scent_profile_name,
    profile_description: desc || base.profile_description,
    scent_families:
      scent_families.length > 0 ? scent_families : base.scent_families,
    signature_notes,
    favorite_occasions,
    favorite_seasons,
    personality_traits,
  };
}
