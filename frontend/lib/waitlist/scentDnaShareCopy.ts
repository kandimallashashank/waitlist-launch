/**
 * Social-share copy for the DNA card: turns internal KPI labels into short, shareable lines.
 */

import type { ScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";

const GENERIC_ARCHETYPE = /^still\s*discovering$/i;

/** Archetype labels from ``quizPreferenceKpis`` → headline when not generic. */
const ARCHETYPE_HEADLINE: Record<string, string> = {
  "Signature-focused": "Chasing my signature",
  "Balanced explorer": "Curious & balanced",
  "Wide explorer": "Exploring it all",
};

/** Performance labels from KPI → Instagram-friendly phrase. */
const PERFORMANCE_SHARE: Record<string, string> = {
  "Bold presence": "Turns heads",
  "Moderate presence": "Clear, wearable projection",
  "Soft presence": "Stays close to the skin",
  "Skin-close": "Intimate sillage",
};

/** Pyramid labels → short sensory line. */
const PYRAMID_SHARE: Record<string, string> = {
  "Opening-forward": "Bright openings first",
  "Heart-forward": "Heart notes do the talking",
  "Base-forward": "Lives in the dry-down",
  "Balanced pyramid": "Even from top to base",
};

/**
 * Title-case words for display in generated headlines.
 *
 * Args:
 *   s: Raw token (e.g. mood or family slug).
 *
 * Returns:
 *   Human-readable title case.
 */
export function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Build the main headline for the share card (big terracotta line).
 *
 * Args:
 *   data: Normalized DNA card payload.
 *
 * Returns:
 *   Short, evocative headline for stories / feeds.
 */
export function buildScentDnaShareHeadline(data: ScentDnaCardData): string {
  const arch = data.archetypeLabel.trim();
  if (arch && !GENERIC_ARCHETYPE.test(arch)) {
    return ARCHETYPE_HEADLINE[arch] ?? arch;
  }

  const moods = data.moodBars;
  const fams = data.familyBars;
  const notes = data.openingNoteBars;

  if (moods.length >= 3) {
    return `${titleCaseWords(moods[0].label)}, ${titleCaseWords(moods[1].label)} & ${titleCaseWords(
      moods[2].label,
    )}`;
  }
  if (moods.length === 2) {
    return `${titleCaseWords(moods[0].label)} & ${titleCaseWords(moods[1].label)}`;
  }
  if (moods.length === 1 && fams.length >= 1) {
    return `${titleCaseWords(moods[0].label)} · ${titleCaseWords(fams[0].label)}-first`;
  }
  if (moods.length === 1) {
    return `${titleCaseWords(moods[0].label)} energy`;
  }
  if (fams.length >= 2) {
    return `${titleCaseWords(fams[0].label)} meets ${titleCaseWords(fams[1].label)}`;
  }
  if (fams.length === 1) {
    return `${titleCaseWords(fams[0].label)} at the heart`;
  }
  if (notes.length >= 1) {
    return `${titleCaseWords(notes[0].label)} to start`;
  }
  return "Building my scent map";
}

function rewritePerformanceLabel(label: string): string {
  const t = label.trim();
  return PERFORMANCE_SHARE[t] ?? t;
}

function rewritePyramidLabel(label: string): string {
  const t = label.trim();
  return PYRAMID_SHARE[t] ?? t;
}

/**
 * One supporting line: wear + pyramid, with quiz vs gift framing.
 *
 * Args:
 *   data: DNA card payload.
 *   variant: Quiz self map vs gift flow.
 *
 * Returns:
 *   Single tagline string (may wrap; caller clamps lines in UI).
 */
export function buildScentDnaShareTagline(
  data: ScentDnaCardData,
  variant: "quiz" | "gift",
): string {
  const wear = rewritePerformanceLabel(data.performanceLabel);
  const pyr = rewritePyramidLabel(data.pyramidLabel);
  const core = `${wear} · ${pyr}`;
  if (variant === "gift") {
    return `Gift match · ${core}`;
  }
  return `${core} · Mapped on ScentRev`;
}

/**
 * Truncate a chip label for narrow layouts (share card, email).
 *
 * Args:
 *   label: Display string (already humanized if needed).
 *   maxChars: Max length before ellipsis.
 *
 * Returns:
 *   Shortened single-line label.
 */
export function truncScentDnaChipLabel(label: string, maxChars: number): string {
  const t = label.trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}
