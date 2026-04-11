/**
 * Deterministic wear / occasion / scent-lane → accord language for gift Groq summaries.
 * Mirrors wizard cards (climate, wear moment, gift occasion, current style lanes) so the
 * model gets explicit shopping vocabulary without inventing mismatched notes.
 */

import {
  expandGiftClimateLifestyleForPipeline,
  expandWearOccasionPreset,
  type GiftCurrentScentStyle,
  type GiftScentExperience,
  type GiftWearOccasionPreset,
} from "@/lib/waitlist/giftExtendedProfileMaps";
import type {
  GiftRecipientAgeBand,
  WaitlistGiftAnswersInput,
} from "@/lib/waitlist/giftToQuizPayload";

/** Typical accords / note families to echo in copy for each primary wear context. */
const WEAR_MOMENT_ACCORDS: Record<
  "daily" | "office" | "date_night" | "special_event" | "weekend",
  string[]
> = {
  daily: [
    "fresh citrus",
    "easy musk",
    "soft florals",
    "light woods",
    "versatile skin scents",
  ],
  office: [
    "clean citrus",
    "green tea",
    "soft iris",
    "polished woods",
    "clean musk",
    "minimal powder",
  ],
  date_night: [
    "romantic florals",
    "amber",
    "vanilla skin",
    "soft spices",
    "sandalwood",
  ],
  special_event: [
    "elegant florals",
    "chypre",
    "resins",
    "refined woods",
    "dressy citrus",
  ],
  weekend: [
    "aquatic",
    "casual citrus",
    "relaxed woody",
    "sun-warmed musk",
    "light gourmand",
  ],
};

/** Occasion tilts layered on top of wear moment. */
const GIFT_OCCASION_ACCORDS: Record<
  "birthday" | "anniversary" | "thank_you" | "just_because" | "wedding",
  string[]
> = {
  birthday: ["bright citrus", "playful fruits", "uplifting florals", "sweet sparkle"],
  anniversary: ["skin-close florals", "warm amber", "intimate musk", "soft rose"],
  thank_you: ["polished fresh", "approachable woods", "quiet florals", "clean comfort"],
  just_because: [],
  wedding: ["formal florals", "elegant woods", "ceremonial citrus", "lasting but refined"],
};

/** User-selected “lanes they already like” → accord vocabulary. */
const CURRENT_STYLE_ACCORDS: Record<GiftCurrentScentStyle, string[]> = {
  fresh_clean: ["bergamot", "aquatic", "linen", "green notes", "white musk", "neroli"],
  sweet_gourmand: ["vanilla", "caramel", "praline", "tonka", "honey", "chocolate"],
  woody_spicy: ["cedar", "sandalwood", "pepper", "cardamom", "patchouli", "oud-light"],
  unsure: [],
};

const SCENT_EXPERIENCE_GUIDANCE: Record<GiftScentExperience, string> = {
  never:
    "They rarely wear scent - favour mainstream, inoffensive language (fresh, soft floral, clean musk); avoid niche or polarising notes.",
  sometimes:
    "They wear scent occasionally - moderate complexity is fine if it matches their signals.",
  regularly:
    "They wear fragrance often - richer or more characterful accords are acceptable when aligned with recipient_signals.",
};

/** Catalogue gender lean (search filter) - copy should match without stereotypes beyond shelf norms. */
const RECIPIENT_GENDER_FRAMING: Record<
  WaitlistGiftAnswersInput["recipient_gender"],
  { summary: string; accord_nudges: string[] }
> = {
  men: {
    summary:
      "Masculine-leaning matches - natural hooks include citrus cologne, woods, fougère herbs, amber, vetiver, and clean musk; gourmand or floral still OK if their style lanes say so.",
    accord_nudges: ["bergamot", "cedar", "vetiver", "sage", "tonka wood", "black pepper"],
  },
  women: {
    summary:
      "Feminine-leaning matches - soft florals, fruits, skin musk, iris, and gourmand vanillas are easy anchors; woods and citrus work if their picks lean that way.",
    accord_nudges: ["peony", "pear", "soft rose", "white musk", "soft vanilla", "lily"],
  },
  unisex: {
    summary:
      "Unisex lean - balance citrus, tea, sandalwood, clean musk, and soft florals; do not assume a single gendered lane.",
    accord_nudges: ["neroli", "sandalwood", "green tea", "clean musk", "soft citrus", "soft woods"],
  },
};

const MINOR_COPY_RULE =
  "Recipient is under 18: age-appropriate, non-sensual framing only - cheerful, school- or college-safe projection. Avoid intimate, seductive, or nightlife-only language. Prefer bright citrus, soft fruits, easy musk, light gourmand, and clean florals; skip heavy oud, leather, or mature club language unless recipient_signals clearly include those notes.";

/** Life-stage nudges for copy (overlap with gender + style lanes; never replace them). */
const RECIPIENT_AGE_STAGE_FRAMING: Record<GiftRecipientAgeBand, string> = {
  under_18:
    "Same as minor_copy_rule: cheerful, school-safe; light gourmand OK if signals support; never sensual or club framing.",
  age_18_24:
    "Young adults often explore trendy fresh, playful fruits, and easy gourmand; clean woods, tea, and musk are equally common for him and her. Follow recipient_gender_framing and current_scent_style_lanes, do not assume everyone wants sweet.",
  age_25_34:
    "Working-age versatility: polished citrus, soft florals, tidy woods, skin musk; reserve loud candy-sweet language for clear gourmand or anchor signals.",
  age_35_44:
    "Often appreciates depth: refined woods, iris, soft spice, mature florals; treat heavy dessert gourmand as optional unless their cards or anchors show it.",
  age_45_plus:
    "45+: timeless elegance through vetiver, sandalwood, iris, classic musk, soft leather, chypre-leaning florals; skip juvenile candy framing unless style lanes or anchors clearly want gourmand.",
};

/** Softer wear/occasion accords when wear_moment or occasion skews mature. */
const MINOR_DATE_NIGHT_ACCORDS: string[] = [
  "bright citrus",
  "soft fruits",
  "clean florals",
  "easy musk",
  "light vanilla",
  "playful gourmand",
];

const MINOR_ANNIVERSARY_ACCORDS: string[] = [
  "warm vanilla",
  "soft florals",
  "cozy musk",
  "friendly gourmand",
  "soft woods",
];

const MINOR_OFFICE_ACCORDS: string[] = [
  "clean citrus",
  "green tea",
  "soft musk",
  "light woods",
  "fresh linen",
];

/**
 * One-line “card combo” hints: hard-coded few-shot flavour for common Indian gifting contexts.
 */
const WEAR_OCCASION_PRESET_BLURB: Record<GiftWearOccasionPreset, string> = {
  daily_just_because:
    "Everyday gift: easy-wearing fresh-to-soft-woody accords that never feel try-hard.",
  daily_birthday:
    "Daily wear + celebration: cheerful fresh or fruity lift with a soft, happy dry-down.",
  office_thank_you:
    "Office thank-you: desk-safe - crisp citrus, tea, clean musk, soft woods; skip loud gourmand and heavy oud.",
  office_casual:
    "Workplace daily: polished freshness, quiet florals, or tidy musk - professional sillage.",
  date_anniversary:
    "Date night / anniversary: romantic florals, skin amber, soft vanilla, whisper spices - not club bombs.",
  wedding_big:
    "Wedding or big event: elegant florals, refined woods, lasting but formal - no juvenile candy.",
  weekend_easy:
    "Weekend ease: relaxed citrus, aquatic, casual wood, optional light gourmand.",
  festival_surprise:
    "Festival or surprise: festive brightness - spices, fruits, or celebratory florals with energy.",
};

function dedupeLowerPreservingOrder(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function wearAccordsResolved(
  wearMoment: keyof typeof WEAR_MOMENT_ACCORDS,
  minor: boolean,
): string[] {
  if (minor) {
    if (wearMoment === "date_night") {
      return [...MINOR_DATE_NIGHT_ACCORDS];
    }
    if (wearMoment === "office") {
      return dedupeLowerPreservingOrder([
        ...MINOR_OFFICE_ACCORDS,
        ...WEAR_MOMENT_ACCORDS.office,
      ]);
    }
  }
  return WEAR_MOMENT_ACCORDS[wearMoment] ?? [];
}

function occasionAccordsResolved(
  giftOccasion: keyof typeof GIFT_OCCASION_ACCORDS,
  minor: boolean,
): string[] {
  if (giftOccasion === "just_because") {
    return [];
  }
  if (minor && giftOccasion === "anniversary") {
    return [...MINOR_ANNIVERSARY_ACCORDS];
  }
  if (minor && giftOccasion === "birthday") {
    return dedupeLowerPreservingOrder([
      "bright citrus",
      "playful fruits",
      "uplifting florals",
      ...GIFT_OCCASION_ACCORDS.birthday,
    ]);
  }
  return GIFT_OCCASION_ACCORDS[giftOccasion] ?? [];
}

function minorBlurbForPreset(preset: GiftWearOccasionPreset): string | null {
  if (preset === "date_anniversary") {
    return "Young recipient + special outing: upbeat fresh or soft gourmand - friendly and age-appropriate, not romantic-seductive.";
  }
  if (preset === "office_thank_you" || preset === "office_casual") {
    return "Under-18 + school or internship context: very polite freshness, tea, soft musk - barely-there trail.";
  }
  if (preset === "wedding_big") {
    return "Young recipient at a wedding: elegant but youthful - soft florals or crisp citrus-woods, not heavy mature chypre.";
  }
  return null;
}

/**
 * Build structured accord / context hints from raw gift wizard answers (before anchor merge).
 *
 * Args:
 *   g: Validated gift body from the client.
 *
 * Returns:
 *   JSON-serializable object for the Groq user bundle (``gift_style_hints``).
 */
export function buildGiftGroqStyleHints(g: WaitlistGiftAnswersInput): Record<string, unknown> {
  const cl = expandGiftClimateLifestyleForPipeline(
    g.regional_climate,
    g.climate_lifestyle_preset,
  );
  const minor = g.recipient_age_band === "under_18";
  const gender = RECIPIENT_GENDER_FRAMING[g.recipient_gender];

  const wearAccAll: string[] = [];
  const occAccAll: string[] = [];
  const primaryWo = expandWearOccasionPreset(g.wear_occasion_presets[0]);
  for (const preset of g.wear_occasion_presets) {
    const wo = expandWearOccasionPreset(preset);
    wearAccAll.push(...wearAccordsResolved(wo.wear_moment, minor));
    occAccAll.push(...occasionAccordsResolved(wo.gift_occasion, minor));
  }
  const wearAcc = dedupeLowerPreservingOrder(wearAccAll);
  const occAcc = dedupeLowerPreservingOrder(occAccAll);

  const laneAcc = g.current_scent_styles.flatMap(
    (lane) => CURRENT_STYLE_ACCORDS[lane] ?? [],
  );

  const suggested_accords_for_copy = dedupeLowerPreservingOrder([
    ...wearAcc,
    ...occAcc,
    ...laneAcc,
    ...gender.accord_nudges,
  ]).slice(0, 16);

  const blurbParts = g.wear_occasion_presets
    .map((p) => WEAR_OCCASION_PRESET_BLURB[p] ?? "")
    .filter(Boolean);
  const basePresetBlurb = blurbParts.join(" · ");
  const minorAlts: string[] = [];
  if (minor) {
    const seen = new Set<string>();
    for (const p of g.wear_occasion_presets) {
      const alt = minorBlurbForPreset(p);
      if (alt && !seen.has(alt)) {
        seen.add(alt);
        minorAlts.push(alt);
      }
    }
  }
  const minorAltJoined = minorAlts.length ? minorAlts.join(" ") : null;
  const preset_blurb = minorAltJoined
    ? `${minorAltJoined} General tone: ${basePresetBlurb}`
    : basePresetBlurb;

  const experienceRule = SCENT_EXPERIENCE_GUIDANCE[g.scent_experience];
  const experience_copy_rule = minor
    ? `${MINOR_COPY_RULE} ${experienceRule}`
    : experienceRule;

  const secondaryWo =
    g.wear_occasion_presets.length > 1
      ? expandWearOccasionPreset(g.wear_occasion_presets[1])
      : null;

  return {
    recipient_age_band: g.recipient_age_band,
    recipient_age_stage_framing: RECIPIENT_AGE_STAGE_FRAMING[g.recipient_age_band],
    recipient_gender_lean: g.recipient_gender,
    recipient_gender_framing: gender.summary,
    wear_occasion_cards: [...g.wear_occasion_presets],
    wear_moment: primaryWo.wear_moment,
    gift_occasion: primaryWo.gift_occasion,
    ...(secondaryWo
      ? {
          wear_moment_secondary: secondaryWo.wear_moment,
          gift_occasion_secondary: secondaryWo.gift_occasion,
        }
      : {}),
    regional_climate: g.regional_climate,
    climate_lifestyle_preset: g.climate_lifestyle_preset,
    inferred_personality: cl.personality,
    lifestyle_archetype: cl.lifestyle_archetype,
    current_scent_style_lanes: [...g.current_scent_styles],
    scent_experience: g.scent_experience,
    experience_copy_rule,
    minor_copy_rule: minor ? MINOR_COPY_RULE : null,
    preset_scene_hint: preset_blurb,
    suggested_accords_for_copy,
    reference_wear_accords: wearAcc,
    reference_occasion_accords: occAcc.length ? occAcc : null,
    reference_style_lane_accords: laneAcc.length ? dedupeLowerPreservingOrder(laneAcc) : null,
    reference_gender_accord_nudges: gender.accord_nudges,
  };
}
