/**
 * Plain-language explanation for waitlist quiz / gift results (no KPI scores).
 * Single paragraph fallback when the LLM summary is unavailable.
 */

import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

function humanizeToken(s: string): string {
  return s.replace(/_/g, " ").trim();
}

function formatList(items: string[], max: number): string {
  const cleaned = items.map((x) => humanizeToken(x)).filter(Boolean);
  const slice = cleaned.slice(0, max);
  if (cleaned.length <= max) {
    return slice.join(", ");
  }
  return `${slice.join(", ")}, and more`;
}

export interface WhyThesePicksCopy {
  /** Single prose block when ``ai_summary`` is missing; no bullets. */
  paragraph: string;
}

/**
 * Build shopper-facing copy explaining why picks match quiz answers.
 *
 * Args:
 *   answers: Normalized quiz payload used for matching.
 *   variant: ``quiz`` (second person) vs ``gift`` (recipient-focused).
 *
 * Returns:
 *   One flowing paragraph (always non-empty).
 */
export function buildWhyThesePicksCopy(
  answers: QuizAnswersPayload,
  variant: "quiz" | "gift",
): WhyThesePicksCopy {
  const sentences: string[] = [];

  sentences.push(
    variant === "gift"
      ? "We put this list together from what you told us about them and by matching those signals to real bottles in our library, using ingredient lists, scent families, and when each fragrance tends to work best, not a lucky guess."
      : "We put this list together from what you shared in the quiz and by matching those signals to real bottles in our library, using ingredient lists, scent families, and when each fragrance tends to work best, not a lucky guess.",
  );

  const np = answers.note_preferences ?? {};
  const liked = [
    ...(np.top_notes ?? []),
    ...(np.middle_notes ?? []),
    ...(np.base_notes ?? []),
  ].filter(Boolean);

  if (liked.length) {
    sentences.push(
      variant === "gift"
        ? `You said they enjoy smells like ${formatList(liked, 6)}, so we leaned toward listings that actually feature those kinds of notes.`
        : `You said you enjoy smells like ${formatList(liked, 6)}, so we leaned toward listings that actually feature those kinds of notes.`,
    );
  }

  const fam = answers.scent_families ?? [];
  if (fam.length) {
    sentences.push(
      variant === "gift"
        ? `You steered us toward styles such as ${formatList(fam, 5)}, which helped us keep the lineup feeling like something they would reach for.`
        : `You steered us toward styles such as ${formatList(fam, 5)}, which helped us keep the lineup feeling like you.`,
    );
  }

  const moods = answers.mood_preferences ?? [];
  const occ = answers.preferred_occasions ?? [];
  const seasons = answers.preferred_seasons ?? [];
  const contextBits: string[] = [];
  if (moods.length) {
    contextBits.push(
      variant === "gift"
        ? `the personality you described for them (${formatList(moods, 5)})`
        : `the mood you want (${formatList(moods, 5)})`,
    );
  }
  if (occ.length) {
    contextBits.push(
      variant === "gift"
        ? `the moments you imagined for them (${formatList(occ, 5)})`
        : `the moments you pictured (${formatList(occ, 5)})`,
    );
  }
  if (seasons.length) {
    contextBits.push(
      variant === "gift"
        ? `the seasons you called out (${formatList(seasons, 4)})`
        : `the seasons you chose (${formatList(seasons, 4)})`,
    );
  }
  if (contextBits.length === 1) {
    sentences.push(
      `We also kept ${contextBits[0]} in mind so the suggestions fit everyday life here, including heat and humidity when it matters.`,
    );
  } else if (contextBits.length > 1) {
    const last = contextBits.pop()!;
    sentences.push(
      `We also kept ${contextBits.join(", ")}, and ${last} in mind so the suggestions fit everyday life here, including heat and humidity when it matters.`,
    );
  }

  const br = answers.budget_range?.trim();
  if (br && variant === "quiz") {
    sentences.push(
      `Your budget choice (${humanizeToken(br)}) helped us keep the set in a range that works for you.`,
    );
  }

  const hadConcreteSignals =
    liked.length > 0 ||
    fam.length > 0 ||
    moods.length > 0 ||
    occ.length > 0 ||
    seasons.length > 0 ||
    (br && variant === "quiz");

  if (!hadConcreteSignals) {
    sentences.push(
      variant === "gift"
        ? "Even where you did not spell out specific notes, we still used how strong they like a scent, seasons, occasions, and the rest of your answers to shrink a large catalog down to these names."
        : "Even where you did not spell out specific notes, we still used how strong you like a scent, seasons, occasions, and the rest of your answers to shrink a large catalog down to these names.",
    );
  }

  sentences.push(
    variant === "gift"
      ? "If you want the quickest line-by-line check, each card still has a short why this match blurb for that exact bottle."
      : "If you want the quickest line-by-line check, each card still has a short why this match blurb for that exact bottle, and you can open scent details when you want the full breakdown.",
  );

  return { paragraph: sentences.join(" ") };
}
