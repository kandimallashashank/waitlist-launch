/**
 * Derive For You quiz note + scent-family selections from 1–5 anchor perfumes
 * (cold start: user picks known bottles; we map catalogue text to quiz slugs).
 */

/** Minimal shape for note slug matching (same labels/values as ForYouWizard NOTE_GROUP_OPTIONS). */
export type NoteSlugOption = { value: string; label: string };

export interface QuizCatalogPerfume {
  id: string;
  name?: string | null;
  brand_name?: string | null;
  primary_image_url?: string | null;
  notes_top?: string | string[] | null;
  notes_middle?: string | string[] | null;
  notes_base?: string | null;
  scent_family?: string | null;
  main_accords?: string[] | null;
}

/** Quiz scent-family slug (aligned with ForYouWizard SCENT_FAMILY_OPTIONS). */
const FAMILY_RULES: { slug: string; test: (s: string) => boolean }[] = [
  { slug: "fresh", test: (s) => /\b(fresh|clean|airy|light)\b/i.test(s) },
  { slug: "citrus", test: (s) => /\b(citrus|lemon|bergamot|orange|grapefruit|mandarin|lime)\b/i.test(s) },
  { slug: "aquatic", test: (s) => /\b(aquatic|marine|water|ocean|sea)\b/i.test(s) },
  { slug: "ozonic", test: (s) => /\b(ozonic|atmospheric)\b/i.test(s) },
  { slug: "green", test: (s) => /\b(green|herbal|galbanum|leaf)\b/i.test(s) },
  { slug: "white_floral", test: (s) => /\b(white\s*floral|tuberose|gardenia)\b/i.test(s) },
  { slug: "floral", test: (s) => /\b(floral|flower|bouquet)\b/i.test(s) },
  { slug: "fruity", test: (s) => /\b(fruity|fruit|berry|peach|apple|pear)\b/i.test(s) },
  { slug: "aromatic", test: (s) => /\b(aromatic|herbal|lavender|sage|aroma)\b/i.test(s) },
  { slug: "spicy", test: (s) => /\b(spicy|spice|pepper|cardamom|cinnamon|clove)\b/i.test(s) },
  { slug: "woody", test: (s) => /\b(woody|wood|cedar|sandal|vetiver|guaiac)\b/i.test(s) },
  { slug: "fougere", test: (s) => /\b(foug[eè]re)\b/i.test(s) },
  { slug: "chypre", test: (s) => /\b(chypre)\b/i.test(s) },
  { slug: "oriental", test: (s) => /\b(oriental|amber|balsamic|resin)\b/i.test(s) },
  { slug: "amber", test: (s) => /\b(warm\s*amber|amber\b)/i.test(s) },
  { slug: "gourmand", test: (s) => /\b(gourmand|gourmandise|edible|vanilla\s*gourmand)\b/i.test(s) },
  { slug: "sweet", test: (s) => /\b(sweet|candy|caramel|honey)\b/i.test(s) },
  { slug: "powdery", test: (s) => /\b(powdery|powder|iris|orris)\b/i.test(s) },
  { slug: "musky", test: (s) => /\b(musk|musky|skin)\b/i.test(s) },
  { slug: "leather", test: (s) => /\b(leather|suede)\b/i.test(s) },
  { slug: "smoky", test: (s) => /\b(smoky|smoke|incense|birch\s*tar)\b/i.test(s) },
  { slug: "earthy", test: (s) => /\b(earthy|earth|soil|patchouli\s*earth)\b/i.test(s) },
  { slug: "aldehydic", test: (s) => /\b(aldehyd|soapy|soap)\b/i.test(s) },
];

function notesFieldToTokens(raw: string | string[] | null | undefined): string[] {
  if (raw == null) return [];
  const s = Array.isArray(raw) ? raw.join(", ") : String(raw);
  return s
    .split(/[,;/|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Map a single note phrase to a quiz note slug using option metadata.
 *
 * Args:
 *   phrase: Raw fragment from DB (e.g. "Pink Pepper", "Marine Notes").
 *   options: NOTE_GROUP_OPTIONS from the wizard.
 *
 * Returns:
 *   Matching slug or null.
 */
export function mapPhraseToNoteSlug(phrase: string, options: readonly NoteSlugOption[]): string | null {
  const t = phrase.toLowerCase().trim().replace(/\s+/g, " ");
  if (!t) return null;

  const normalizedUnderscore = t.replace(/\s+/g, "_");
  const byValue = options.find((o) => o.value === normalizedUnderscore);
  if (byValue) return byValue.value;

  const sorted = [...options].sort((a, b) => b.label.length - a.label.length);
  for (const o of sorted) {
    const lab = o.label.toLowerCase();
    const labParts = lab.split(/[/\s]+/).filter((p) => p.length > 2);
    if (t === o.value.replace(/_/g, " ")) return o.value;
    if (labParts.some((p) => t.includes(p)) || t.includes(o.value.replace(/_/g, " "))) {
      return o.value;
    }
  }

  for (const o of options) {
    if (t.includes(o.value.replace(/_/g, " "))) return o.value;
  }

  return null;
}

function inferFamilySlugsFromText(blob: string): string[] {
  const s = blob.toLowerCase();
  const out: string[] = [];
  for (const { slug, test } of FAMILY_RULES) {
    if (test(s)) out.push(slug);
  }
  return out;
}

function scoreMap<T extends string>(keys: T[], limit: number): T[] {
  const counts = new Map<T, number>();
  for (const k of keys) {
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/**
 * Aggregate liked note slugs and scent families from selected catalogue rows.
 *
 * Args:
 *   perfumeIds: 1–5 perfume ids the user selected.
 *   byId: Map of id -> row (from /fragrances list).
 *   noteOptions: NOTE_GROUP_OPTIONS from ForYouWizard.
 *   maxNotes: Cap for liked note chips (default 8).
 *   maxFamilies: Cap for scent family chips (default 6).
 *
 * Returns:
 *   Derived `likedNotes` and `scentFamilies` slug arrays.
 */
export function deriveQuizFromAnchorPerfumes(
  perfumeIds: string[],
  byId: Map<string, QuizCatalogPerfume>,
  noteOptions: readonly NoteSlugOption[],
  maxNotes = 8,
  maxFamilies = 6,
): { likedNotes: string[]; scentFamilies: string[] } {
  const noteHits: string[] = [];
  const familyHits: string[] = [];

  for (const id of perfumeIds) {
    const row = byId.get(id);
    if (!row) continue;

    const top = notesFieldToTokens(row.notes_top);
    const mid = notesFieldToTokens(row.notes_middle);
    const base = notesFieldToTokens(row.notes_base);
    for (const phrase of [...top, ...mid, ...base]) {
      const slug = mapPhraseToNoteSlug(phrase, noteOptions);
      if (slug) noteHits.push(slug);
    }

    if (row.scent_family) {
      familyHits.push(...inferFamilySlugsFromText(row.scent_family));
    }
    const acc = row.main_accords;
    if (Array.isArray(acc)) {
      for (const a of acc) {
        if (typeof a === "string") familyHits.push(...inferFamilySlugsFromText(a));
      }
    }

  }

  const likedNotesCapped = scoreMap(noteHits, maxNotes);
  const scentFamiliesCapped = scoreMap(familyHits, maxFamilies);

  return {
    likedNotes: likedNotesCapped,
    scentFamilies: scentFamiliesCapped,
  };
}
