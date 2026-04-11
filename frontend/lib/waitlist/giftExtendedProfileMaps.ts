/**
 * Gift finder: condensed answers → canonical note buckets, climate, projection.
 * Up to 10 deduped note slugs feed the vector query (see computeGiftTopTenNoteSlugs).
 */

import { QUIZ_NOTE_GROUP_OPTIONS } from "@/lib/waitlist/quizNoteGroupOptions";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

const CANONICAL_NOTE_SLUGS = new Set(
  QUIZ_NOTE_GROUP_OPTIONS.map((o) => o.value),
);

function noteCategory(value: string): "top" | "middle" | "base" | null {
  const opt = QUIZ_NOTE_GROUP_OPTIONS.find((o) => o.value === value);
  return opt?.noteCategory ?? null;
}

/** Quiz personality slugs (aligned with giftToQuizPayload PERSONALITY_BASE). */
export type GiftInferredPersonality =
  | "sophisticate"
  | "charmer"
  | "explorer"
  | "creative"
  | "minimalist";

/**
 * Why each question group exists - informs step subtitles in the gift wizard.
 */
export const GIFT_EXTENDED_CATEGORY_REASONS: Readonly<Record<string, string>> = {
  scent_experience:
    "Wearing frequency sets safe vs adventurous picks and how bold notes can be.",
  current_scent_styles:
    "Pick one, two, or three lanes - we blend them into the note search.",
  avoid_families:
    "Post-search filter: we drop candidates matching any family you tick (or choose “nothing to avoid”).",
  /** Step: where they spend most of the year (maps to humid / dry / AC climate in the pipeline). */
  regional_climate:
    "Heat, monsoon, dry winters, and AC-heavy days wear perfume differently - we bias the search to match.",
  /** Step: eight personality cards; paired with the climate step for the vector pipeline. */
  daily_vibe:
    "Pick the energy that fits them. We blend it with the climate you chose for accords, projection, and note search.",
  climate_lifestyle:
    "Weather where they live plus how they dress and how loud they like to smell - also sets scent family bias.",
  wear_occasion:
    "Pick 1 or 2 cards - where it fits their routine and what you’re celebrating. We merge both into occasion tags and mood.",
};

export type GiftScentExperience = "regularly" | "sometimes" | "never";
export type GiftCurrentScentStyle = "sweet_gourmand" | "fresh_clean" | "woody_spicy" | "unsure";
export type GiftAvoidFamily =
  | "none"
  | "floral"
  | "vanilla_gourmand"
  | "oud_smoky"
  | "powdery"
  | "citrus";

/**
 * Wizard regional step → pipeline ``climate_context`` (humid coastal / dry cold / AC indoor).
 */
export type GiftRegionalClimateSlug = "humid" | "dry_cold" | "ac_indoor";

/**
 * Gift finder personality card (eight options). Stored in API field ``climate_lifestyle_preset``
 * for pipeline compatibility; combined with {@link GiftRegionalClimateSlug} for climate notes.
 */
export type GiftPersonalityPreset =
  | "quiet_introverted"
  | "social_energetic"
  | "warm_romantic"
  | "bold_confident"
  | "natural_grounded"
  | "creative_unique"
  | "elegant_sophisticated"
  | "playful_optimistic";

/** @deprecated Use {@link GiftPersonalityPreset}; kept for docs / legacy JSON in DB. */
export type GiftClimateLifestylePreset = GiftPersonalityPreset;

/** One card: primary wear context + gift occasion. */
export type GiftWearOccasionPreset =
  | "daily_just_because"
  | "daily_birthday"
  | "office_thank_you"
  | "office_casual"
  | "date_anniversary"
  | "wedding_big"
  | "weekend_easy"
  | "festival_surprise";

export type GiftClimateContext = "humid_coastal" | "dry_cold" | "ac_indoor";
export type GiftLifestyleArchetype =
  | "minimal_skin"
  | "minimal_statement"
  | "street_active"
  | "classic_office"
  | "bohemian_evening"
  | "romantic_close";

/** API/client body slice for extended gift signals (climate step + personality step + wear cards). */
export interface GiftExtendedAnswersSlice {
  scent_experience: GiftScentExperience;
  /** One or two lanes to blend (e.g. fresh + woody). */
  current_scent_styles: GiftCurrentScentStyle[];
  /** Multiple avoid families, or ``["none"]`` alone. */
  avoid_families: GiftAvoidFamily[];
  /** Hot humid / dry cold / mostly AC; drives climate note bucket in the pipeline. */
  regional_climate: GiftRegionalClimateSlug;
  /**
   * Personality lane (eight cards). API key name ``climate_lifestyle_preset`` is historical;
   * pipeline pairs this with {@link regional_climate}.
   */
  climate_lifestyle_preset: GiftPersonalityPreset;
  /** One or two distinct wear+occasion cards (merged in the pipeline). */
  wear_occasion_presets: GiftWearOccasionPreset[];
}

/** Maps wizard regional choice to pipeline climate context. */
export const GIFT_REGIONAL_TO_CLIMATE: Record<GiftRegionalClimateSlug, GiftClimateContext> = {
  humid: "humid_coastal",
  dry_cold: "dry_cold",
  ac_indoor: "ac_indoor",
};

const PERSONALITY_LIFESTYLE: Record<
  GiftPersonalityPreset,
  { lifestyle_archetype: GiftLifestyleArchetype; personality: GiftInferredPersonality }
> = {
  quiet_introverted: { lifestyle_archetype: "minimal_skin", personality: "minimalist" },
  social_energetic: { lifestyle_archetype: "street_active", personality: "explorer" },
  warm_romantic: { lifestyle_archetype: "romantic_close", personality: "charmer" },
  bold_confident: { lifestyle_archetype: "bohemian_evening", personality: "creative" },
  natural_grounded: { lifestyle_archetype: "street_active", personality: "minimalist" },
  creative_unique: { lifestyle_archetype: "bohemian_evening", personality: "creative" },
  elegant_sophisticated: { lifestyle_archetype: "minimal_statement", personality: "sophisticate" },
  playful_optimistic: { lifestyle_archetype: "romantic_close", personality: "charmer" },
};

const WEAR_OCCASION_EXPAND: Record<
  GiftWearOccasionPreset,
  { wear_moment: "daily" | "office" | "date_night" | "special_event" | "weekend"; gift_occasion: "birthday" | "anniversary" | "thank_you" | "just_because" | "wedding" }
> = {
  daily_just_because: { wear_moment: "daily", gift_occasion: "just_because" },
  daily_birthday: { wear_moment: "daily", gift_occasion: "birthday" },
  office_thank_you: { wear_moment: "office", gift_occasion: "thank_you" },
  office_casual: { wear_moment: "office", gift_occasion: "just_because" },
  date_anniversary: { wear_moment: "date_night", gift_occasion: "anniversary" },
  wedding_big: { wear_moment: "special_event", gift_occasion: "wedding" },
  weekend_easy: { wear_moment: "weekend", gift_occasion: "just_because" },
  festival_surprise: { wear_moment: "special_event", gift_occasion: "just_because" },
};

/**
 * Combines regional climate with personality card into pipeline climate, archetype, and personality.
 *
 * Args:
 *   regionalClimate: Wizard regional step (humid / dry_cold / ac_indoor).
 *   personalityPreset: One of eight personality cards.
 *
 * Returns:
 *   Climate context, lifestyle archetype, and inferred personality for PERSONALITY_BASE.
 */
export function expandGiftClimateLifestyleForPipeline(
  regionalClimate: GiftRegionalClimateSlug,
  personalityPreset: GiftPersonalityPreset,
): {
  climate_context: GiftClimateContext;
  lifestyle_archetype: GiftLifestyleArchetype;
  personality: GiftInferredPersonality;
} {
  const { lifestyle_archetype, personality } = PERSONALITY_LIFESTYLE[personalityPreset];
  return {
    climate_context: GIFT_REGIONAL_TO_CLIMATE[regionalClimate],
    lifestyle_archetype,
    personality,
  };
}

/**
 * Expands wear+occasion card into pipeline wear_moment and gift_occasion.
 *
 * Args:
 *   preset: Wizard slug from the combined step.
 *
 * Returns:
 *   Wear and occasion keys for WEAR_TO_OCCASIONS / OCCASION_ENRICH.
 */
export function expandWearOccasionPreset(preset: GiftWearOccasionPreset): {
  wear_moment: "daily" | "office" | "date_night" | "special_event" | "weekend";
  gift_occasion: "birthday" | "anniversary" | "thank_you" | "just_because" | "wedding";
} {
  return { ...WEAR_OCCASION_EXPAND[preset] };
}

const SCENT_EXPERIENCE_NOTES: Record<GiftScentExperience, string[]> = {
  regularly: [
    "rose",
    "jasmine",
    "sandalwood",
    "vanilla",
    "bergamot",
    "musk",
    "cedar",
    "patchouli",
    "iris",
    "amber",
  ],
  sometimes: [
    "neroli",
    "lavender",
    "musk",
    "cedar",
    "pear",
    "pink_pepper",
    "lily",
    "tonka",
    "vetiver",
    "marine",
  ],
  never: [
    "bergamot",
    "lemon",
    "lavender",
    "marine",
    "musk",
    "cedar",
    "lily",
    "neroli",
    "aldehydes",
    "pear",
  ],
};

const CURRENT_STYLE_NOTES: Record<GiftCurrentScentStyle, string[]> = {
  sweet_gourmand: [
    "vanilla",
    "tonka",
    "benzoin",
    "peach",
    "raspberry",
    "cinnamon",
    "amber",
    "ylang_ylang",
    "jasmine",
    "pear",
  ],
  fresh_clean: [
    "bergamot",
    "lemon",
    "grapefruit",
    "marine",
    "neroli",
    "lavender",
    "mint",
    "aldehydes",
    "musk",
    "lily",
  ],
  woody_spicy: [
    "cedar",
    "sandalwood",
    "vetiver",
    "patchouli",
    "cardamom",
    "ginger",
    "pink_pepper",
    "oud",
    "leather",
    "tobacco",
  ],
  unsure: [
    "musk",
    "bergamot",
    "rose",
    "cedar",
    "vanilla",
    "marine",
    "sandalwood",
    "jasmine",
    "amber",
    "lavender",
  ],
};

const CLIMATE_NOTES: Record<GiftClimateContext, string[]> = {
  humid_coastal: [
    "marine",
    "grapefruit",
    "bergamot",
    "mint",
    "neroli",
    "lavender",
    "musk",
    "lemon",
    "vetiver",
    "lily",
  ],
  dry_cold: [
    "amber",
    "vanilla",
    "cinnamon",
    "sandalwood",
    "tonka",
    "benzoin",
    "leather",
    "tobacco",
    "patchouli",
    "labdanum",
  ],
  ac_indoor: [
    "iris",
    "musk",
    "cedar",
    "bergamot",
    "neroli",
    "lavender",
    "pink_pepper",
    "vetiver",
    "lily",
    "aldehydes",
  ],
};

const LIFESTYLE_NOTES: Record<GiftLifestyleArchetype, string[]> = {
  minimal_skin: [
    "musk",
    "lily",
    "cedar",
    "bergamot",
    "neroli",
    "lavender",
    "cashmeran",
    "aldehydes",
    "iris",
    "vetiver",
  ],
  minimal_statement: [
    "iris",
    "vetiver",
    "sandalwood",
    "pink_pepper",
    "musk",
    "cedar",
    "amber",
    "labdanum",
    "oakmoss",
    "geranium",
  ],
  street_active: [
    "grapefruit",
    "ginger",
    "marine",
    "mint",
    "vetiver",
    "cedar",
    "musk",
    "lemon",
    "blackcurrant",
    "pink_pepper",
  ],
  classic_office: [
    "lavender",
    "bergamot",
    "neroli",
    "musk",
    "cedar",
    "iris",
    "vetiver",
    "lily",
    "geranium",
    "pink_pepper",
  ],
  bohemian_evening: [
    "patchouli",
    "incense",
    "saffron",
    "ylang_ylang",
    "amber",
    "leather",
    "oud",
    "tuberose",
    "labdanum",
    "vanilla",
  ],
  romantic_close: [
    "rose",
    "jasmine",
    "vanilla",
    "musk",
    "iris",
    "raspberry",
    "tonka",
    "ylang_ylang",
    "sandalwood",
    "amber",
  ],
};

const AVOID_DISLIKED: Record<GiftAvoidFamily, string[]> = {
  none: [],
  floral: ["rose", "jasmine", "tuberose", "ylang_ylang", "lily", "violet"],
  vanilla_gourmand: ["vanilla", "tonka", "benzoin", "peach", "raspberry"],
  oud_smoky: ["oud", "incense", "leather", "tobacco", "patchouli"],
  powdery: ["iris", "violet", "musk", "aldehydes"],
  citrus: ["bergamot", "lemon", "grapefruit", "orange", "neroli"],
};

const LIFESTYLE_PROJECTION: Record<
  GiftLifestyleArchetype,
  {
    preferred_intensity: NonNullable<QuizAnswersPayload["preferred_intensity"]>;
    preferred_longevity: NonNullable<QuizAnswersPayload["preferred_longevity"]>;
    preferred_sillage: string;
  }
> = {
  minimal_skin: {
    preferred_intensity: "light",
    preferred_longevity: "moderate",
    preferred_sillage: "intimate",
  },
  minimal_statement: {
    preferred_intensity: "moderate",
    preferred_longevity: "long",
    preferred_sillage: "moderate",
  },
  street_active: {
    preferred_intensity: "moderate",
    preferred_longevity: "long",
    preferred_sillage: "strong",
  },
  classic_office: {
    preferred_intensity: "light",
    preferred_longevity: "moderate",
    preferred_sillage: "intimate",
  },
  bohemian_evening: {
    preferred_intensity: "strong",
    preferred_longevity: "very_long",
    preferred_sillage: "strong",
  },
  romantic_close: {
    preferred_intensity: "moderate",
    preferred_longevity: "long",
    preferred_sillage: "moderate",
  },
};

const CLIMATE_PAYLOAD: Record<
  GiftClimateContext,
  { climate: NonNullable<QuizAnswersPayload["climate"]>; preferred_seasons: string[] }
> = {
  humid_coastal: { climate: "humid", preferred_seasons: ["summer", "monsoon"] },
  dry_cold: { climate: "cold", preferred_seasons: ["winter"] },
  ac_indoor: { climate: "temperate", preferred_seasons: ["spring", "fall"] },
};

function filterCanonical(slugs: string[]): string[] {
  return slugs.filter((s) => CANONICAL_NOTE_SLUGS.has(s));
}

/**
 * Merges ordered buckets into up to 10 unique canonical note slugs (first-seen wins).
 */
export function mergeGiftNoteBucketsToTopTen(buckets: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bucket of buckets) {
    for (const raw of bucket) {
      const slug = raw.trim();
      if (!CANONICAL_NOTE_SLUGS.has(slug)) {
        continue;
      }
      const k = slug.toLowerCase();
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      out.push(slug);
      if (out.length >= 10) {
        return out;
      }
    }
  }
  return out;
}

export interface GiftTopTenNotesArgs {
  scent_experience: GiftScentExperience;
  current_scent_styles: GiftCurrentScentStyle[];
  climate_context: GiftClimateContext;
  lifestyle_archetype: GiftLifestyleArchetype;
  personalityNoteSlugs: string[];
}

/**
 * Builds priority-ordered buckets then returns top 10 deduped canonical notes.
 */
export function computeGiftTopTenNoteSlugs(args: GiftTopTenNotesArgs): string[] {
  const ordered: string[][] = [];
  for (const style of args.current_scent_styles) {
    ordered.push(filterCanonical(CURRENT_STYLE_NOTES[style]));
  }
  ordered.push(
    filterCanonical(SCENT_EXPERIENCE_NOTES[args.scent_experience]),
    filterCanonical(CLIMATE_NOTES[args.climate_context]),
    filterCanonical(LIFESTYLE_NOTES[args.lifestyle_archetype]),
    filterCanonical(args.personalityNoteSlugs),
  );
  return mergeGiftNoteBucketsToTopTen(ordered);
}

export function splitGiftSlugsIntoPyramid(slugs: string[]): {
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
} {
  const top_notes: string[] = [];
  const middle_notes: string[] = [];
  const base_notes: string[] = [];
  for (const s of slugs) {
    const cat = noteCategory(s);
    if (cat === "top") {
      top_notes.push(s);
    } else if (cat === "middle") {
      middle_notes.push(s);
    } else if (cat === "base") {
      base_notes.push(s);
    }
  }
  return { top_notes, middle_notes, base_notes };
}

/**
 * Merges disliked note tokens from multiple avoid choices (deduped).
 * ``["none"]`` or empty yields no dislikes.
 */
export function giftAvoidFamiliesToDislikedNotes(
  families: GiftAvoidFamily[],
): string[] {
  if (!families.length) {
    return [];
  }
  if (families.length === 1 && families[0] === "none") {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of families) {
    if (f === "none") {
      continue;
    }
    for (const d of AVOID_DISLIKED[f] ?? []) {
      const k = d.toLowerCase();
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      out.push(d);
    }
  }
  return out;
}

export function giftClimateToPayloadFields(ctx: GiftClimateContext): {
  climate: NonNullable<QuizAnswersPayload["climate"]>;
  preferred_seasons: string[];
} {
  return { ...CLIMATE_PAYLOAD[ctx] };
}

export function giftLifestyleToProjectionFields(arch: GiftLifestyleArchetype): {
  preferred_intensity: NonNullable<QuizAnswersPayload["preferred_intensity"]>;
  preferred_longevity: NonNullable<QuizAnswersPayload["preferred_longevity"]>;
  preferred_sillage: string;
} {
  return { ...LIFESTYLE_PROJECTION[arch] };
}
