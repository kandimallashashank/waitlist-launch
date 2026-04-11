/**
 * Short, shopper-facing match reasons from quiz answers × fragrance metadata.
 */

import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

/** Minimal fragrance fields used to explain a match (no scores). */
export interface FragranceMatchSignals {
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  main_accords?: string[];
  scent_family?: string | null;
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").trim();
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function noteHits(liked: string[], fragNotes: string[]): string[] {
  const fn = fragNotes.map((x) => norm(x)).filter((x) => x.length > 2);
  const out: string[] = [];
  for (const raw of liked) {
    const nl = norm(raw);
    if (nl.length < 3) {
      continue;
    }
    if (fn.some((t) => t.includes(nl) || nl.includes(t))) {
      out.push(humanize(raw));
    }
  }
  return [...new Set(out)];
}

function familyMatchesUser(
  userFamilies: string[],
  scentFamily: string | null | undefined,
): boolean {
  const sf = norm(scentFamily ?? "").replace(/_/g, " ");
  if (!sf || !userFamilies.length) {
    return false;
  }
  for (const f of userFamilies) {
    const fn = norm(f).replace(/_/g, " ");
    if (fn.length < 2) {
      continue;
    }
    if (sf.includes(fn) || fn.includes(sf)) {
      return true;
    }
  }
  return false;
}

/**
 * Produce up to four plain-English lines explaining overlap with quiz answers.
 *
 * Args:
 *   answers: Quiz payload.
 *   frag: Parsed notes, accords, and family from the fragrance row.
 *
 * Returns:
 *   Non-empty list of short reason strings.
 */
export function buildQuizMatchReasons(
  answers: QuizAnswersPayload,
  frag: FragranceMatchSignals,
): string[] {
  const reasons: string[] = [];
  const np = answers.note_preferences ?? {};

  const topH = noteHits(np.top_notes ?? [], frag.notes_top ?? []);
  if (topH.length) {
    reasons.push(`Echoes your top-note picks (${topH.slice(0, 4).join(", ")})`);
  }
  const midH = noteHits(np.middle_notes ?? [], frag.notes_middle ?? []);
  if (midH.length) {
    reasons.push(`Heart notes overlap what you chose (${midH.slice(0, 4).join(", ")})`);
  }
  const baseH = noteHits(np.base_notes ?? [], frag.notes_base ?? []);
  if (baseH.length) {
    reasons.push(`Base aligns with your selections (${baseH.slice(0, 4).join(", ")})`);
  }

  const accords = frag.main_accords ?? [];
  const moodBlob = (answers.mood_preferences ?? []).map(norm).join(" ");
  const accordHits = accords.filter((a) => {
    const an = norm(a);
    return an.length > 2 && moodBlob.includes(an);
  });
  if (accordHits.length) {
    reasons.push(
      `Accords line up with your vibe (${accordHits.slice(0, 3).map(humanize).join(", ")})`,
    );
  }

  const families = answers.scent_families ?? [];
  if (familyMatchesUser(families, frag.scent_family)) {
    reasons.push(
      `Fits a scent family you picked (${humanize(String(frag.scent_family ?? ""))})`,
    );
  }

  if (!reasons.length) {
    reasons.push("High similarity to the way you described what you want");
  }

  return reasons.slice(0, 4);
}
