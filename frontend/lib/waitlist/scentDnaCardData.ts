/**
 * Shared "fragrance DNA" snapshot for share cards, emails, and OG copy.
 * Accepts loose JSON from Supabase or live quiz state.
 */

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

/** One row for DNA bar charts (ordered picks → stronger bars first). */
export interface DnaBarItem {
  label: string;
  /** Relative strength 1–100 after normalizing order weights. */
  percent: number;
}

/** Normalized DNA fields for UI, PNG export, and HTML email. */
export interface ScentDnaCardData {
  archetypeLabel: string;
  performanceLabel: string;
  pyramidLabel: string;
  families: string[];
  moods: string[];
  topNotes: string[];
  /** Bar lengths for scent families (same order as ``families``). */
  familyBars: DnaBarItem[];
  /** Bar lengths for mood / vibe picks. */
  moodBars: DnaBarItem[];
  /** Bar lengths for opening (top) note picks. */
  openingNoteBars: DnaBarItem[];
}

function humanizeToken(s: string): string {
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Turn an ordered preference list into bar percentages (earlier = stronger).
 *
 * Args:
 *   labels: Human-readable labels in pick order.
 *
 * Returns:
 *   Same labels with percents that sum to 100 when non-empty.
 */
export function preferenceLabelsToBars(labels: string[]): DnaBarItem[] {
  const n = labels.length;
  if (n === 0) {
    return [];
  }
  const weights = labels.map((_, i) => n - i);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => ({
    label,
    percent: Math.round((100 * weights[i]) / totalWeight),
  }));
}

function asStringArray(v: unknown, cap: number): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim()) {
      out.push(humanizeToken(x));
    }
    if (out.length >= cap) {
      break;
    }
  }
  return out;
}

function readAnswers(answers: unknown): QuizAnswersPayload | null {
  if (!answers || typeof answers !== "object") {
    return null;
  }
  return answers as QuizAnswersPayload;
}

/**
 * Build a compact DNA card model from KPI analytics and quiz-shaped answers.
 *
 * Args:
 *   analytics: Preference KPI blob (may be partial if loaded from JSON).
 *   answers: Quiz or derived gift quiz payload.
 *
 * Returns:
 *   Labels and short lists safe to render in email and share art.
 */
export function buildScentDnaCardData(
  analytics: PreferenceAnalyticsData | Record<string, unknown> | null | undefined,
  answers: QuizAnswersPayload | Record<string, unknown> | null | undefined,
): ScentDnaCardData {
  const a =
    analytics && typeof analytics === "object"
      ? (analytics as Partial<PreferenceAnalyticsData>)
      : {};
  const pyramid =
    a.pyramid && typeof a.pyramid === "object"
      ? (a.pyramid as { dominant_layer_label?: string })
      : {};

  const q = readAnswers(answers);
  const np = q?.note_preferences;

  const families = asStringArray(q?.scent_families, 6);
  const moods = asStringArray(q?.mood_preferences, 5);
  const topNotes = asStringArray(np?.top_notes, 5);

  return {
    archetypeLabel:
      typeof a.archetype_focus_label === "string" && a.archetype_focus_label.trim()
        ? a.archetype_focus_label.trim()
        : "Still discovering",
    performanceLabel:
      typeof a.performance_appetite_label === "string" &&
      a.performance_appetite_label.trim()
        ? a.performance_appetite_label.trim()
        : "Moderate presence",
    pyramidLabel:
      typeof pyramid.dominant_layer_label === "string" &&
      pyramid.dominant_layer_label.trim()
        ? pyramid.dominant_layer_label.trim()
        : "Balanced pyramid",
    families,
    moods,
    topNotes,
    familyBars: preferenceLabelsToBars(families),
    moodBars: preferenceLabelsToBars(moods),
    openingNoteBars: preferenceLabelsToBars(topNotes),
  };
}
