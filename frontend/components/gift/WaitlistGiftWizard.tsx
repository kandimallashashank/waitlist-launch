"use client";

/**
 * Waitlist pilot gift finder: ten steps (gender, optional anchors, scent signals, regional climate,
 * daily vibe, wear+occasion, recipient age band, budget). Same vector pipeline as the scent quiz.
 *
 * Option photos are from Unsplash (https://unsplash.com/license); copy is tuned for Indian gifting,
 * climate, and social contexts while keeping API `value` slugs stable.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Gift, Sparkles } from "lucide-react";

import type { WaitlistQuizSuccessPayload } from "@/components/for-you/ForYouWizard";
import { QuizAnchorPerfumePicker } from "@/components/for-you/QuizAnchorPerfumePicker";
import { QuizLoadingScreen, type QuizLoadingPerfumeImage } from "@/components/for-you/QuizLoadingScreen";
import {
  TypeA,
  TypeB,
  TypeC,
  TypeF,
  type QuizOption,
} from "@/components/for-you/QuizQuestionTypes";
import type { QuizCatalogPerfume } from "@/lib/quizAnchorDerivation";
import {
  GIFT_EXTENDED_CATEGORY_REASONS,
  type GiftPersonalityPreset,
  type GiftRegionalClimateSlug,
  type GiftWearOccasionPreset,
} from "@/lib/waitlist/giftExtendedProfileMaps";
import {
  normalizeGiftRecipientAgeBand,
  parseWaitlistGiftAnswersInput,
  type WaitlistGiftAnswersInput,
} from "@/lib/waitlist/giftToQuizPayload";
import { WAITLIST_GIFT_FLOW_SESSION_KEY } from "@/lib/waitlist/giftFlowStorage";
import {
  formatWaitlistPreviewApiError,
  getPreviewAuthHeaders,
} from "@/lib/waitlist/previewSessionClient";
import { useAnalytics } from "@/hooks/useAnalytics";

const GIFT_RECOMMEND_URL = "/api/waitlist-preview/gift/recommend";
const STORAGE_KEY = "waitlistGiftLastRun_v1";
const STORED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_LOADING_MS = 450;
const SLOW_LOADING_MS = 6500;
const SUBMIT_TIMEOUT_MS = 90_000;
const TOTAL_STEPS = 10;

type FlowView = "intro" | "quiz" | "loading";

type GiftStepKey =
  | "recipient_age_band"
  | "recipient_gender"
  | "anchor_perfumes"
  | "scent_experience"
  | "current_scent_style"
  | "avoid_family"
  | "regional_climate"
  | "daily_vibe"
  | "wear_occasion"
  | "budget";

const STEP_ORDER: GiftStepKey[] = [
  "recipient_gender",
  "anchor_perfumes",
  "scent_experience",
  "current_scent_style",
  "avoid_family",
  "regional_climate",
  "daily_vibe",
  "wear_occasion",
  "recipient_age_band",
  "budget",
];

/** Wizard-only: matches ``GiftRegionalClimateSlug`` / API ``regional_climate``. */
type GiftRegionalClimate = GiftRegionalClimateSlug;

/**
 * Unsplash Source URLs - IDs checked for HTTP 200 on the CDN.
 * ``w`` ~480 keeps tiles sharp on retina while staying light (not full-res).
 */
function giftFinderUnsplash(photoId: string, w = 480): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&q=82`;
}

const RECIPIENT_AGE_BAND_OPTIONS: QuizOption[] = [
  {
    value: "under_18",
    label: "Under 18",
    subline: "Light, playful, age-appropriate",
  },
  {
    value: "age_18_24",
    label: "18–25",
    subline: "Fresh & on-trend",
  },
  {
    value: "age_25_34",
    label: "25–34",
    subline: "Versatile day to night",
  },
  {
    value: "age_35_44",
    label: "35–44",
    subline: "Polished & refined",
  },
  {
    value: "age_45_plus",
    label: "45 or older",
    subline: "Classic, timeless notes",
  },
];

const GENDER_OPTIONS: QuizOption[] = [
  {
    value: "men",
    label: "For Him",
    subline: "Masculine-leaning picks · kurta to commute",
    imageUrl: giftFinderUnsplash("1506794778202-cad84cf45f1d"),
  },
  {
    value: "women",
    label: "For Her",
    subline: "Feminine-leaning picks · office to wedding season",
    imageUrl: giftFinderUnsplash("1534528741775-53994a69daeb"),
  },
  {
    value: "unisex",
    label: "Unisex",
    subline: "Safe when you’re unsure · works across styles",
    imageUrl: giftFinderUnsplash("1647507653704-bde7f2d6dbf0"),
  },
];

const SCENT_EXPERIENCE_OPTIONS: QuizOption[] = [
  {
    value: "regularly",
    label: "Wears perfume often",
    subline: "Comfortable with scent - we can match signature-level notes",
    imageUrl: giftFinderUnsplash("1612817288484-6f916006741a"),
  },
  {
    value: "sometimes",
    label: "Sometimes / light use",
    subline: "Easy crowd-pleasers and polite projection",
    imageUrl: giftFinderUnsplash("1522335789203-aabd1fc54bc9"),
  },
  {
    value: "never",
    label: "Rarely or never",
    subline: "Safe, fresh, and approachable - nothing overwhelming",
    imageUrl: giftFinderUnsplash("1596462502278-27bfdc403348"),
  },
];

const CURRENT_SCENT_STYLE_OPTIONS: QuizOption[] = [
  {
    value: "sweet_gourmand",
    label: "Sweet or gourmand",
    subline: "Vanilla, dessert, cozy - works for any gender if that’s their lane",
    imageUrl: giftFinderUnsplash("1558961363-fa8fdf82db35"),
  },
  {
    value: "fresh_clean",
    label: "Fresh or clean",
    subline: "Citrus, linen-clean, airy - errands, office, or brunch",
    imageUrl: giftFinderUnsplash("1515378791036-0648a3ef77b2"),
  },
  {
    value: "woody_spicy",
    label: "Woody or spicy",
    subline: "Warm woods, spice, resins - confident, not “cologne-only”",
    imageUrl: giftFinderUnsplash("1441974231531-c6227db76b6e"),
  },
  {
    value: "unsure",
    label: "Not sure",
    subline: "We’ll lean on climate, their vibe, and the occasion next",
    imageUrl: giftFinderUnsplash("1469334031218-e382a71b716b"),
  },
];

const AVOID_FAMILY_OPTIONS: QuizOption[] = [
  {
    value: "none",
    label: "Nothing major to avoid",
    subline: "Open palette",
    imageUrl: giftFinderUnsplash("1464822759023-fed622ff2c3b"),
  },
  {
    value: "floral",
    label: "Heavy floral",
    subline: "Rose, jasmine, big white florals",
    imageUrl: giftFinderUnsplash("1490750967868-88aa4486c946"),
  },
  {
    value: "vanilla_gourmand",
    label: "Vanilla / gourmand",
    subline: "Very sweet or dessert-like",
    imageUrl: giftFinderUnsplash("1578985545062-69928b1d9587"),
  },
  {
    value: "oud_smoky",
    label: "Oud / smoky / leather",
    subline: "Dark, incense, heavy woods",
    imageUrl: giftFinderUnsplash("1753016941721-ffdc67ef8181"),
  },
  {
    value: "powdery",
    label: "Powdery or makeup",
    subline: "Lipstick, iris, old-school talc",
    imageUrl: giftFinderUnsplash("1515886657613-9f3515b0c78f"),
  },
  {
    value: "citrus",
    label: "Bright citrus",
    subline: "Lemon, neroli, sharp cologne openings",
    imageUrl: giftFinderUnsplash("1620916566398-39f1143ab7be"),
  },
];

/** Step 1 of 2: where they spend most of the year (maps to pipeline climate_context). */
const REGIONAL_CLIMATE_OPTIONS: QuizOption[] = [
  {
    value: "humid",
    label: "Hot & humid / monsoon",
    subline: "Coastal cities, much of the year sticky or rainy",
    imageUrl: giftFinderUnsplash("1507525428034-b723cf961d3e"),
  },
  {
    value: "dry_cold",
    label: "Cold or dry stretches",
    subline: "North winters, hills, or long dry season",
    imageUrl: giftFinderUnsplash("1469474968028-56623f02e42e"),
  },
  {
    value: "ac_indoor",
    label: "Mostly AC · indoors",
    subline: "Office, malls, metro - climate-controlled days",
    imageUrl: giftFinderUnsplash("1490750967868-88aa4486c946"),
  },
];

/**
 * Eight personality cards (values = ``GiftPersonalityPreset``). Regional climate (prior step) still
 * drives humid / dry / AC note buckets in the pipeline. Unsplash: https://unsplash.com/license
 */
const GIFT_PERSONALITY_OPTIONS: QuizOption[] = [
  {
    value: "quiet_introverted",
    label: "🧘 Quiet & introverted",
    subline:
      "Calm, observant · skin scents & soft musk · musk, iris, soft sandalwood, powdery florals",
    imageUrl: giftFinderUnsplash("1758024836397-2c9c698087f0"),
  },
  {
    value: "social_energetic",
    label: "🎉 Social & energetic",
    subline: "Loves people, lively · bright & noticeable · citrus, ginger, greens, fresh florals",
    imageUrl: giftFinderUnsplash("1764751024389-857d08396423"),
  },
  {
    value: "warm_romantic",
    label: "❤️ Warm & romantic",
    subline: "Affectionate, expressive · cozy & intimate · rose, vanilla, amber, creamy florals",
    imageUrl: giftFinderUnsplash("1771154591211-7e0d2853f539"),
  },
  {
    value: "bold_confident",
    label: "🔥 Bold & confident",
    subline: "Strong personality · powerful statements · oud, leather, spices, deep amber",
    imageUrl: giftFinderUnsplash("1557627320-a448c6ae746d"),
  },
  {
    value: "natural_grounded",
    label: "🌿 Natural & grounded",
    subline: "Nature, authenticity · earthy & green · vetiver, cedarwood, herbs, moss",
    imageUrl: giftFinderUnsplash("1441974231531-c6227db76b6e"),
  },
  {
    value: "creative_unique",
    label: "🎨 Creative & unique",
    subline: "Artistic, experimental · unusual blends · incense, fig, tea, smoky woods",
    imageUrl: giftFinderUnsplash("1541961017774-22349e4a1262"),
  },
  {
    value: "elegant_sophisticated",
    label: "🧠 Elegant & sophisticated",
    subline: "Polished, refined · clean luxury · iris, white florals, soft woods, aldehydes",
    imageUrl: giftFinderUnsplash("1696087225391-eb97abf5ba20"),
  },
  {
    value: "playful_optimistic",
    label: "☀️ Playful & optimistic",
    subline: "Lighthearted, cheerful · sweet & bright · fruits, berries, sugary florals",
    imageUrl: giftFinderUnsplash("1558961363-fa8fdf82db35"),
  },
];

/**
 * Older saved runs used ``wear_occasion_preset`` (string). Normalize to ``wear_occasion_presets``.
 */
function migrateStoredGiftWearOccasion(
  ga: Partial<WaitlistGiftAnswersInput>,
): Partial<WaitlistGiftAnswersInput> {
  const legacy = ga as Partial<WaitlistGiftAnswersInput> & {
    wear_occasion_preset?: string;
  };
  const arr = legacy.wear_occasion_presets;
  if (Array.isArray(arr) && arr.length >= 1) {
    return ga;
  }
  const single = legacy.wear_occasion_preset;
  if (typeof single === "string" && single.length > 0) {
    return {
      ...ga,
      wear_occasion_presets: [single as GiftWearOccasionPreset],
    };
  }
  return ga;
}

/** When they’ll wear it + what you’re celebrating (multi-select up to 2). */
const WEAR_OCCASION_OPTIONS: QuizOption[] = [
  {
    value: "daily_just_because",
    label: "Everyday · just because",
    subline: "Commute, college, casual gifting",
    imageUrl: giftFinderUnsplash("1509042239860-f550ce710b93"),
  },
  {
    value: "daily_birthday",
    label: "Daily wear · birthday",
    subline: "They’ll use it all year - birthday energy",
    imageUrl: giftFinderUnsplash("1608571423902-eed4a5ad8108"),
  },
  {
    value: "office_thank_you",
    label: "Work · thank you",
    subline: "Colleague, teacher, mentor",
    imageUrl: giftFinderUnsplash("1522071901873-411886a10004"),
  },
  {
    value: "office_casual",
    label: "Work · no big occasion",
    subline: "AC day, polite bottle for the desk",
    imageUrl: giftFinderUnsplash("1497215728101-856f4ea42174"),
  },
  {
    value: "date_anniversary",
    label: "Evening out · anniversary",
    subline: "Dinner, drinks, together time",
    imageUrl: giftFinderUnsplash("1767333586238-5fe2e8e62b0e"),
  },
  {
    value: "wedding_big",
    label: "Wedding / big function",
    subline: "Sangeet, reception, photo-ready",
    imageUrl: giftFinderUnsplash("1769500810743-5e5dd4fd5848"),
  },
  {
    value: "weekend_easy",
    label: "Weekend · chill",
    subline: "Brunch, cousins, relaxed but nice",
    imageUrl: giftFinderUnsplash("1511795409834-ef04bbd61622"),
  },
  {
    value: "festival_surprise",
    label: "Festival / surprise gift",
    subline: "Diwali, Rakhi, sibling surprise - special moment",
    imageUrl: giftFinderUnsplash("1572365716042-217b0097b332"),
  },
];

const BUDGET_OPTIONS: QuizOption[] = [
  {
    value: "budget",
    label: "Under ₹300",
    subline: "Easy decants",
  },
  {
    value: "mid",
    label: "₹300 – ₹500",
    subline: "Balanced value",
  },
  {
    value: "premium",
    label: "₹500 – ₹800",
    subline: "Gift-ready picks",
  },
  {
    value: "luxury",
    label: "₹800+",
    subline: "Premium & niche",
  },
  {
    value: "no_limit",
    label: "No limit",
    subline: "Show the strongest matches",
  },
];

interface StoredGiftRun {
  v: 1;
  savedAt: string;
  giftAnswers: WaitlistGiftAnswersInput;
  payload: WaitlistQuizSuccessPayload;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getStepMeta(step: GiftStepKey): { title: string; subtitle: string } {
  switch (step) {
    case "recipient_age_band":
      return {
        title: "How old is the recipient?",
        subtitle:
          "Rough age helps us tune the match. Your style picks and anchors matter more.",
      };
    case "recipient_gender":
      return {
        title: "Who is the gift for?",
        subtitle:
          "Masculine-, feminine-, or unisex-leaning matches. We tune for India: humid commutes, AC offices, weddings, festivals.",
      };
    case "anchor_perfumes":
      return {
        title: "Do they already have a favourite?",
        subtitle:
          "Optional - like our scent quiz. If they wear something you remember (mall brand, designer, Indian label), pick up to five; we blend those notes into the match. Skip if you’re guessing.",
      };
    case "scent_experience":
      return {
        title: "How often do they wear perfume?",
        subtitle: GIFT_EXTENDED_CATEGORY_REASONS.scent_experience,
      };
    case "current_scent_style":
      return {
        title: "What’s their scent like today?",
        subtitle: `${GIFT_EXTENDED_CATEGORY_REASONS.current_scent_styles} Anyone - pick what fits them. Choose 1–3.`,
      };
    case "avoid_family":
      return {
        title: "Anything to steer clear of?",
        subtitle: `${GIFT_EXTENDED_CATEGORY_REASONS.avoid_families} Tap all that apply - or only “nothing to avoid”.`,
      };
    case "regional_climate":
      return {
        title: "Where do they spend most of the year?",
        subtitle: GIFT_EXTENDED_CATEGORY_REASONS.regional_climate,
      };
    case "daily_vibe":
      return {
        title: "Which option sounds most like them?",
        subtitle: GIFT_EXTENDED_CATEGORY_REASONS.daily_vibe,
      };
    case "wear_occasion":
      return {
        title: "When they’ll wear it & what you’re celebrating",
        subtitle: GIFT_EXTENDED_CATEGORY_REASONS.wear_occasion,
      };
    case "budget":
      return {
        title: "What budget feels right?",
        subtitle: "We filter on decant prices in the pilot catalogue (INR).",
      };
    default:
      return { title: "", subtitle: "" };
  }
}

function canContinue(
  step: GiftStepKey,
  a: Partial<WaitlistGiftAnswersInput>,
  giftRegionalClimate: GiftRegionalClimate | null,
): boolean {
  switch (step) {
    case "recipient_age_band":
      return Boolean(a.recipient_age_band);
    case "recipient_gender":
      return Boolean(a.recipient_gender);
    case "anchor_perfumes":
      return true;
    case "scent_experience":
      return Boolean(a.scent_experience);
    case "current_scent_style": {
      const n = a.current_scent_styles?.length ?? 0;
      return n >= 1 && n <= 3;
    }
    case "avoid_family":
      return (a.avoid_families?.length ?? 0) >= 1;
    case "regional_climate":
      return giftRegionalClimate !== null;
    case "daily_vibe":
      return Boolean(a.climate_lifestyle_preset && giftRegionalClimate);
    case "wear_occasion":
      return (a.wear_occasion_presets?.length ?? 0) >= 1;
    case "budget":
      return Boolean(a.budget);
    default:
      return false;
  }
}

function mapLoadingImages(recs: WaitlistQuizSuccessPayload["recommendations"]): QuizLoadingPerfumeImage[] {
  return recs.slice(0, 5).map((r) => ({
    brand: r.brand,
    name: r.name,
    url: r.image_url ?? undefined,
  }));
}

export interface WaitlistGiftWizardProps {
  /**
   * Called after a successful recommend API response (same payload shape as the scent quiz).
   */
  onSuccess: (payload: WaitlistQuizSuccessPayload) => void;
}

/**
 * Full-screen gift quiz: intro, questions (incl. optional favourite picks), loading, then results.
 */
export function WaitlistGiftWizard({ onSuccess }: WaitlistGiftWizardProps) {
  const analytics = useAnalytics();
  const giftIntroTrackedRef = useRef(false);
  const [view, setView] = useState<FlowView>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Partial<WaitlistGiftAnswersInput>>({});
  const [anchorPerfumeIds, setAnchorPerfumeIds] = useState<string[]>([]);
  const prevRecipientGenderRef = useRef<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingImages, setLoadingImages] = useState<QuizLoadingPerfumeImage[]>([]);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [storedRun, setStoredRun] = useState<StoredGiftRun | null>(null);
  const [giftRegionalClimate, setGiftRegionalClimate] = useState<GiftRegionalClimate | null>(
    null,
  );

  const stepKey = STEP_ORDER[stepIndex];
  const { title: stepTitle, subtitle: stepSubtitle } = getStepMeta(stepKey);

  useEffect(() => {
    if (view !== "intro") return;
    if (giftIntroTrackedRef.current) return;
    giftIntroTrackedRef.current = true;
    analytics.waitlistGiftQuizIntroViewed();
  }, [view, analytics]);

  useEffect(() => {
    if (view !== "quiz") return;
    analytics.waitlistGiftQuizStepViewed({
      step_id: stepKey,
      step_index: stepIndex,
      total_steps: TOTAL_STEPS,
    });
  }, [view, stepKey, stepIndex, analytics]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredGiftRun;
      if (parsed.v !== 1 || !parsed.payload?.recommendations) return;
      if (Date.now() - new Date(parsed.savedAt).getTime() > STORED_MAX_AGE_MS) {
        return;
      }
      const prevGa = migrateStoredGiftWearOccasion(
        parsed.giftAnswers as Partial<WaitlistGiftAnswersInput>,
      );
      const withAge = {
        ...prevGa,
        recipient_age_band: normalizeGiftRecipientAgeBand(prevGa.recipient_age_band),
      };
      const coerced = parseWaitlistGiftAnswersInput(withAge);
      parsed.giftAnswers = (coerced ?? (withAge as WaitlistGiftAnswersInput)) as WaitlistGiftAnswersInput;
      setStoredRun(parsed);
      const flow = sessionStorage.getItem(WAITLIST_GIFT_FLOW_SESSION_KEY);
      if (flow === "results") {
        onSuccess(parsed.payload);
      }
    } catch {
      /* ignore */
    }
  }, [onSuccess]);

  /** Picker callback (note merge runs server-side from selected IDs). */
  const onAnchorRowsDiscovered = useCallback((_rows: QuizCatalogPerfume[]) => {}, []);

  useEffect(() => {
    const g = answers.recipient_gender;
    if (!g) return;
    if (prevRecipientGenderRef.current === g) return;
    prevRecipientGenderRef.current = g;
    setAnchorPerfumeIds([]);
  }, [answers.recipient_gender]);

  const progressPercent = ((stepIndex + 1) / TOTAL_STEPS) * 100;
  const progressLabel = `${stepIndex + 1} / ${TOTAL_STEPS}`;

  const continueEnabled = useMemo(
    () => canContinue(stepKey, answers, giftRegionalClimate),
    [stepKey, answers, giftRegionalClimate],
  );

  const beginQuiz = useCallback(() => {
    analytics.waitlistGiftQuizStarted();
    setDirection(1);
    setSubmitError(null);
    setView("quiz");
    setStepIndex(0);
    setAnswers({});
    setAnchorPerfumeIds([]);
    setGiftRegionalClimate(null);
    prevRecipientGenderRef.current = undefined;
    try {
      sessionStorage.setItem(WAITLIST_GIFT_FLOW_SESSION_KEY, "quiz");
    } catch {
      /* ignore */
    }
  }, [analytics]);

  const restoreLast = useCallback(() => {
    if (!storedRun) return;
    try {
        sessionStorage.setItem(WAITLIST_GIFT_FLOW_SESSION_KEY, "results");
    } catch {
      /* ignore */
    }
    onSuccess(storedRun.payload);
  }, [storedRun, onSuccess]);

  const goBack = useCallback(() => {
    setSubmitError(null);
    if (view === "quiz" && stepIndex === 0) {
      setView("intro");
      try {
        sessionStorage.removeItem(WAITLIST_GIFT_FLOW_SESSION_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    if (view === "quiz" && stepIndex > 0) {
      setDirection(-1);
      setStepIndex((i) => i - 1);
    }
  }, [view, stepIndex]);

  const toggleAnchorPerfume = useCallback((id: string) => {
    setSubmitError(null);
    setAnchorPerfumeIds((sel) => {
      if (sel.includes(id)) return sel.filter((x) => x !== id);
      if (sel.length >= 5) return sel;
      return [...sel, id];
    });
  }, []);

  const toggleGiftAvoidFamily = useCallback((value: string) => {
    setSubmitError(null);
    setAnswers((p) => {
      const cur = p.avoid_families ?? [];
      const v = value as WaitlistGiftAnswersInput["avoid_families"][number];
      if (v === "none") {
        if (cur.includes("none")) {
          return { ...p, avoid_families: [] };
        }
        return { ...p, avoid_families: ["none"] };
      }
      const withoutNone = cur.filter((x) => x !== "none");
      if (withoutNone.includes(v)) {
        return { ...p, avoid_families: withoutNone.filter((x) => x !== v) };
      }
      return { ...p, avoid_families: [...withoutNone, v] };
    });
  }, []);

  const toggleGiftCurrentScentStyle = useCallback((value: string) => {
    setSubmitError(null);
    setAnswers((p) => {
      const cur = p.current_scent_styles ?? [];
      const v = value as WaitlistGiftAnswersInput["current_scent_styles"][number];
      if (cur.includes(v)) {
        return { ...p, current_scent_styles: cur.filter((x) => x !== v) };
      }
      if (cur.length >= 3) {
        return p;
      }
      return { ...p, current_scent_styles: [...cur, v] };
    });
  }, []);

  const toggleGiftWearOccasion = useCallback((value: string) => {
    setSubmitError(null);
    setAnswers((p) => {
      const cur = p.wear_occasion_presets ?? [];
      const v = value as GiftWearOccasionPreset;
      if (cur.includes(v)) {
        const next = cur.filter((x) => x !== v);
        if (next.length === 0) {
          return p;
        }
        return { ...p, wear_occasion_presets: next };
      }
      if (cur.length >= 2) {
        return p;
      }
      return { ...p, wear_occasion_presets: [...cur, v] };
    });
  }, []);

  const submitGift = useCallback(async () => {
    if (!canContinue("budget", answers, giftRegionalClimate)) return;

    const giftBody: WaitlistGiftAnswersInput = {
      recipient_age_band: answers.recipient_age_band!,
      recipient_gender: answers.recipient_gender!,
      anchor_perfume_ids: anchorPerfumeIds,
      scent_experience: answers.scent_experience!,
      current_scent_styles: answers.current_scent_styles!,
      avoid_families: answers.avoid_families!,
      regional_climate: giftRegionalClimate!,
      climate_lifestyle_preset: answers.climate_lifestyle_preset!,
      wear_occasion_presets: answers.wear_occasion_presets!,
      budget: answers.budget!,
    };

    setSubmitError(null);
    setView("loading");
    setLoadingProgress(12);
    setLoadingImages([]);
    setLoadingSlow(false);

    const slowTimer = window.setTimeout(() => setLoadingSlow(true), SLOW_LOADING_MS);
    const progressTimer = window.setInterval(() => {
      setLoadingProgress((p) => (p >= 92 ? p : p + 6));
    }, 280);

    const started = performance.now();

    try {
      const controller = new AbortController();
      const to = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
      const res = await fetch(GIFT_RECOMMEND_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...getPreviewAuthHeaders(),
        },
        body: JSON.stringify({ answers: giftBody }),
        signal: controller.signal,
      });
      window.clearTimeout(to);

      const rawText = await res.text();
      if (!res.ok) {
        throw new Error(formatWaitlistPreviewApiError(rawText, res.status));
      }

      const data = JSON.parse(rawText) as {
        recommendations?: WaitlistQuizSuccessPayload["recommendations"];
        answers?: WaitlistQuizSuccessPayload["answers"];
        preference_analytics?: WaitlistQuizSuccessPayload["preference_analytics"];
        scent_profile?: WaitlistQuizSuccessPayload["scent_profile"];
      };

      if (!data.recommendations || !data.answers) {
        throw new Error("Invalid response from server.");
      }

      const payload: WaitlistQuizSuccessPayload = {
        recommendations: data.recommendations,
        answers: data.answers,
        preference_analytics: data.preference_analytics ?? null,
        scent_profile: data.scent_profile ?? null,
      };

      setLoadingImages(mapLoadingImages(payload.recommendations));

      const elapsed = performance.now() - started;
      if (elapsed < MIN_LOADING_MS) {
        await delay(MIN_LOADING_MS - elapsed);
      }

      try {
        const run: StoredGiftRun = {
          v: 1,
          savedAt: new Date().toISOString(),
          giftAnswers: giftBody,
          payload,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
        sessionStorage.setItem(WAITLIST_GIFT_FLOW_SESSION_KEY, "results");
      } catch {
        /* ignore */
      }

      analytics.waitlistGiftQuizCompleted(payload.recommendations.length);
      onSuccess(payload);
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "That took too long. Check your connection and try again."
          : e instanceof Error
            ? e.message
            : "Something went wrong.";
      analytics.waitlistGiftQuizSubmitFailed(msg);
      setSubmitError(msg);
      setView("quiz");
    } finally {
      window.clearTimeout(slowTimer);
      window.clearInterval(progressTimer);
    }
  }, [answers, anchorPerfumeIds, giftRegionalClimate, onSuccess, analytics]);

  const skipAnchorStep = useCallback(() => {
    setSubmitError(null);
    setAnchorPerfumeIds([]);
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));
  }, []);

  const onContinue = useCallback(() => {
    if (!continueEnabled) return;
    if (stepIndex < TOTAL_STEPS - 1) {
      setDirection(1);
      setStepIndex((i) => i + 1);
      return;
    }
    void submitGift();
  }, [continueEnabled, stepIndex, submitGift]);

  const renderStep = () => {
    switch (stepKey) {
      case "recipient_age_band":
        return (
          <TypeA
            options={RECIPIENT_AGE_BAND_OPTIONS}
            selected={answers.recipient_age_band ?? null}
            onSelect={(v) =>
              setAnswers((p) => ({
                ...p,
                recipient_age_band: v as WaitlistGiftAnswersInput["recipient_age_band"],
              }))
            }
          />
        );
      case "recipient_gender":
        return (
          <TypeA
            options={GENDER_OPTIONS}
            selected={answers.recipient_gender ?? null}
            onSelect={(v) =>
              setAnswers((p) => ({ ...p, recipient_gender: v as WaitlistGiftAnswersInput["recipient_gender"] }))
            }
          />
        );
      case "anchor_perfumes": {
        const g = answers.recipient_gender;
        if (!g) return null;
        return (
          <QuizAnchorPerfumePicker
            gender={g}
            selectedIds={anchorPerfumeIds}
            onToggle={toggleAnchorPerfume}
            onRowsDiscovered={onAnchorRowsDiscovered}
          />
        );
      }
      case "scent_experience":
        return (
          <TypeC
            options={SCENT_EXPERIENCE_OPTIONS}
            selected={answers.scent_experience ?? null}
            onSelect={(v) =>
              setAnswers((p) => ({
                ...p,
                scent_experience: v as WaitlistGiftAnswersInput["scent_experience"],
              }))
            }
          />
        );
      case "current_scent_style":
        return (
          <TypeB
            options={CURRENT_SCENT_STYLE_OPTIONS}
            selected={answers.current_scent_styles ?? []}
            onToggle={toggleGiftCurrentScentStyle}
            maxSelect={3}
          />
        );
      case "avoid_family":
        return (
          <TypeB
            options={AVOID_FAMILY_OPTIONS}
            selected={answers.avoid_families ?? []}
            onToggle={toggleGiftAvoidFamily}
          />
        );
      case "regional_climate":
        return (
          <TypeC
            options={REGIONAL_CLIMATE_OPTIONS}
            selected={giftRegionalClimate}
            onSelect={(v) => {
              const region = v as GiftRegionalClimate;
              setGiftRegionalClimate(region);
              setAnswers((p) => ({ ...p, climate_lifestyle_preset: undefined }));
            }}
          />
        );
      case "daily_vibe": {
        if (!giftRegionalClimate) return null;
        return (
          <TypeC
            options={GIFT_PERSONALITY_OPTIONS}
            selected={answers.climate_lifestyle_preset ?? null}
            onSelect={(v) =>
              setAnswers((p) => ({
                ...p,
                climate_lifestyle_preset: v as GiftPersonalityPreset,
              }))
            }
          />
        );
      }
      case "wear_occasion":
        return (
          <TypeB
            options={WEAR_OCCASION_OPTIONS}
            selected={answers.wear_occasion_presets ?? []}
            onToggle={toggleGiftWearOccasion}
            maxSelect={2}
          />
        );
      case "budget":
        return (
          <TypeF
            options={BUDGET_OPTIONS}
            selected={answers.budget ?? null}
            onSelect={(v) =>
              setAnswers((p) => ({ ...p, budget: v as WaitlistGiftAnswersInput["budget"] }))
            }
            showLevelBar
          />
        );
      default:
        return null;
    }
  };

  if (view === "loading") {
    return (
      <QuizLoadingScreen
        progress={loadingProgress}
        perfumeImages={loadingImages}
        isSlow={loadingSlow}
        title="Finding their best scent matches"
        expectationNote="This may take up to 60 seconds while we turn your answers into a search and rank the catalogue for their best fits."
        slowExpectationNote="Cold AI embeddings can need another 60 seconds - we’re still running. Up to 12 gift ideas are almost ready."
      />
    );
  }

  if (view === "intro") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8 pt-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-lg text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B85A3A]/12 shadow-inner ring-1 ring-[#B85A3A]/20">
            <Gift className="h-7 w-7 text-[#B85A3A]" aria-hidden />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#B85A3A]">
            Gift finder
          </p>
          <h1 className="font-display mt-3 text-[1.55rem] font-bold leading-[1.2] tracking-tight text-[#1A1A1A] sm:text-[2rem]">
            A thoughtful perfume gift - for family, partner, or friends - without the guesswork.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#6B6560] sm:text-[15px]">
            A quick flow tuned for Indian gifting: heat and monsoon, office and weddings, festivals
            like Rakhi and Diwali. Optional step if you know a bottle they wear - we fold its notes
            into the match.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:items-center">
            <button
              type="button"
              onClick={beginQuiz}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1A1A1A] px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#B85A3A] hover:shadow-[0_8px_24px_rgba(184,90,58,0.3)] sm:w-auto sm:min-w-[240px]"
            >
              Start gift finder
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            {storedRun && (
              <button
                type="button"
                onClick={restoreLast}
                className="text-sm font-semibold text-[#8A6A5D] underline-offset-4 hover:text-[#B85A3A] hover:underline"
              >
                View your last gift picks
              </button>
            )}
          </div>
          <p className="text-[#A09088] mt-6 text-xs">
            Ten short steps · Up to 12 curated matches · Works great on your phone
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <section className="relative mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8D4C4] bg-white/80 text-[#8A6A5D] shadow-sm backdrop-blur-sm transition-all hover:border-[#B85A3A] hover:text-[#B85A3A]"
            aria-label="Go back"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#EDE0D8]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B85A3A] to-[#D4845E] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-[#E8D4C4] bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[#8A6A5D] backdrop-blur-sm sm:px-3">
            {progressLabel}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4 sm:pt-5">
          <div className="shrink-0 pb-3 text-center sm:pb-4">
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#B85A3A]/15 bg-[#B85A3A]/8 px-2.5 py-0.5">
              <Sparkles className="h-3 w-3 text-[#B85A3A]" aria-hidden />
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">
                Gift match
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stepKey}
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -14 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-2xl space-y-2"
              >
                <h2 className="font-display text-[1.25rem] font-bold leading-tight text-[#1A1A1A] sm:text-[1.85rem]">
                  {stepTitle}
                </h2>
                <p className="text-xs leading-relaxed text-[#8A6A5D] sm:text-sm">{stepSubtitle}</p>
              </motion.div>
            </AnimatePresence>
            {submitError && (
              <p className="mx-auto mt-3 max-w-xl rounded-2xl border border-[#E7CBC0] bg-[#FFF7F4] px-4 py-2.5 text-center text-sm text-[#9C4A2E]">
                {submitError}
              </p>
            )}
          </div>

          <div
            className={
              stepKey === "anchor_perfumes"
                ? "flex min-h-0 flex-1 flex-col overflow-hidden pb-1"
                : "min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pb-2"
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stepKey}
                initial={{ opacity: 0, x: direction * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -12 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={
                  stepKey === "anchor_perfumes"
                    ? "flex min-h-0 flex-1 flex-col pb-1"
                    : "pb-4"
                }
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2 border-t border-[#EDE0D8]/80 bg-[linear-gradient(to_top,#FAF7F4,transparent)] pt-3 pb-1">
            <button
              type="button"
              onClick={onContinue}
              disabled={!continueEnabled}
              className="w-full max-w-xs rounded-2xl bg-[#1A1A1A] px-6 py-3.5 text-[12px] font-bold tracking-[0.16em] text-white shadow-md transition-colors hover:bg-[#B85A3A] hover:shadow-[0_8px_24px_rgba(184,90,58,0.3)] disabled:cursor-not-allowed disabled:bg-[#D3D0CD] sm:py-4 sm:text-[13px]"
            >
              {stepIndex === TOTAL_STEPS - 1 ? "See gift ideas" : "Continue"}
            </button>
            {stepKey === "anchor_perfumes" && (
              <button
                type="button"
                onClick={skipAnchorStep}
                className="text-sm font-medium text-[#8A6A5D] underline-offset-4 hover:text-[#B85A3A] hover:underline"
              >
                Skip - I don’t know what they wear
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

