/**
 * Merges optional anchor perfume catalogue rows into a gift ``QuizAnswersPayload``
 * (same derivation as quiz step 2) so embeddings and filters reflect known favourites.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deriveQuizFromAnchorPerfumes,
  type QuizCatalogPerfume,
} from "@/lib/quizAnchorDerivation";
import { QUIZ_NOTE_GROUP_OPTIONS } from "@/lib/waitlist/quizNoteGroupOptions";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function splitNotePreferences(selectedNotes: string[]): {
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
} {
  const top_notes: string[] = [];
  const middle_notes: string[] = [];
  const base_notes: string[] = [];

  for (const value of selectedNotes) {
    const option = QUIZ_NOTE_GROUP_OPTIONS.find((item) => item.value === value);
    if (!option) continue;
    if (option.noteCategory === "top") top_notes.push(value);
    if (option.noteCategory === "middle") middle_notes.push(value);
    if (option.noteCategory === "base") base_notes.push(value);
  }

  return { top_notes, middle_notes, base_notes };
}

function dedupeLower(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function mergeNoteLists(a: string[] | undefined, b: string[] | undefined): string[] {
  return dedupeLower([...(a ?? []), ...(b ?? [])]);
}

/**
 * Loads anchor perfumes from Supabase and merges derived notes + families into the payload.
 *
 * Args:
 *   supabase: Service-role client.
 *   payload: Base gift payload (personality + occasion + gender + budget).
 *   anchorPerfumeIds: Up to 5 UUIDs; invalid IDs skipped.
 *
 * Returns:
 *   Updated payload with union of anchor-derived and personality note_preferences / families.
 */
export async function mergeGiftAnchorPerfumesIntoPayload(
  supabase: SupabaseClient,
  payload: QuizAnswersPayload,
  anchorPerfumeIds: string[],
): Promise<QuizAnswersPayload> {
  const ids = [...new Set(anchorPerfumeIds.map((x) => String(x).trim()))]
    .filter((id) => UUID_RE.test(id))
    .slice(0, 5);

  if (!ids.length) {
    return payload;
  }

  const { data, error } = await supabase
    .from("perfumes")
    .select(
      "id, name, brand_name, notes_top, notes_middle, notes_base, scent_family, main_accords, primary_image_url",
    )
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    console.warn("gift anchor fetch:", error.message);
    return payload;
  }

  const rows = data ?? [];
  if (!rows.length) {
    return payload;
  }

  const byId = new Map<string, QuizCatalogPerfume>();
  for (const row of rows) {
    const id = row.id != null ? String(row.id) : "";
    if (!id) continue;
    const baseRaw = row.notes_base;
    const notesBaseNorm =
      Array.isArray(baseRaw)
        ? baseRaw.filter((x): x is string => typeof x === "string").join(", ")
        : typeof baseRaw === "string"
          ? baseRaw
          : null;

    byId.set(id, {
      id,
      name: typeof row.name === "string" ? row.name : null,
      brand_name: typeof row.brand_name === "string" ? row.brand_name : null,
      primary_image_url:
        typeof row.primary_image_url === "string" ? row.primary_image_url : null,
      notes_top: row.notes_top as string | string[] | null | undefined,
      notes_middle: row.notes_middle as string | string[] | null | undefined,
      notes_base: notesBaseNorm,
      scent_family: typeof row.scent_family === "string" ? row.scent_family : null,
      main_accords: Array.isArray(row.main_accords)
        ? row.main_accords.filter((x): x is string => typeof x === "string")
        : null,
    });
  }

  const orderedIds = ids.filter((id) => byId.has(id));
  if (!orderedIds.length) {
    return payload;
  }

  const derived = deriveQuizFromAnchorPerfumes(
    orderedIds,
    byId,
    QUIZ_NOTE_GROUP_OPTIONS,
    10,
    8,
  );
  const anchorNp = splitNotePreferences(derived.likedNotes);
  const existing = payload.note_preferences ?? {};

  return {
    ...payload,
    scent_families: mergeNoteLists(payload.scent_families, derived.scentFamilies),
    note_preferences: {
      ...existing,
      disliked_notes: existing.disliked_notes ?? [],
      top_notes: mergeNoteLists(existing.top_notes, anchorNp.top_notes),
      middle_notes: mergeNoteLists(existing.middle_notes, anchorNp.middle_notes),
      base_notes: mergeNoteLists(existing.base_notes, anchorNp.base_notes),
    },
  };
}
