"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { Leaf, Star, Gem, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { QuizLoadingScreen, type QuizLoadingPerfumeImage } from "./QuizLoadingScreen";
import {
  TypeA,
  TypeB,
  TypeC,
  TypeD,
  TypeF,
  type QuizOption,
} from "./QuizQuestionTypes";
import { QuizAnchorPerfumePicker } from "./QuizAnchorPerfumePicker";
import {
  deriveQuizFromAnchorPerfumes,
  type QuizCatalogPerfume,
} from "@/lib/quizAnchorDerivation";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";
import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import { getPublicApiBaseUrl } from "@/lib/publicApiBase";
import {
  formatWaitlistPreviewApiError,
  getPreviewAuthHeaders,
} from "@/lib/waitlist/previewSessionClient";

const API_BASE = getPublicApiBaseUrl();
const QUIZ_SUBMIT_TIMEOUT_MS = 60_000;
const MIN_LOADING_MS = 450;
const SLOW_LOADING_MS = 6500;
const TOTAL_STEPS = 11;

type StepKey =
  | "gender"
  | "anchorPerfumes"
  | "families"
  | "likedNotes"
  | "scentStyle"
  | "occasions"
  | "experience"
  | "longevity"
  | "intensity"
  | "age"
  | "mood";

interface ForYouAnswers {
  experienceLevel: string | null;
  intensity: string | null;
  /** Age range slug (``18-24``, ``25-34``, …) or empty if skipped. */
  age: string;
  /** Up to 5 catalogue perfumes for cold-start inference. */
  anchorPerfumeIds: string[];
  /** True when notes/families were filled from anchor perfumes. */
  preferencesFromAnchors: boolean;
  likedNotes: string[];
  moods: string[];
  occasions: string[];
  preferredGender: string | null;
  scentFamilies: string[];
  scentStyle: string | null;
  longevity: string | null;
}

interface QuizRecommendation {
  id?: string;
  slug?: string | null;
  brand: string;
  image_url?: string | null;
  name: string;
  match_score?: number;
}

interface QuizResultResponse {
  recommendations: QuizRecommendation[];
}

/** Payload passed to ``onWaitlistSubmitSuccess`` after a successful pilot quiz submit. */
export interface WaitlistQuizSuccessPayload {
  recommendations: QuizRecommendation[];
  /** Inner ``answers`` object (same shape as quiz API body). */
  answers: QuizAnswersPayload;
  /** From Next quiz submit (Supabase vector + deterministic KPIs; optional LLM summary later). */
  preference_analytics: PreferenceAnalyticsData | null;
  /** Persisted profile JSON from quiz submit (title, blurb, families, traits, …). */
  scent_profile: Record<string, unknown> | null;
}

interface ForYouWizardProps {
  onComplete?: (result: QuizResultResponse) => void;
  /**
   * After a successful submit, navigate here instead of ``/for-you``.
   * When set, skips the post-submit matchmaking loading UI and goes straight
   * after the API succeeds (same idea as redirecting when quiz is already done).
   */
  afterSubmitHref?: string;
  /** Use waitlist session cookie + Next.js API (no Supabase user JWT). */
  waitlistMode?: boolean;
  /** After submit, show quick pilot feedback survey before navigating. */
  pilotSurveyAfterSubmit?: boolean;
  /**
   * Waitlist: after loading screen, show results on the parent instead of navigating.
   * Omit ``afterSubmitHref`` when using this (full loading UX runs).
   */
  onWaitlistSubmitSuccess?: (payload: WaitlistQuizSuccessPayload) => void;
}

interface NoteGroupOption extends QuizOption {
  noteCategory: "top" | "middle" | "base";
}

/** Gender step hero imagery (aligned with legacy quiz gender options). */
const GENDER_OPTIONS: QuizOption[] = [
  {
    value: "men",
    label: "For Him",
    imageUrl:
      "/images/categories/for-him.jpg",
  },
  {
    value: "women",
    label: "For Her",
    imageUrl:
      "/images/categories/for-her.jpg",
  },
  {
    value: "unisex",
    label: "Unisex",
    imageUrl:
      "/images/categories/unisex.jpg",
  },
];

/**
 * Broad coverage for catalog fuzzy-matching (`pl in fl or fl in pl` on `scent_family`).
 * Keep slugs lowercase; labels are user-facing.
 */
const SCENT_FAMILY_OPTIONS: QuizOption[] = [
  { value: "fresh", label: "Fresh" },
  { value: "citrus", label: "Citrus" },
  { value: "aquatic", label: "Aquatic / marine" },
  { value: "ozonic", label: "Ozonic / airy" },
  { value: "green", label: "Green" },
  { value: "floral", label: "Floral" },
  { value: "white_floral", label: "White floral" },
  { value: "fruity", label: "Fruity" },
  { value: "aromatic", label: "Aromatic / herbal" },
  { value: "spicy", label: "Spicy" },
  { value: "woody", label: "Woody" },
  { value: "fougere", label: "Fougère" },
  { value: "chypre", label: "Chypre" },
  { value: "oriental", label: "Oriental / amber" },
  { value: "amber", label: "Warm amber" },
  { value: "gourmand", label: "Gourmand" },
  { value: "sweet", label: "Sweet" },
  { value: "powdery", label: "Powdery" },
  { value: "musky", label: "Musky" },
  { value: "leather", label: "Leather" },
  { value: "smoky", label: "Smoky / incense" },
  { value: "earthy", label: "Earthy" },
  { value: "aldehydic", label: "Aldehydic / soapy" },
];

/**
 * Note slug values align with backend ``QuizAnswers`` / note pyramid fields.
 */
const NOTE_GROUP_OPTIONS: NoteGroupOption[] = [
  // Top
  { value: "bergamot", label: "Bergamot", noteCategory: "top" },
  { value: "lemon", label: "Lemon", noteCategory: "top" },
  { value: "grapefruit", label: "Grapefruit", noteCategory: "top" },
  { value: "orange", label: "Orange", noteCategory: "top" },
  { value: "neroli", label: "Neroli", noteCategory: "top" },
  { value: "mint", label: "Mint", noteCategory: "top" },
  { value: "lavender", label: "Lavender", noteCategory: "top" },
  { value: "cardamom", label: "Cardamom", noteCategory: "top" },
  { value: "pink_pepper", label: "Pink Pepper", noteCategory: "top" },
  { value: "ginger", label: "Ginger", noteCategory: "top" },
  { value: "apple", label: "Apple", noteCategory: "top" },
  { value: "pear", label: "Pear", noteCategory: "top" },
  { value: "blackcurrant", label: "Blackcurrant", noteCategory: "top" },
  { value: "marine", label: "Marine / Aquatic", noteCategory: "top" },
  { value: "aldehydes", label: "Aldehydes", noteCategory: "top" },
  // Middle
  { value: "rose", label: "Rose", noteCategory: "middle" },
  { value: "jasmine", label: "Jasmine", noteCategory: "middle" },
  { value: "iris", label: "Iris / Orris", noteCategory: "middle" },
  { value: "lily", label: "Lily of the Valley", noteCategory: "middle" },
  { value: "tuberose", label: "Tuberose", noteCategory: "middle" },
  { value: "ylang_ylang", label: "Ylang Ylang", noteCategory: "middle" },
  { value: "geranium", label: "Geranium", noteCategory: "middle" },
  { value: "cinnamon", label: "Cinnamon", noteCategory: "middle" },
  { value: "nutmeg", label: "Nutmeg", noteCategory: "middle" },
  { value: "clove", label: "Clove", noteCategory: "middle" },
  { value: "peach", label: "Peach", noteCategory: "middle" },
  { value: "raspberry", label: "Raspberry", noteCategory: "middle" },
  { value: "violet", label: "Violet", noteCategory: "middle" },
  { value: "saffron", label: "Saffron", noteCategory: "middle" },
  { value: "oud", label: "Oud", noteCategory: "middle" },
  // Base
  { value: "sandalwood", label: "Sandalwood", noteCategory: "base" },
  { value: "cedar", label: "Cedar", noteCategory: "base" },
  { value: "vetiver", label: "Vetiver", noteCategory: "base" },
  { value: "patchouli", label: "Patchouli", noteCategory: "base" },
  { value: "vanilla", label: "Vanilla", noteCategory: "base" },
  { value: "amber", label: "Amber", noteCategory: "base" },
  { value: "musk", label: "Musk", noteCategory: "base" },
  { value: "tonka", label: "Tonka Bean", noteCategory: "base" },
  { value: "leather", label: "Leather", noteCategory: "base" },
  { value: "tobacco", label: "Tobacco", noteCategory: "base" },
  { value: "benzoin", label: "Benzoin", noteCategory: "base" },
  { value: "incense", label: "Incense", noteCategory: "base" },
  { value: "oakmoss", label: "Oakmoss", noteCategory: "base" },
  { value: "labdanum", label: "Labdanum", noteCategory: "base" },
  { value: "cashmeran", label: "Cashmeran", noteCategory: "base" },
];

const SCENT_STYLE_OPTIONS: QuizOption[] = [
  {
    value: "bold_romantic",
    label: "Bold and magnetic",
    subline: "Warm woods, spice, deeper evening energy",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80",
  },
  {
    value: "fresh_polished",
    label: "Fresh and polished",
    subline: "Clean citrus, airy structure, effortless confidence",
    imageUrl: "/images/quiz/fresh.jpg",
  },
  {
    value: "soft_romantic",
    label: "Soft and romantic",
    subline: "Floral warmth with a graceful, intimate trail",
    imageUrl: "/images/quiz/romantic.jpg",
  },
  {
    value: "unexpected_statement",
    label: "Unexpected and expressive",
    subline: "Distinctive textures, niche character, standout moods",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
];

const OCCASION_OPTIONS: QuizOption[] = [
  { value: "daily_office", label: "Office", subline: "Polished, easy to wear",
    imageUrl: "/images/quiz/work.jpg" },
  { value: "date_night", label: "Date Night", subline: "Closer, warmer, memorable",
    imageUrl: "/images/quiz/date.jpg" },
  { value: "casual_day", label: "Weekend", subline: "Relaxed, daytime, versatile",
    imageUrl: "/images/quiz/daily.jpg" },
  { value: "special_events", label: "Evening", subline: "Dressier, statement-ready",
    imageUrl: "/images/quiz/evening.jpg" },
  { value: "travel", label: "Casual", subline: "Go-anywhere, everyday comfort",
    imageUrl: "/images/quiz/weekend.jpg" },
];

// EXPERIENCE_OPTIONS defined inside component (see useExperienceOptions) to avoid module-level JSX

const LONGEVITY_OPTIONS: QuizOption[] = [
  { value: "short", label: "Light", subline: "2 to 4 hours, soft and easygoing" },
  { value: "moderate", label: "Balanced", subline: "4 to 6 hours for flexible wear" },
  { value: "long", label: "Long lasting", subline: "6 to 8 hours with staying power" },
  { value: "very_long", label: "All day", subline: "8+ hours with serious presence" },
];

const INTENSITY_OPTIONS: QuizOption[] = [
  { value: "light", label: "Subtle", subline: "Skin-close and understated" },
  { value: "moderate", label: "Noticeable", subline: "Balanced trail, never too much" },
  { value: "strong", label: "Statement", subline: "A confident scent bubble around you" },
];

/** Matches ``deriveAgeGroup`` / API ``age_group`` buckets (no exact age typing). */
const AGE_RANGE_OPTIONS: QuizOption[] = [
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55 or older" },
];

const MOOD_OPTIONS: QuizOption[] = [
  { value: "confident", label: "Confident", subline: "Assured, sharp, noticeable",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80" },
  { value: "romantic", label: "Romantic", subline: "Inviting, intimate, warm",
    imageUrl: "/images/quiz/romantic.jpg" },
  { value: "fresh_clean", label: "Fresh", subline: "Bright, clean, easy to love",
    imageUrl: "/images/quiz/fresh.jpg" },
  { value: "energetic", label: "Energized", subline: "Upbeat, lively, light on its feet",
    imageUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=600&q=80" },
  { value: "mysterious", label: "Mysterious", subline: "Smoky, deep, intriguing",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80" },
];



const STYLE_EFFECTS: Record<string, { families: string[]; moods: string[] }> = {
  bold_romantic: { families: ["woody", "oriental", "spicy"], moods: ["confident", "romantic"] },
  fresh_polished: { families: ["fresh", "aquatic", "green"], moods: ["confident", "fresh_clean"] },
  soft_romantic: { families: ["floral", "musk", "gourmand"], moods: ["romantic"] },
  unexpected_statement: { families: ["woody", "spicy", "aromatic"], moods: ["mysterious", "confident"] },
};

const STEP_ORDER: StepKey[] = [
  "gender",
  "anchorPerfumes",
  "families",
  "likedNotes",
  "scentStyle",
  "occasions",
  "experience",
  "longevity",
  "intensity",
  "age",
  "mood",
];

const OPTIONAL_STEPS = new Set<StepKey>(["anchorPerfumes", "likedNotes", "age"]);
const AUTO_ADVANCE_STEPS = new Set<StepKey>([
  "gender",
  "scentStyle",
  "experience",
  "longevity",
  "intensity",
]);

const INITIAL_ANSWERS: ForYouAnswers = {
  experienceLevel: null,
  intensity: null,
  age: "",
  anchorPerfumeIds: [],
  preferencesFromAnchors: false,
  likedNotes: [],
  moods: [],
  occasions: [],
  preferredGender: null,
  scentFamilies: [],
  scentStyle: null,
  longevity: null,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const AGE_GROUP_BUCKETS = new Set([
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
]);

/**
 * Map stored quiz age to API ``age_group`` (bucket string or null).
 *
 * Args:
 *   age: Range slug from the age step, legacy numeric string, or empty.
 *
 * Returns:
 *   Canonical bucket (e.g. ``25-34``) or null when skipped or unknown.
 */
function deriveAgeGroup(age: string): string | null {
  const trimmed = age.trim();
  if (!trimmed) return null;
  if (AGE_GROUP_BUCKETS.has(trimmed)) return trimmed;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 24) return "18-24";
  if (parsed <= 34) return "25-34";
  if (parsed <= 44) return "35-44";
  if (parsed <= 54) return "45-54";
  return "55+";
}

function splitNotePreferences(selectedNotes: string[]) {
  const top_notes: string[] = [];
  const middle_notes: string[] = [];
  const base_notes: string[] = [];

  selectedNotes.forEach((value) => {
    const option = NOTE_GROUP_OPTIONS.find((item) => item.value === value);
    if (!option) return;
    if (option.noteCategory === "top") top_notes.push(value);
    if (option.noteCategory === "middle") middle_notes.push(value);
    if (option.noteCategory === "base") base_notes.push(value);
  });

  return {
    top_notes,
    middle_notes,
    base_notes,
    disliked_notes: [],
  };
}

function buildPayload(answers: ForYouAnswers) {
  const styleEffects = answers.scentStyle ? STYLE_EFFECTS[answers.scentStyle] : undefined;
  const moodPreferences = Array.from(
    new Set([...(answers.moods || []), ...(styleEffects?.moods ?? [])]),
  );
  const scentFamilies = Array.from(
    new Set([...(answers.scentFamilies || []), ...(styleEffects?.families ?? [])]),
  );

  return {
    answers: {
      note_preferences: splitNotePreferences(answers.likedNotes),
      preferred_occasions: answers.occasions,
      preferred_seasons: [],
      preferred_intensity: answers.intensity,
      preferred_longevity: answers.longevity,
      preferred_sillage: null,
      preferred_gender: answers.preferredGender,
      scent_families: scentFamilies,
      mood_preferences: moodPreferences,
      budget_range: null,
      experience_level: answers.experienceLevel,
      allergies: [],
      skin_type: null,
      climate: null,
      age_group: deriveAgeGroup(answers.age),
    },
  };
}

function canContinue(stepKey: StepKey, answers: ForYouAnswers): boolean {
  switch (stepKey) {
    case "gender":
      return Boolean(answers.preferredGender);
    case "anchorPerfumes":
      return true;
    case "families":
      return answers.scentFamilies.length > 0;
    case "likedNotes":
      return true;
    case "scentStyle":
      return Boolean(answers.scentStyle);
    case "occasions":
      return answers.occasions.length > 0;
    case "experience":
      return Boolean(answers.experienceLevel);
    case "longevity":
      return Boolean(answers.longevity);
    case "intensity":
      return Boolean(answers.intensity);
    case "age":
      return true;
    case "mood":
      return answers.moods.length > 0;
    default:
      return false;
  }
}

function mapLoadingImages(result: QuizResultResponse | null): QuizLoadingPerfumeImage[] {
  if (!result?.recommendations?.length) return [];
  return result.recommendations.slice(0, 5).map((fragrance) => ({
    brand: fragrance.brand,
    name: fragrance.name,
    url: fragrance.image_url,
  }));
}

export function ForYouWizard({
  onComplete,
  afterSubmitHref,
  waitlistMode = false,
  pilotSurveyAfterSubmit = false,
  onWaitlistSubmitSuccess,
}: ForYouWizardProps) {
  const router = useRouter();
  const { getToken } = useSupabaseAuth();

  const [answers, setAnswers] = useState<ForYouAnswers>(INITIAL_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loading, setLoading] = useState(false);
  /** Save-only submit (e.g. subscription quiz): no ``QuizLoadingScreen``, immediate redirect. */
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(7);
  const [loadingImages, setLoadingImages] = useState<QuizLoadingPerfumeImage[]>([]);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pilotSurveyOpen, setPilotSurveyOpen] = useState(false);
  const [postQuizHref, setPostQuizHref] = useState<string | null>(null);
  const [anchorCatalog, setAnchorCatalog] = useState<QuizCatalogPerfume[]>([]);
  const goNextRef = useRef<() => void>(() => {});

  const catalogById = useMemo(() => {
    const m = new Map<string, QuizCatalogPerfume>();
    for (const row of anchorCatalog) {
      if (row.id != null) m.set(String(row.id), row);
    }
    return m;
  }, [anchorCatalog]);

  const experienceOptions: QuizOption[] = useMemo(() => [
    { value: "beginner", label: "New to fragrance", subline: "Easy wins and confident first picks", icon: <Leaf className="w-9 h-9 text-green-500" /> },
    { value: "intermediate", label: "Know what I like", subline: "Already have a few go-to bottles", icon: <Star className="w-9 h-9 fill-amber-400 text-amber-400" /> },
    { value: "enthusiast", label: "Fragrance enthusiast", subline: "Enjoy exploring releases and different styles", icon: <Gem className="w-9 h-9 text-blue-400" /> },
    { value: "expert", label: "Collector mindset", subline: "Want nuance, depth, and unusual profiles", icon: <Trophy className="w-9 h-9 text-amber-500" /> },
  ], []);

  useEffect(() => {
    if (!answers.preferredGender) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "500");
        params.set("offset", "0");
        // Pyramid notes are omitted from the default list payload; needed to map anchors → likedNotes.
        params.set("include_notes", "true");
        // Same-origin list route: Supabase when waitlist-only or FastAPI down; avoids client → :8000 (often offline in dev).
        const res = await fetch(`/api/fragrances/list?${params.toString()}`);
        if (!res.ok) throw new Error("list");
        const data = (await res.json()) as unknown;
        if (!cancelled && Array.isArray(data)) {
          setAnchorCatalog(data as QuizCatalogPerfume[]);
        }
      } catch {
        if (!cancelled) setAnchorCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [answers.preferredGender]);

  const stepKey = STEP_ORDER[stepIndex];

  const progressLabel = useMemo(() => `${stepIndex + 1} OF ${TOTAL_STEPS}`, [stepIndex]);

  const selectSingle = (key: keyof ForYouAnswers, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setSubmitError(null);

    if (AUTO_ADVANCE_STEPS.has(stepKey)) {
      window.setTimeout(() => {
        if (stepIndex === TOTAL_STEPS - 1) {
          void goNext();
          return;
        }
        setDirection(1);
        setStepIndex((current) => Math.min(current + 1, TOTAL_STEPS - 1));
      }, 220);
    }
  };

  const toggleAnchorPerfume = (id: string) => {
    setSubmitError(null);
    setAnswers((current) => {
      const sel = current.anchorPerfumeIds;
      if (sel.includes(id)) {
        return { ...current, anchorPerfumeIds: sel.filter((x) => x !== id) };
      }
      if (sel.length >= 5) return current;
      return { ...current, anchorPerfumeIds: [...sel, id] };
    });
  };

  const toggleMulti = (
    key: "likedNotes" | "moods" | "occasions" | "scentFamilies",
    value: string,
  ) => {
    setSubmitError(null);
    setAnswers((current) => {
      const selected = current[key];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  const goBack = () => {
    if (loading || quickSubmitting || stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((current) => current - 1);
  };

  const goNext = async () => {
    if (loading || quickSubmitting) return;
    if (!canContinue(stepKey, answers)) return;

    if (stepIndex < TOTAL_STEPS - 1) {
      if (stepKey === "anchorPerfumes") {
        setAnswers((current) => {
          if (current.anchorPerfumeIds.length === 0) {
            return { ...current, preferencesFromAnchors: false };
          }
          const derived = deriveQuizFromAnchorPerfumes(
            current.anchorPerfumeIds,
            catalogById,
            NOTE_GROUP_OPTIONS,
          );
          return {
            ...current,
            scentFamilies: derived.scentFamilies,
            likedNotes: derived.likedNotes,
            preferencesFromAnchors: true,
          };
        });
      }
      setDirection(1);
      setStepIndex((current) => current + 1);
      return;
    }

    const isWaitlist = Boolean(waitlistMode);
    let token: string | null = null;
    if (!isWaitlist) {
      token = await getToken();
      if (!token) {
        setSubmitError("Please sign in again before submitting your quiz.");
        return;
      }
    }

    const redirectHref = afterSubmitHref?.trim();
    const submitUrl = isWaitlist
      ? "/api/waitlist-preview/quiz/submit"
      : API_BASE
        ? `${API_BASE}/api/v1/quiz/submit`
        : "/api/v1/quiz/submit";

    const buildRequestInit = (): RequestInit => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (!isWaitlist && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (isWaitlist) {
        Object.assign(headers, getPreviewAuthHeaders());
      }
      const init: RequestInit = {
        method: "POST",
        headers,
        body: JSON.stringify(buildPayload(answers)),
        signal: AbortSignal.timeout(QUIZ_SUBMIT_TIMEOUT_MS),
      };
      if (isWaitlist) {
        init.credentials = "include";
      }
      return init;
    };

    if (redirectHref) {
      setQuickSubmitting(true);
      setSubmitError(null);
      try {
        const response = await fetch(submitUrl, buildRequestInit());

        if (!response.ok) {
          const errorText = await response.text();
          const message = isWaitlist
            ? formatWaitlistPreviewApiError(errorText, response.status)
            : errorText || "We couldn't save your quiz right now.";
          throw new Error(message);
        }

        const result = (await response.json()) as QuizResultResponse;
        onComplete?.(result);
        if (pilotSurveyAfterSubmit && isWaitlist) {
          setPostQuizHref(redirectHref);
          setPilotSurveyOpen(true);
          setQuickSubmitting(false);
          return;
        }
        router.replace(redirectHref);
      } catch (error) {
        setQuickSubmitting(false);
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "Request timed out check your connection and try again."
            : error instanceof Error
              ? error.message
              : "We couldn't submit your quiz. Please try again.";
        setSubmitError(message);
      }
      return;
    }

    const startedAt = Date.now();
    setLoading(true);
    setLoadingProgress(8);
    setLoadingImages([]);
    setLoadingSlow(false);
    setSubmitError(null);

    let progressValue = 8;
    const progressTimer = window.setInterval(() => {
      progressValue = Math.min(
        progressValue + (progressValue < 58 ? 7 : progressValue < 82 ? 4 : 2),
        94,
      );
      setLoadingProgress(progressValue);
    }, 260);

    const slowTimer = window.setTimeout(() => {
      setLoadingSlow(true);
    }, SLOW_LOADING_MS);

    /** Browser timer id (`window.setTimeout` returns a number in the DOM typings). */
    let navFallbackTimer: number | undefined;

    try {
      const response = await fetch(submitUrl, buildRequestInit());

      if (!response.ok) {
        const errorText = await response.text();
        const message = isWaitlist
          ? formatWaitlistPreviewApiError(errorText, response.status)
          : errorText || "We couldn't save your quiz right now.";
        throw new Error(message);
      }

      const result = (await response.json()) as QuizResultResponse;
      setLoadingImages(mapLoadingImages(result));

      const remainingDelay = Math.max(MIN_LOADING_MS - (Date.now() - startedAt), 0);
      if (remainingDelay > 0) {
        await delay(remainingDelay);
      }

      window.clearInterval(progressTimer);
      window.clearTimeout(slowTimer);
      setLoadingProgress(100);
      onComplete?.(result);

      if (isWaitlist && onWaitlistSubmitSuccess) {
        const raw = result as QuizResultResponse & {
          preference_analytics?: PreferenceAnalyticsData | null;
          scent_profile?: WaitlistQuizSuccessPayload["scent_profile"];
        };
        onWaitlistSubmitSuccess({
          recommendations: raw.recommendations ?? [],
          answers: buildPayload(answers).answers,
          preference_analytics: raw.preference_analytics ?? null,
          scent_profile: raw.scent_profile ?? null,
        });
        setLoading(false);
        setLoadingSlow(false);
        return;
      }

      const nextHref = afterSubmitHref ?? "/for-you";
      if (pilotSurveyAfterSubmit && isWaitlist) {
        setLoading(false);
        setLoadingSlow(false);
        setPostQuizHref(nextHref);
        setPilotSurveyOpen(true);
        return;
      }
      window.setTimeout(() => {
        router.replace(nextHref);
      }, 380);
      // Client transitions can stall when the destination RSC tree is heavy; full navigation
      // guarantees exit from this loading shell (fixes "stuck at 100%").
      navFallbackTimer = window.setTimeout(() => {
        if (window.location.pathname.endsWith("/quiz")) {
          window.location.assign(nextHref);
        }
      }, 5000);
    } catch (error) {
      if (navFallbackTimer !== undefined) {
        window.clearTimeout(navFallbackTimer);
      }
      window.clearInterval(progressTimer);
      window.clearTimeout(slowTimer);
      setLoading(false);
      setLoadingSlow(false);
      setLoadingProgress(7);
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Request timed out check your connection and try again."
          : error instanceof Error
            ? error.message
            : "We couldn't submit your quiz. Please try again.";
      setSubmitError(message);
    }
  };

  goNextRef.current = () => {
    void goNext();
  };

  const advanceWhenMultiComplete = () => {
    window.setTimeout(() => goNextRef.current(), 220);
  };

  const skipStep = () => {
    if (!OPTIONAL_STEPS.has(stepKey) || loading || quickSubmitting) return;

    if (stepKey === "age") {
      setAnswers((current) => ({ ...current, age: "" }));
    }

    if (stepKey === "anchorPerfumes") {
      setAnswers((current) => ({
        ...current,
        anchorPerfumeIds: [],
        preferencesFromAnchors: false,
      }));
    }

    setDirection(1);
    if (stepIndex < TOTAL_STEPS - 1) {
      setStepIndex((current) => current + 1);
    } else {
      void goNext();
    }
  };

  if (quickSubmitting) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#F7F3F0] via-[#F5F0EC] to-[#F2EDE7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B85A3A]/25 border-t-[#B85A3A]" />
      </div>
    );
  }

  if (loading) {
    return (
      <QuizLoadingScreen
        perfumeImages={loadingImages}
        progress={loadingProgress}
        isSlow={loadingSlow}
        title="Analyzing your preferences"
      />
    );
  }

  const variants = {
    enter: (currentDirection: number) => ({
      opacity: 0,
      x: currentDirection > 0 ? 48 : -48,
      scale: 0.98,
    }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (currentDirection: number) => ({
      opacity: 0,
      x: currentDirection > 0 ? -48 : 48,
      scale: 0.98,
    }),
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#FAF7F4] via-[#F6F1EC] to-[#F0E9E2]">
      {pilotSurveyOpen && postQuizHref ? (
        <QuizPilotSurveyModal
          navigateHref={postQuizHref}
          onClose={() => {
            setPilotSurveyOpen(false);
            setPostQuizHref(null);
          }}
          router={router}
        />
      ) : null}
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-[#B85A3A]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#D4A574]/7 blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-[#8B9E7E]/5 blur-[80px]" />
      </div>
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <QuizStepFrame
            canContinue={canContinue(stepKey, answers)}
            continueLabel={stepIndex === TOTAL_STEPS - 1 ? "SEE MY MATCHES" : "CONTINUE"}
            onBack={goBack}
            onContinue={() => {
              void goNext();
            }}
            onSkip={OPTIONAL_STEPS.has(stepKey) ? skipStep : undefined}
            progressLabel={progressLabel}
            progressPercent={((stepIndex + 1) / TOTAL_STEPS) * 100}
            submitError={submitError}
            subtitle={
              stepKey === "gender" ? (
                <div className="space-y-4 text-center">
                  <p className="font-display text-lg leading-snug text-[#1A1A1A] sm:text-xl">
                    Your ex forgot your preferences.
                    <br />
                    <span className="text-[#B85A3A]">We never will.</span>
                  </p>
                  <p className="text-[15px] leading-relaxed text-[#5F5C57]">
                    The internet has opinions. Your skin has answers. Tell us how you live. We match
                    you to a fragrance that belongs on you, not just on a shelf. No influencer. No
                    guesswork. Just data from people who actually wear it.
                  </p>
                </div>
              ) : stepKey === "age" ? (
                <p className="mx-auto max-w-xl text-center text-[15px] leading-relaxed text-[#5F5C57]">
                  Optional pick the band that fits best, or use{" "}
                  <span className="font-semibold text-[#1A1A1A]">Skip</span> /{" "}
                  <span className="font-semibold text-[#1A1A1A]">Continue</span> to leave it blank.
                  We use this only to tune recommendations, not for third-party ads.
                </p>
              ) : undefined
            }
            title={
              {
                gender: "What type of fragrance are you looking for?",
                anchorPerfumes: "Which perfumes do you already love?",
                families: "Which scent families appeal to you?",
                likedNotes: "Pick your favourite note groups",
                scentStyle: "Which types of scents do you gravitate towards?",
                occasions: "When do you usually wear fragrance?",
                experience: "How would you describe your fragrance habits?",
                longevity: "How long should your fragrance last?",
                intensity: "How strong do you like your fragrance?",
                age: "Which age range fits you?",
                mood: "How do you want your scent to make you feel?",
              }[stepKey]
            }
          >
            {stepKey === "gender" ? (
              <TypeA
                options={GENDER_OPTIONS}
                selected={answers.preferredGender}
                onSelect={(value) => selectSingle("preferredGender", value)}
              />
            ) : null}

            {stepKey === "anchorPerfumes" ? (
              <QuizAnchorPerfumePicker
                catalog={anchorCatalog}
                selectedIds={answers.anchorPerfumeIds}
                onToggle={toggleAnchorPerfume}
              />
            ) : null}

            {stepKey === "families" ? (
              <TypeD
                options={SCENT_FAMILY_OPTIONS}
                selected={answers.scentFamilies}
                onToggle={(value) => toggleMulti("scentFamilies", value)}
                maxSelect={10}
                onFilledToMax={advanceWhenMultiComplete}
                hint={
                  answers.preferencesFromAnchors
                    ? "Pre-filled from your picks tap to adjust (up to 10)"
                    : "Pick up to 10 broad families, matched to our catalogue"
                }
              />
            ) : null}

            {stepKey === "likedNotes" ? (
              <TypeD
                options={NOTE_GROUP_OPTIONS}
                selected={answers.likedNotes}
                onToggle={(value) => toggleMulti("likedNotes", value)}
                maxSelect={8}
                onFilledToMax={advanceWhenMultiComplete}
                hint={
                  answers.preferencesFromAnchors
                    ? "Pre-filled from your bottles tap to adjust (up to 8)"
                    : "Pick up to 8 top, heart & base notes (Scent Finder coverage)"
                }
              />
            ) : null}

            {stepKey === "scentStyle" ? (
              <TypeC
                options={SCENT_STYLE_OPTIONS}
                selected={answers.scentStyle}
                onSelect={(value) => selectSingle("scentStyle", value)}
              />
            ) : null}

            {stepKey === "occasions" ? (
              <TypeB
                options={OCCASION_OPTIONS}
                selected={answers.occasions}
                onToggle={(value) => toggleMulti("occasions", value)}
                maxSelect={3}
                onFilledToMax={advanceWhenMultiComplete}
              />
            ) : null}

            {stepKey === "experience" ? (
              <TypeC
                options={experienceOptions}
                selected={answers.experienceLevel}
                onSelect={(value) => selectSingle("experienceLevel", value)}
              />
            ) : null}

            {stepKey === "longevity" ? (
              <TypeF
                options={LONGEVITY_OPTIONS}
                selected={answers.longevity}
                onSelect={(value) => selectSingle("longevity", value)}
              />
            ) : null}

            {stepKey === "intensity" ? (
              <TypeF
                options={INTENSITY_OPTIONS}
                selected={answers.intensity}
                onSelect={(value) => selectSingle("intensity", value)}
              />
            ) : null}

            {stepKey === "age" ? (
              <TypeF
                options={AGE_RANGE_OPTIONS}
                selected={answers.age || null}
                showLevelBar={false}
                onSelect={(value) => selectSingle("age", value)}
              />
            ) : null}

            {stepKey === "mood" ? (
              <TypeB
                options={MOOD_OPTIONS}
                selected={answers.moods}
                onToggle={(value) => toggleMulti("moods", value)}
                maxSelect={2}
                onFilledToMax={advanceWhenMultiComplete}
              />
            ) : null}
          </QuizStepFrame>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuizPilotSurveyModal({
  navigateHref,
  onClose,
  router,
}: {
  navigateHref: string;
  onClose: () => void;
  router: { replace: (href: string) => void };
}) {
  const [tooLong, setTooLong] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const finish = async (sendSurvey: boolean) => {
    setSaving(true);
    try {
      if (sendSurvey) {
        await fetch("/api/waitlist-preview/quiz/survey", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getPreviewAuthHeaders(),
          },
          body: JSON.stringify({
            too_long_rating: tooLong,
            irrelevant_tags: tags,
            free_text: freeText.slice(0, 2000),
          }),
        });
      }
    } catch {
      /* non-blocking */
    } finally {
      onClose();
      router.replace(navigateHref);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E8DFD8] bg-[#FDFBF8] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B85A3A]">
          Quick pilot check-in
        </p>
        <h2 className="mt-2 font-display text-xl text-[#1A1A1A]">
          How was the quiz?
        </h2>
        <p className="mt-2 text-sm text-[#5F5C57]">
          This helps us trim noise before launch. Optional skip anytime.
        </p>

        <p className="mt-5 text-xs font-semibold text-[#1A1A1A]">
          Felt too long? (1 = not at all, 5 = very)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTooLong(n)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                tooLong === n
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-white text-[#5F5C57] ring-1 ring-[#E5DED4]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold text-[#1A1A1A]">
          Anything feel irrelevant?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { id: "too_many_steps", label: "Too many steps" },
            { id: "irrelevant_questions", label: "Irrelevant questions" },
            { id: "unclear_options", label: "Unclear answer options" },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleTag(o.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tags.includes(o.id)
                  ? "bg-[#B85A3A] text-white"
                  : "bg-white text-[#5F5C57] ring-1 ring-[#E5DED4]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-semibold text-[#1A1A1A]">
          Anything else? (optional)
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-[#E5DED4] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none ring-0 focus:border-[#B85A3A]"
            placeholder="Short notes help us ship faster…"
          />
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(false)}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-[#8A7A72] hover:bg-white/80"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(true)}
            className="rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-bold tracking-wide text-white hover:bg-[#B85A3A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuizStepFrameProps {
  canContinue: boolean;
  children: ReactNode;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  progressLabel: string;
  progressPercent: number;
  submitError: string | null;
  title: string;
  /** Optional narrative or context below the step title (e.g. quiz intro on gender step). */
  subtitle?: ReactNode;
}

function QuizStepFrame({
  canContinue,
  children,
  continueLabel,
  onBack,
  onContinue,
  onSkip,
  progressLabel,
  progressPercent,
  submitError,
  title,
  subtitle,
}: QuizStepFrameProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-8 sm:pt-7">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8D4C4] bg-white/80 text-[#8A6A5D] shadow-sm backdrop-blur-sm transition-all hover:border-[#B85A3A] hover:text-[#B85A3A] active:scale-95"
          aria-label="Go back"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Progress bar center */}
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#EDE0D8]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#B85A3A] to-[#D4845E]"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </div>

        <div className="rounded-full border border-[#E8D4C4] bg-white/80 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#8A6A5D] backdrop-blur-sm">
          {progressLabel}
        </div>
      </div>

      {/* ─── Content area ─── */}
      <div className="flex flex-1 flex-col">
        {/* Title block */}
        <div className="pt-7 pb-5 sm:pt-9 sm:pb-6">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[1.6rem] font-bold leading-[1.2] tracking-tight text-[#1A1A1A] sm:text-[2.1rem]"
            >
              {title}
            </motion.h1>
            {subtitle ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="pt-1"
              >
                {subtitle}
              </motion.div>
            ) : null}
            {submitError && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-xl rounded-2xl border border-[#E7CBC0] bg-[#FFF7F4] px-5 py-2.5 text-center text-sm text-[#9C4A2E]"
              >
                {submitError}
              </motion.p>
            )}
          </div>
        </div>

        {/* Question component */}
        <div className="w-full">{children}</div>

        {/* Spacer */}
        <div className="flex-1 min-h-6" />

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-3 pt-6 pb-2">
          <motion.button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            whileHover={canContinue ? { scale: 1.02 } : {}}
            whileTap={canContinue ? { scale: 0.97 } : {}}
            className="w-full max-w-xs rounded-2xl bg-[#1A1A1A] px-6 py-4 text-[13px] font-bold tracking-[0.18em] text-white shadow-md transition-all hover:bg-[#B85A3A] hover:shadow-[0_8px_24px_rgba(184,90,58,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D3D0CD] disabled:shadow-none"
          >
            {continueLabel}
          </motion.button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-[#A09088] underline underline-offset-4 decoration-[#D0CBC6] hover:text-[#B85A3A] hover:decoration-[#B85A3A] transition-colors"
            >
              Skip this step
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
