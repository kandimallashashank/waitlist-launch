/**
 * Deterministic quiz KPIs (port of apps/api/services/quiz_preference_kpis.py).
 */

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

function clampInt(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(x)));
}

function mapTier(
  value: string | null | undefined,
  mapping: Record<string, number>,
  defaultVal: number,
): number {
  if (!value) return defaultVal;
  const k = String(value).toLowerCase().trim().replace(/\s+/g, "_");
  return mapping[k] ?? defaultVal;
}

function pyramidSplit(answers: QuizAnswersPayload): {
  top: number;
  middle: number;
  base: number;
  dominant: string;
} {
  const np = answers.note_preferences ?? {};
  const t = np.top_notes?.length ?? 0;
  const m = np.middle_notes?.length ?? 0;
  const b = np.base_notes?.length ?? 0;
  const total = t + m + b;
  if (total === 0) {
    return { top: 33, middle: 34, base: 33, dominant: "balanced" };
  }
  let tp = clampInt((100 * t) / total);
  let mp = clampInt((100 * m) / total);
  let bp = clampInt((100 * b) / total);
  const diff = 100 - (tp + mp + bp);
  if (diff !== 0) {
    tp = clampInt(tp + diff);
  }

  const mx = Math.max(tp, mp, bp);
  const mn = Math.min(tp, mp, bp);
  let label = "balanced";
  if (mx - mn > 12) {
    if (tp === mx) label = "opening_forward";
    else if (mp === mx) label = "heart_forward";
    else label = "base_forward";
  }
  return { top: tp, middle: mp, base: bp, dominant: label };
}

function pyramidDisplayLabel(key: string): string {
  const m: Record<string, string> = {
    opening_forward: "Opening-forward",
    heart_forward: "Heart-forward",
    base_forward: "Base-forward",
    balanced: "Balanced pyramid",
  };
  return m[key] ?? "Balanced pyramid";
}

function archetypeFocus(answers: QuizAnswersPayload): { score: number; label: string } {
  const nf = answers.scent_families?.length ?? 0;
  const nm = answers.mood_preferences?.length ?? 0;
  const familyPart = 100 - Math.min(85, Math.max(0, nf - 1) * 18);
  const moodPart = 100 - Math.min(40, Math.max(0, nm - 1) * 12);
  const score = clampInt(0.55 * familyPart + 0.45 * moodPart);
  let label = "Still discovering";
  if (score >= 78) label = "Signature-focused";
  else if (score >= 58) label = "Balanced explorer";
  else if (score >= 40) label = "Wide explorer";
  return { score, label };
}

function performanceAppetite(answers: QuizAnswersPayload): { score: number; label: string } {
  const intensityMap = { light: 22, moderate: 48, strong: 72, powerful: 92 };
  const longevityMap = { short: 25, moderate: 48, long: 72, very_long: 90 };
  const sillageMap = { intimate: 22, moderate: 48, strong: 74, beast: 94 };

  const i = mapTier(answers.preferred_intensity, intensityMap, 48);
  const l = mapTier(answers.preferred_longevity, longevityMap, 48);
  const s = mapTier(answers.preferred_sillage, sillageMap, 48);
  const score = clampInt((i + l + s) / 3);
  let label = "Skin-close";
  if (score >= 75) label = "Bold presence";
  else if (score >= 55) label = "Moderate presence";
  else if (score >= 35) label = "Soft presence";
  return { score, label };
}

function versatility(count: number, maxReasonable: number, perStep: number): number {
  if (count <= 0) return 15;
  return clampInt(Math.min(100, 20 + (count - 1) * perStep));
}

/**
 * Build KPI payload for the pilot analytics panel.
 *
 * Args:
 *   answers: Quiz answers.
 *
 * Returns:
 *   PreferenceAnalyticsData (without LLM summary).
 */
export function computeWaitlistPreferenceKpis(
  answers: QuizAnswersPayload,
): PreferenceAnalyticsData {
  const { top, middle, base, dominant } = pyramidSplit(answers);
  const arch = archetypeFocus(answers);
  const perf = performanceAppetite(answers);
  const occScore = versatility(answers.preferred_occasions?.length ?? 0, 6, 16);
  const seaScore = versatility(answers.preferred_seasons?.length ?? 0, 4, 22);

  return {
    archetype_focus_score: arch.score,
    archetype_focus_label: arch.label,
    performance_appetite_score: perf.score,
    performance_appetite_label: perf.label,
    occasion_versatility_score: occScore,
    season_versatility_score: seaScore,
    pyramid: {
      top_pct: top,
      middle_pct: middle,
      base_pct: base,
      dominant_layer: dominant,
      dominant_layer_label: pyramidDisplayLabel(dominant),
    },
    ai_summary: null,
    computed_at: new Date().toISOString(),
  };
}
