/**
 * Maps waitlist gift-quiz answers into ``QuizAnswersPayload`` for the shared
 * Supabase vector + scoring pipeline. Gift runs persist to ``waitlist_gift_preferences``, not quiz prefs.
 * Optional ``anchor_perfume_ids`` are merged server-side from catalogue notes (quiz step 2 parity).
 * Ten-step wizard: recipient age band, gender, optional anchors, scent signals, climate, vibe,
 * wear+occasion (1–2 cards), budget.
 */

import {
  computeGiftTopTenNoteSlugs,
  expandGiftClimateLifestyleForPipeline,
  expandWearOccasionPreset,
  giftAvoidFamiliesToDislikedNotes,
  giftClimateToPayloadFields,
  giftLifestyleToProjectionFields,
  splitGiftSlugsIntoPyramid,
  type GiftAvoidFamily,
  type GiftCurrentScentStyle,
  type GiftExtendedAnswersSlice,
  type GiftInferredPersonality,
  type GiftPersonalityPreset,
  type GiftRegionalClimateSlug,
  type GiftWearOccasionPreset,
} from "@/lib/waitlist/giftExtendedProfileMaps";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

const ANCHOR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Age band for copy + pipeline tagging. Under-18 keeps minor-safe Groq rules; adult
 * brackets align with ForYou ``age_group`` buckets (18-24, 25-34, 35-44, 45-54).
 */
export type GiftRecipientAgeBand =
  | "under_18"
  | "age_18_24"
  | "age_25_34"
  | "age_35_44"
  | "age_45_plus";

/** Client / API body: gift flow + optional anchor perfume IDs (max 5). */
export interface WaitlistGiftAnswersInput extends GiftExtendedAnswersSlice {
  recipient_age_band: GiftRecipientAgeBand;
  recipient_gender: "men" | "women" | "unisex";
  anchor_perfume_ids?: string[];
  budget: "budget" | "mid" | "premium" | "luxury" | "no_limit";
}

const RECIPIENT_AGE_BAND_SET = new Set<string>([
  "under_18",
  "age_18_24",
  "age_25_34",
  "age_35_44",
  "age_45_plus",
  /** Legacy binary quiz: map to ``age_25_34`` in normalize. */
  "18_and_over",
]);

/**
 * Normalize API age band (legacy ``18_and_over`` → ``age_25_34``; unknown → ``age_25_34``).
 *
 * Args:
 *   raw: Request field or undefined.
 *
 * Returns:
 *   Canonical band slug.
 */
export function normalizeGiftRecipientAgeBand(
  raw: unknown,
): GiftRecipientAgeBand {
  if (raw === "under_18") {
    return "under_18";
  }
  if (raw === "age_18_24") {
    return "age_18_24";
  }
  if (raw === "age_25_34") {
    return "age_25_34";
  }
  if (raw === "age_35_44") {
    return "age_35_44";
  }
  if (raw === "age_45_plus") {
    return "age_45_plus";
  }
  if (raw === "18_and_over") {
    return "age_25_34";
  }
  return "age_25_34";
}

/**
 * Map recipient band to quiz pipeline ``age_group`` (ForYou-compatible buckets for adults).
 *
 * Args:
 *   band: Canonical gift age band.
 *
 * Returns:
 *   Pipeline age slug (``under_18`` or ForYou-style ranges).
 */
export function giftRecipientAgeBandToQuizAgeGroup(
  band: GiftRecipientAgeBand,
): string {
  switch (band) {
    case "under_18":
      return "under_18";
    case "age_18_24":
      return "18-24";
    case "age_25_34":
      return "25-34";
    case "age_35_44":
      return "35-44";
    case "age_45_plus":
      return "45-54";
    default: {
      const _exhaustive: never = band;
      throw new Error(`Unhandled age band: ${String(_exhaustive)}`);
    }
  }
}

const WEAR_TO_OCCASIONS: Record<string, string[]> = {
  daily: ["everyday", "daily wear"],
  office: ["office", "work"],
  date_night: ["date night", "evening"],
  special_event: ["special occasions", "formal"],
  weekend: ["weekend", "casual"],
};

const OCCASION_ENRICH: Record<
  string,
  { occasions: string[]; moods: string[] }
> = {
  birthday: { occasions: ["celebration"], moods: ["joyful", "celebratory"] },
  anniversary: { occasions: ["romantic evening"], moods: ["romantic", "intimate"] },
  thank_you: { occasions: ["gratitude gift"], moods: ["warm", "approachable"] },
  just_because: { occasions: ["everyday surprise"], moods: ["thoughtful", "personal"] },
  wedding: { occasions: ["wedding", "formal event"], moods: ["elegant", "memorable"] },
};

const PERSONALITY_BASE: Record<string, Omit<QuizAnswersPayload, "budget_range">> = {
  sophisticate: {
    scent_families: ["woody", "chypre", "aromatic"],
    note_preferences: {
      top_notes: ["bergamot"],
      middle_notes: ["iris"],
      base_notes: ["sandalwood", "vetiver"],
    },
    mood_preferences: ["refined", "polished"],
    preferred_intensity: "moderate",
    preferred_longevity: "long",
  },
  charmer: {
    scent_families: ["floral", "fruity", "gourmand"],
    note_preferences: {
      top_notes: ["pink_pepper"],
      middle_notes: ["rose", "jasmine"],
      base_notes: ["vanilla", "musk"],
    },
    mood_preferences: ["warm", "inviting"],
    preferred_intensity: "moderate",
    preferred_longevity: "moderate",
  },
  explorer: {
    scent_families: ["spicy", "woody", "oriental"],
    note_preferences: {
      top_notes: ["ginger", "grapefruit"],
      middle_notes: ["saffron", "oud"],
      base_notes: ["patchouli", "cedar"],
    },
    mood_preferences: ["bold", "adventurous"],
    preferred_intensity: "strong",
    preferred_longevity: "long",
  },
  creative: {
    scent_families: ["oriental", "gourmand", "smoky"],
    note_preferences: {
      top_notes: ["cardamom"],
      middle_notes: ["incense", "ylang_ylang"],
      base_notes: ["amber", "leather"],
    },
    mood_preferences: ["artistic", "expressive"],
    preferred_intensity: "strong",
    preferred_longevity: "very_long",
  },
  minimalist: {
    scent_families: ["fresh", "citrus", "musky"],
    note_preferences: {
      top_notes: ["neroli", "bergamot"],
      middle_notes: ["lily"],
      base_notes: ["musk", "cedar"],
    },
    mood_preferences: ["clean", "understated"],
    preferred_intensity: "light",
    preferred_longevity: "moderate",
  },
};

const RECIPIENT_SET = new Set(["men", "women", "unisex"]);
const BUDGET_SET = new Set([
  "budget",
  "mid",
  "premium",
  "luxury",
  "no_limit",
]);

const SCENT_EXPERIENCE_SET = new Set(["regularly", "sometimes", "never"]);
const CURRENT_STYLE_SET = new Set<string>([
  "sweet_gourmand",
  "fresh_clean",
  "woody_spicy",
  "unsure",
]);
const AVOID_FAMILY_SET = new Set<string>([
  "none",
  "floral",
  "vanilla_gourmand",
  "oud_smoky",
  "powdery",
  "citrus",
]);
const GIFT_PERSONALITY_PRESET_SET = new Set<string>([
  "quiet_introverted",
  "social_energetic",
  "warm_romantic",
  "bold_confident",
  "natural_grounded",
  "creative_unique",
  "elegant_sophisticated",
  "playful_optimistic",
]);

const GIFT_REGIONAL_CLIMATE_SET = new Set<string>(["humid", "dry_cold", "ac_indoor"]);

/** Old combined climate+vibe slugs → current ``regional_climate`` + personality preset. */
const LEGACY_CLIMATE_LIFESTYLE_TO_CURRENT: Record<
  string,
  { regional_climate: GiftRegionalClimateSlug; climate_lifestyle_preset: GiftPersonalityPreset }
> = {
  humid_minimal: { regional_climate: "humid", climate_lifestyle_preset: "quiet_introverted" },
  humid_social: { regional_climate: "humid", climate_lifestyle_preset: "social_energetic" },
  humid_romantic: { regional_climate: "humid", climate_lifestyle_preset: "warm_romantic" },
  dry_polished: { regional_climate: "dry_cold", climate_lifestyle_preset: "elegant_sophisticated" },
  dry_bold: { regional_climate: "dry_cold", climate_lifestyle_preset: "bold_confident" },
  ac_refined: { regional_climate: "ac_indoor", climate_lifestyle_preset: "elegant_sophisticated" },
  ac_warm: { regional_climate: "ac_indoor", climate_lifestyle_preset: "social_energetic" },
  ac_active: { regional_climate: "ac_indoor", climate_lifestyle_preset: "social_energetic" },
};

/**
 * Mutates a shallow copy of gift answers: maps legacy ``climate_lifestyle_preset`` when needed.
 */
function coerceLegacyGiftClimateFields(o: Record<string, unknown>): void {
  const preset = o.climate_lifestyle_preset;
  if (typeof preset !== "string") {
    return;
  }
  if (GIFT_PERSONALITY_PRESET_SET.has(preset)) {
    return;
  }
  const mapped = LEGACY_CLIMATE_LIFESTYLE_TO_CURRENT[preset];
  if (!mapped) {
    return;
  }
  const reg = o.regional_climate;
  if (typeof reg !== "string" || !GIFT_REGIONAL_CLIMATE_SET.has(reg)) {
    o.regional_climate = mapped.regional_climate;
  }
  o.climate_lifestyle_preset = mapped.climate_lifestyle_preset;
}
const WEAR_OCCASION_PRESET_SET = new Set([
  "daily_just_because",
  "daily_birthday",
  "office_thank_you",
  "office_casual",
  "date_anniversary",
  "wedding_big",
  "weekend_easy",
  "festival_surprise",
]);

function isValidCurrentScentStyles(raw: unknown): raw is GiftCurrentScentStyle[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 3) {
    return false;
  }
  return raw.every(
    (x): x is GiftCurrentScentStyle =>
      typeof x === "string" && CURRENT_STYLE_SET.has(x),
  );
}

/**
 * Parses wear+occasion from the request body. Accepts ``wear_occasion_presets`` (1–2)
 * or legacy single ``wear_occasion_preset``.
 */
function normalizeWearOccasionPresetsFromBody(
  o: Record<string, unknown>,
): GiftWearOccasionPreset[] | null {
  if (Array.isArray(o.wear_occasion_presets)) {
    const xs = o.wear_occasion_presets;
    if (xs.length < 1 || xs.length > 2) {
      return null;
    }
    const seen = new Set<string>();
    for (const x of xs) {
      if (typeof x !== "string" || !WEAR_OCCASION_PRESET_SET.has(x)) {
        return null;
      }
      if (seen.has(x)) {
        return null;
      }
      seen.add(x);
    }
    return xs as GiftWearOccasionPreset[];
  }
  if (
    typeof o.wear_occasion_preset === "string" &&
    WEAR_OCCASION_PRESET_SET.has(o.wear_occasion_preset)
  ) {
    return [o.wear_occasion_preset as GiftWearOccasionPreset];
  }
  return null;
}

function isValidAvoidFamilies(raw: unknown): raw is GiftAvoidFamily[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 6) {
    return false;
  }
  const xs = raw.filter((x): x is string => typeof x === "string");
  if (xs.length !== raw.length) {
    return false;
  }
  if (!xs.every((x) => AVOID_FAMILY_SET.has(x))) {
    return false;
  }
  if (xs.includes("none") && xs.length > 1) {
    return false;
  }
  return true;
}

function flattenPersonalityNoteSlugs(personality: GiftInferredPersonality): string[] {
  const np = PERSONALITY_BASE[personality].note_preferences ?? {};
  return [
    ...(np.top_notes ?? []),
    ...(np.middle_notes ?? []),
    ...(np.base_notes ?? []),
  ];
}

export function normalizeGiftAnchorPerfumeIds(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") {
      continue;
    }
    const t = x.trim();
    if (!ANCHOR_UUID_RE.test(t)) {
      continue;
    }
    if (!out.includes(t)) {
      out.push(t);
    }
    if (out.length >= 5) {
      break;
    }
  }
  return out;
}

function giftAnchorFieldValid(raw: unknown): boolean {
  if (raw === undefined || raw === null) {
    return true;
  }
  if (!Array.isArray(raw) || raw.length > 5) {
    return false;
  }
  for (const x of raw) {
    if (typeof x !== "string" || !ANCHOR_UUID_RE.test(x.trim())) {
      return false;
    }
  }
  return true;
}

function giftAnswersRecordValid(o: Record<string, unknown>): boolean {
  if (!giftAnchorFieldValid(o.anchor_perfume_ids)) {
    return false;
  }
  const ageOk =
    o.recipient_age_band === undefined ||
    o.recipient_age_band === null ||
    (typeof o.recipient_age_band === "string" &&
      RECIPIENT_AGE_BAND_SET.has(o.recipient_age_band));
  return (
    ageOk &&
    typeof o.recipient_gender === "string" &&
    RECIPIENT_SET.has(o.recipient_gender) &&
    typeof o.scent_experience === "string" &&
    SCENT_EXPERIENCE_SET.has(o.scent_experience) &&
    isValidCurrentScentStyles(o.current_scent_styles) &&
    isValidAvoidFamilies(o.avoid_families) &&
    typeof o.regional_climate === "string" &&
    GIFT_REGIONAL_CLIMATE_SET.has(o.regional_climate) &&
    typeof o.climate_lifestyle_preset === "string" &&
    GIFT_PERSONALITY_PRESET_SET.has(o.climate_lifestyle_preset) &&
    normalizeWearOccasionPresetsFromBody(o) !== null &&
    typeof o.budget === "string" &&
    BUDGET_SET.has(o.budget)
  );
}

/**
 * Returns a normalized answers object, or null. Maps legacy combined vibe slugs when needed.
 */
export function normalizeWaitlistGiftAnswersRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = { ...(value as Record<string, unknown>) };
  coerceLegacyGiftClimateFields(o);
  if (!giftAnswersRecordValid(o)) {
    return null;
  }
  return o;
}

export function isWaitlistGiftAnswersInput(
  value: unknown,
): value is WaitlistGiftAnswersInput {
  return normalizeWaitlistGiftAnswersRecord(value) !== null;
}

export function parseWaitlistGiftAnswersInput(
  value: unknown,
): WaitlistGiftAnswersInput | null {
  const o = normalizeWaitlistGiftAnswersRecord(value);
  if (!o) {
    return null;
  }
  return {
    recipient_age_band: normalizeGiftRecipientAgeBand(o.recipient_age_band),
    recipient_gender: o.recipient_gender as WaitlistGiftAnswersInput["recipient_gender"],
    anchor_perfume_ids: normalizeGiftAnchorPerfumeIds(o.anchor_perfume_ids),
    scent_experience: o.scent_experience as WaitlistGiftAnswersInput["scent_experience"],
    current_scent_styles: [...(o.current_scent_styles as GiftCurrentScentStyle[])],
    avoid_families: [...(o.avoid_families as GiftAvoidFamily[])],
    regional_climate: o.regional_climate as GiftRegionalClimateSlug,
    climate_lifestyle_preset: o.climate_lifestyle_preset as GiftPersonalityPreset,
    wear_occasion_presets: normalizeWearOccasionPresetsFromBody(o)!,
    budget: o.budget as WaitlistGiftAnswersInput["budget"],
  };
}

/**
 * Converts validated gift answers into the quiz pipeline payload.
 */
export function waitlistGiftAnswersToQuizPayload(
  g: WaitlistGiftAnswersInput,
): QuizAnswersPayload {
  const cl = expandGiftClimateLifestyleForPipeline(
    g.regional_climate,
    g.climate_lifestyle_preset,
  );
  const personality = cl.personality;
  const base = PERSONALITY_BASE[personality];
  const { note_preferences: _np, ...personalityWithoutNotes } = base;
  const occasionParts: string[] = [];
  const moodEnrichParts: string[] = [];
  for (const preset of g.wear_occasion_presets) {
    const wo = expandWearOccasionPreset(preset);
    occasionParts.push(...(WEAR_TO_OCCASIONS[wo.wear_moment] ?? []));
    const enrich = OCCASION_ENRICH[wo.gift_occasion] ?? {
      occasions: [] as string[],
      moods: [] as string[],
    };
    occasionParts.push(...enrich.occasions);
    moodEnrichParts.push(...enrich.moods);
  }
  const preferred_occasions = occasionParts;
  const mood_preferences = [...(base.mood_preferences ?? []), ...moodEnrichParts];
  const seen = new Set<string>();
  const dedupe = (xs: string[]): string[] =>
    xs.filter((x) => {
      const k = x.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const topTen = computeGiftTopTenNoteSlugs({
    scent_experience: g.scent_experience,
    current_scent_styles: g.current_scent_styles,
    climate_context: cl.climate_context,
    lifestyle_archetype: cl.lifestyle_archetype,
    personalityNoteSlugs: flattenPersonalityNoteSlugs(personality),
  });
  const pyramid = splitGiftSlugsIntoPyramid(topTen);
  const projection = giftLifestyleToProjectionFields(cl.lifestyle_archetype);
  const climateFields = giftClimateToPayloadFields(cl.climate_context);
  const disliked = giftAvoidFamiliesToDislikedNotes(g.avoid_families);

  return {
    ...personalityWithoutNotes,
    ...projection,
    preferred_gender: g.recipient_gender,
    budget_range: g.budget,
    preferred_occasions: dedupe(preferred_occasions),
    mood_preferences: dedupe(mood_preferences),
    experience_level: null,
    age_group: giftRecipientAgeBandToQuizAgeGroup(g.recipient_age_band),
    climate: climateFields.climate,
    preferred_seasons: [...climateFields.preferred_seasons],
    note_preferences: {
      top_notes: pyramid.top_notes,
      middle_notes: pyramid.middle_notes,
      base_notes: pyramid.base_notes,
      disliked_notes: disliked,
    },
  };
}
