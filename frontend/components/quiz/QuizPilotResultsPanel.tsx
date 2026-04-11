'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Sparkles, ArrowRight, RotateCcw, FlaskConical, Info, X, Share2 } from 'lucide-react';

import { ScentDnaShareModal } from '@/components/share/ScentDnaShareModal';
import ScentProfileChart from '@/components/profile/ScentProfileChart';
import type { PreferenceAnalyticsData } from '@/components/preferences/PreferenceAnalyticsCollapsible';
import {
  pilotAnswersToScentChartPreferences,
  quizAnswersToPilotPreferences,
} from '@/lib/waitlist/quizResultMappers';
import { buildWhyThesePicksCopy } from '@/lib/waitlist/quizRecommendationWhyCopy';
import { buildScentDnaCardData } from '@/lib/waitlist/scentDnaCardData';
import type { QuizAnswersPayload } from '@/lib/waitlist/quizPipeline';
import { createProductUrl } from '@/utils';
import { getPerfumesAsync, getPerfumesSync } from '@/lib/perfumeData';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { cn } from '@/lib/utils';

export interface QuizPilotRecommendation {
  id?: string;
  slug?: string | null;
  brand: string;
  name: string;
  image_url?: string | null;
  /** Some API paths expose the PLP field name; prefer with ``image_url`` (same as catalog). */
  primary_image_url?: string | null;
  match_score?: number;
  match_reasons?: string[];
  scent_family?: string | null;
  info_card?: {
    longevity_score: number;
    longevity_label?: string;
    sillage_score: number;
    sillage_label?: string;
    accords?: string[];
    performance_notes?: string;
    concentration?: string;
  } | null;
}

/**
 * Resolves a displayable image URL from a quiz recommendation (parity with PLP row mapping).
 */
function quizRecommendationImageRaw(
  r: QuizPilotRecommendation & Record<string, unknown>,
): string | null {
  const primary =
    typeof r.primary_image_url === 'string' ? r.primary_image_url.trim() : '';
  const legacy = typeof r.image_url === 'string' ? r.image_url.trim() : '';
  const loose =
    typeof r['imageUrl'] === 'string' ? String(r['imageUrl']).trim() : '';
  return primary || legacy || loose || null;
}

export interface QuizPilotResultsPanelProps {
  recommendations: QuizPilotRecommendation[];
  answers: QuizAnswersPayload;
  preference_analytics: PreferenceAnalyticsData | null;
  scent_profile: Record<string, unknown> | null;
  onRetakeQuiz: () => void;
  /** Gift finder uses recipient-oriented copy; default is the personal scent quiz. */
  resultsVariant?: "quiz" | "gift";
  /** Waitlist full name from session (first word used on share card). */
  shareDisplayName?: string | null;
}

type PerfumeCardLike = {
  id?: string;
  primary_image_url?: string;
  image_url?: string;
};

/**
 * Builds id → image URL from catalog cards (same source as shop PLP).
 */
function catalogImageUrlById(cards: PerfumeCardLike[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of cards) {
    const id = p.id != null ? String(p.id) : '';
    const raw = p.primary_image_url ?? p.image_url;
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (id && url) {
      m.set(id, url);
    }
  }
  return m;
}

/**
 * Fills missing ``image_url`` on quiz rows using the same FastAPI catalog as ``/catalog``.
 */
function mergeQuizRecsWithCatalogImages(
  recs: QuizPilotRecommendation[],
  byId: Map<string, string>,
): QuizPilotRecommendation[] {
  return recs.map((r) => {
    if (!r.id) {
      return r;
    }
    if (quizRecommendationImageRaw(r as QuizPilotRecommendation & Record<string, unknown>)) {
      return r;
    }
    const url = byId.get(r.id);
    return url ? { ...r, image_url: url } : r;
  });
}

/** Deterministic warm gradient per rank position ensures every card looks great even without an image */
const CARD_GRADIENTS = [
  'from-[#2A1A10] via-[#4A2A1A] to-[#1A0E08]',
  'from-[#0F1A2A] via-[#1A2A3A] to-[#0A1018]',
  'from-[#1A1A0A] via-[#2A2A14] to-[#0E0E08]',
  'from-[#2A0A1A] via-[#3A1428] to-[#180810]',
  'from-[#0A1A1A] via-[#142828] to-[#081010]',
  'from-[#1A100A] via-[#2A1A10] to-[#100A06]',
];

function ProductImageFallback({
  rank,
  brand,
  name,
  className,
}: {
  rank: number;
  brand: string;
  name: string;
  /** e.g. z-0 when a product image is layered above this fallback */
  className?: string;
}) {
  const gradient = CARD_GRADIENTS[(rank - 1) % CARD_GRADIENTS.length];
  return (
    <div
      className={cn(
        `absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-3 p-4`,
        className,
      )}
    >
      <FlaskConical className="w-10 h-10 text-white/25" />
      <div className="text-center">
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">{brand}</p>
        <p className="text-white/25 text-[9px] mt-0.5 line-clamp-2 leading-snug">{name}</p>
      </div>
    </div>
  );
}

/**
 * Quiz result tile image well: same proxy + multiply treatment as catalog PLP cards.
 * Gradient fallback sits under the photo so the bottle stays visible (was covered when
 * fallback was painted after the image).
 */
function QuizResultProductCardImageArea({
  rank,
  brand,
  name,
  imageSrc,
  matchScore,
}: {
  rank: number;
  brand: string;
  name: string;
  imageSrc: string | null;
  matchScore?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedSrc = imageSrc?.trim() || null;
  const showImg = Boolean(resolvedSrc && !imageFailed);

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-[#F5EFE8] to-[#EDE6DF] sm:aspect-[3/4]">
      <span className="absolute left-2.5 top-2.5 z-20 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#1A1A1A]/85 px-2 text-[10px] font-bold tabular-nums text-white shadow-md backdrop-blur-sm">
        #{rank}
      </span>

      {showImg && resolvedSrc ? (
        /* Light well only same as PLP card. Do not stack the dark gradient under the
         * image: mix-blend-mode multiply would blend against it and hide the bottle. */
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-[#F8F4F0] to-[#EFE8E0] p-3 sm:p-4">
          <img
            src={resolvedSrc}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.06]"
            style={{ mixBlendMode: 'multiply' }}
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : (
        <ProductImageFallback rank={rank} brand={brand} name={name} />
      )}


    </div>
  );
}

/**
 * Inline info card shown below the product name on quiz result tiles.
 * Displays longevity, sillage, top accords, and concentration at a glance.
 */
function QuizInfoCardInline({
  info_card,
  scent_family,
}: {
  info_card: NonNullable<QuizPilotRecommendation['info_card']>;
  scent_family?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1.5 w-full">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="inline-flex items-center gap-1 rounded-md bg-[#F5EFE8] px-2 py-0.5 text-[10px] font-semibold text-[#8A6A5D] transition-colors hover:bg-[#EDE4DA] hover:text-[#B85A3A]"
      >
        <Info className="h-3 w-3" />
        {open ? 'Hide details' : 'Scent details'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="mt-1.5 space-y-1.5 rounded-lg border border-[#EDE0D8] bg-[#FAF7F4] p-2.5 text-[11px]">
              {/* Longevity + Sillage */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="text-[#8A7A72]">Longevity</span>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-1 flex-1 rounded-full bg-[#E8D4C4]">
                      <div
                        className="h-1 rounded-full bg-[#B85A3A]"
                        style={{ width: `${Math.min(100, (info_card.longevity_score / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {info_card.longevity_score.toFixed(1)}
                    </span>
                  </div>
                  {info_card.longevity_label && (
                    <span className="text-[10px] capitalize text-[#8A7A72]">{info_card.longevity_label}</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-[#8A7A72]">Sillage</span>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-1 flex-1 rounded-full bg-[#E8D4C4]">
                      <div
                        className="h-1 rounded-full bg-[#D4A574]"
                        style={{ width: `${Math.min(100, (info_card.sillage_score / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {info_card.sillage_score.toFixed(1)}
                    </span>
                  </div>
                  {info_card.sillage_label && (
                    <span className="text-[10px] capitalize text-[#8A7A72]">{info_card.sillage_label}</span>
                  )}
                </div>
              </div>

              {/* Accords */}
              {info_card.accords && info_card.accords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {info_card.accords.slice(0, 4).map((a) => (
                    <span key={a} className="rounded-full border border-[#E8D4C4] bg-white px-1.5 py-0.5 text-[10px] capitalize text-[#5C3A28]">
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Concentration + Scent family */}
              <div className="flex flex-wrap gap-2">
                {info_card.concentration && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A7A72]">
                    {info_card.concentration}
                  </span>
                )}
                {scent_family && (
                  <span className="rounded-full bg-[#B85A3A]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#B85A3A]">
                    {scent_family}
                  </span>
                )}
              </div>

              {/* Performance notes */}
              {info_card.performance_notes && (
                <p className="text-[10px] italic text-[#8A7A72]">{info_card.performance_notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const RESULTS_COPY = {
  quiz: {
    pill: "Curated for you",
    title: "Your top picks",
    subtitleAfterCount: "matches based on your quiz answers",
    note: "Catalogue prices and blind buy scores elsewhere are pilot testing values; notes, accords, and brands are from our real data.",
    statPills: [
      { label: "Personalised", sub: "To your profile" },
      { label: "Scent DNA", sub: "Mapped from quiz" },
      { label: "Retake anytime", sub: "Refine results" },
    ] as const,
    empty: "No matches returned try retaking the quiz or check that the catalog API is configured.",
    analysisTitle: "Your scent profile",
    whyTitle: "Why we picked these for you",
    prefsTitle: "Your preferences",
    savedTitle: "Saved for this pilot",
    savedBody:
      "These preferences are stored with your waitlist session and power the matches above.",
    retake: "Retake quiz",
  },
  gift: {
    pill: "Gift shortlist",
    title: "Their top gift picks",
    subtitleAfterCount: "ideas based on how you described them",
    note: "Pilot catalogue pricing is for testing; fragrance data is real. Your personal scent quiz profile stays separate.",
    statPills: [
      { label: "Tailored", sub: "From your answers" },
      { label: "Scent DNA", sub: "Inferred profile" },
      { label: "Try again", sub: "New recipient" },
    ] as const,
    empty: "No matches returned - try again with different answers or browse the catalog.",
    analysisTitle: "Their scent profile",
    whyTitle: "Why we think they'll like these",
    prefsTitle: "What you told us",
    savedTitle: "About this gift run",
    savedBody:
      "Gift answers are not saved as your personal quiz profile. Retake anytime for another recipient.",
    retake: "Find another gift",
  },
} as const;

/**
 * Gift results hero copy by recipient gender (matches ``preferred_gender`` on API answers).
 */
function giftResultsHero(preferredGender: string | null | undefined): {
  title: string;
  subtitleAfterCount: string;
  statTailoredSub: string;
} {
  const g = (preferredGender ?? "").toLowerCase().trim();
  if (g === "men") {
    return {
      title: "His top gift picks",
      subtitleAfterCount:
        "masculine-leaning matches for him - your final shortlist from this gift run",
      statTailoredSub: "Filtered for him",
    };
  }
  if (g === "women") {
    return {
      title: "Her top gift picks",
      subtitleAfterCount:
        "feminine-leaning matches for her - your final shortlist from this gift run",
      statTailoredSub: "Filtered for her",
    };
  }
  return {
    title: "Their top gift picks (unisex focus)",
    subtitleAfterCount:
      "unisex-friendly and versatile matches - wider net than him/her-only - your final shortlist",
    statTailoredSub: "Unisex & versatile pool",
  };
}

export function QuizPilotResultsPanel({
  recommendations,
  answers,
  preference_analytics,
  scent_profile,
  onRetakeQuiz,
  resultsVariant = "quiz",
  shareDisplayName = null,
}: QuizPilotResultsPanelProps) {
  const copy = RESULTS_COPY[resultsVariant];
  const giftHero =
    resultsVariant === "gift" ? giftResultsHero(answers.preferred_gender) : null;
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  /** Merged with PLP catalog so image URLs match ``/catalog`` when quiz payload omits them. */
  const [displayRecommendations, setDisplayRecommendations] =
    useState<QuizPilotRecommendation[]>(recommendations);

  useEffect(() => {
    setDisplayRecommendations(
      mergeQuizRecsWithCatalogImages(
        recommendations,
        catalogImageUrlById(getPerfumesSync()),
      ),
    );

    let cancelled = false;
    void (async () => {
      try {
        const cards = await getPerfumesAsync();
        if (cancelled) {
          return;
        }
        setDisplayRecommendations(
          mergeQuizRecsWithCatalogImages(
            recommendations,
            catalogImageUrlById(cards),
          ),
        );
      } catch {
        /* keep sync-merged rows */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recommendations]);

  const preferences = useMemo(() => quizAnswersToPilotPreferences(answers), [answers]);
  const scentChartPrefs = useMemo(() => pilotAnswersToScentChartPreferences(answers), [answers]);
  const whyThesePicks = useMemo(
    () => buildWhyThesePicksCopy(answers, resultsVariant),
    [answers, resultsVariant],
  );
  const aiSummaryBlurb =
    typeof preference_analytics?.ai_summary === "string"
      ? preference_analytics.ai_summary.trim()
      : "";
  const whyThesePicksParagraph = (aiSummaryBlurb || whyThesePicks.paragraph).trim();

  const dnaPayload = useMemo(
    () => buildScentDnaCardData(preference_analytics, answers),
    [preference_analytics, answers],
  );
  const shareFirstName =
    (shareDisplayName ?? "").trim().split(/\s+/).filter(Boolean)[0] || "Friend";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F5F2EE] pb-24">

      {/* ── Page hero strip matches catalog style ── */}
      <div className="relative overflow-hidden border-b border-[#E8DDD5] bg-[#F5F2EE] px-4 py-8 sm:px-6 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.09)_0%,transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(ellipse,rgba(212,165,116,0.07)_0%,transparent_70%)]" aria-hidden />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#B85A3A]/20 bg-[#B85A3A]/8 px-3 py-1">
                <Sparkles className="h-3 w-3 text-[#B85A3A]" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">{copy.pill}</span>
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-[#1A1A1A] sm:text-3xl">
                {giftHero?.title ?? copy.title}
              </h1>
              <p className="mt-1 text-sm text-[#6B6560]">
                <span className="font-semibold text-[#1A1A1A]">{displayRecommendations.length}</span>{" "}
                {giftHero?.subtitleAfterCount ?? copy.subtitleAfterCount}
              </p>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#6B6560]">
                {copy.note}
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2">
              {[...copy.statPills].map(({ label, sub }) => {
                const subFinal =
                  resultsVariant === "gift" && giftHero && label === "Tailored"
                    ? giftHero.statTailoredSub
                    : sub;
                return (
                  <div
                    key={label}
                    className="rounded-xl border border-[#E4D9D0] bg-white/70 px-3 py-2 backdrop-blur-sm"
                  >
                    <p className="text-xs font-semibold text-[#1A1A1A]">{label}</p>
                    <p className="text-[10px] text-[#8A7A72]">{subFinal}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-8 sm:px-6">

        {/* ── Share fragrance DNA (2:3 card, matches apps/web profile DNA card) ── */}
        <section
          className="mb-8 rounded-2xl border border-[#E8D4C4] bg-gradient-to-br from-white via-[#FFFBF8] to-[#F5EDE6] p-5 shadow-sm sm:p-6"
          aria-labelledby="waitlist-share-dna-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B85A3A]/90">
                Share
              </p>
              <h2
                id="waitlist-share-dna-heading"
                className="mt-1 font-display text-lg font-bold text-[#1A1A1A] sm:text-xl"
              >
                Your fragrance DNA card
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#6B6560]">
                Save a share image that matches your ScentRev profile DNA card — warm
                cream background, terracotta bars, and only what fits on the card.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#2d2d2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85A3A]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share DNA card
            </button>
          </div>
        </section>

        {/* ── Why these picks (plain language; no KPI scores) ── */}
        <section
          className="mb-10 rounded-2xl border border-[#E8D4C4] bg-white/90 p-5 shadow-sm sm:mb-12 sm:p-6"
          aria-labelledby="waitlist-why-these-picks-heading"
        >
          <h2
            id="waitlist-why-these-picks-heading"
            className="font-display text-lg font-bold text-[#1A1A1A] sm:text-xl"
          >
            {copy.whyTitle}
          </h2>
          {whyThesePicksParagraph ? (
            <p className="mt-3 border-l-2 border-[#B85A3A] pl-3 text-sm leading-relaxed text-[#404040]">
              {whyThesePicksParagraph}
            </p>
          ) : null}
        </section>

        {/* ── Recommendation grid ── */}
        <section className="mb-16 sm:mb-20">
          {displayRecommendations.length === 0 ? (
            <div className="rounded-3xl border border-[#E8D4C4] bg-white/80 p-12 text-center shadow-sm">
              <FlaskConical className="mx-auto mb-4 h-10 w-10 text-[#D4B8A4]" />
              <p className="text-sm leading-relaxed text-[#8A6A5D]">
                {copy.empty}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
              {displayRecommendations.map((r, i) => {
                const href = r.id ? createProductUrl(r.id, r.slug ?? undefined) : null;
                const rawImg = quizRecommendationImageRaw(
                  r as QuizPilotRecommendation & Record<string, unknown>,
                );
                /* Same proxy path as Waitlist catalog marquee no mat= knockout (avoids heavy WebP path). */
                const src = rawImg ? getProxiedImageUrl(rawImg) ?? rawImg : null;

                const cardInner = (
                  <>
                    <QuizResultProductCardImageArea
                      rank={i + 1}
                      brand={r.brand}
                      name={r.name}
                      imageSrc={src}
                      matchScore={r.match_score}
                    />
                    <div className="flex flex-1 flex-col border-t border-[#EDE0D8]/80 bg-white/95 px-3 py-3 sm:px-3.5 sm:py-3.5">
                      <p className="line-clamp-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#B85A3A]">
                        {r.brand}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1A1A1A] sm:text-sm">
                        {r.name}
                      </p>
                      {r.match_reasons && r.match_reasons.length > 0 && (
                        <div className="mt-2 border-t border-[#F0E8E2] pt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#B85A3A]">
                            Why this match
                          </p>
                          <ul className="mt-1 space-y-1">
                            {r.match_reasons.slice(0, 3).map((reason, ri) => (
                              <li
                                key={ri}
                                className="flex gap-1.5 text-[11px] leading-snug text-[#5C3A28]"
                              >
                                <Check
                                  className="mt-0.5 h-3 w-3 shrink-0 text-[#8B9E7E]"
                                  aria-hidden
                                />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.info_card && (
                        <QuizInfoCardInline
                          info_card={r.info_card}
                          scent_family={r.scent_family}
                        />
                      )}
                    </div>
                  </>
                );

                const cardClass =
                  'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#EDE0D8]/80 bg-white shadow-[0_4px_20px_-6px_rgba(26,26,26,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D4B8A4] hover:shadow-[0_16px_40px_-10px_rgba(184,90,58,0.22)]';

                return (
                  <motion.li
                    key={r.id ?? `${r.brand}-${r.name}-${i}`}
                    className="min-w-0 flex flex-col"
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), type: 'spring', stiffness: 340, damping: 26 }}
                  >
                    {href ? (
                      <Link href={href} className={cardClass}>{cardInner}</Link>
                    ) : (
                      <div className={cardClass}>{cardInner}</div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Scent profile ── */}
        <motion.section
          className="mb-14 space-y-6 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B85A3A]/80">Analysis</p>
            <h2 className="font-display text-xl font-bold text-[#1A1A1A] sm:text-2xl">{copy.analysisTitle}</h2>
          </div>
          <ScentProfileChart preferences={scentChartPrefs} />
        </motion.section>

        {/* ── Preferences collapsible ── */}
        <motion.section
          className="mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            onClick={() => setPrefsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#E8D4C4] bg-white/90 px-5 py-4 text-left shadow-sm transition-all hover:border-[#D4B8A4] hover:shadow-md"
            aria-expanded={prefsOpen}
          >
            <span className="font-display text-base font-bold text-[#1A1A1A] sm:text-lg">
              {copy.prefsTitle}
            </span>
            <motion.div animate={{ rotate: prefsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-5 w-5 text-[#8A6A5D]" aria-hidden />
            </motion.div>
          </button>

          <AnimatePresence>
            {prefsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-4 rounded-2xl border border-[#EDE0D8] bg-white/95 p-4 shadow-sm sm:p-5">
                  {/* Notes pyramid */}
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { label: 'Top notes', notes: preferences.top_notes, color: 'text-[#B85A3A]', bg: 'bg-[#FDF6F3]', border: 'border-[#F0D1C1]', dot: 'bg-[#B85A3A]' },
                      { label: 'Middle notes', notes: preferences.middle_notes, color: 'text-[#A04D2F]', bg: 'bg-[#FDF6F3]/80', border: 'border-[#F0D1C1]/80', dot: 'bg-[#D4A574]' },
                      { label: 'Base notes', notes: preferences.base_notes, color: 'text-[#7A3A23]', bg: 'bg-[#FFF7ED]/80', border: 'border-[#F0D1C1]/60', dot: 'bg-[#D4A574]' },
                    ].map(({ label, notes, color, bg, border, dot }) => (
                      <div key={label} className={`rounded-xl border ${border} ${bg} p-3`}>
                        <h4 className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                          {label}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {notes.length > 0 ? notes.map((note) => (
                            <span key={note} className="rounded border border-[#E8D4C4] bg-white px-2 py-0.5 text-xs capitalize text-[#5C3A28]">
                              {note}
                            </span>
                          )) : (
                            <span className="text-xs text-[#A09088]">Not selected</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Families + mood */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: 'Scent families', items: preferences.scent_families },
                      { label: 'Mood & vibe', items: preferences.mood_preferences },
                      { label: 'Occasions', items: preferences.preferred_occasions },
                      { label: 'Seasons', items: preferences.preferred_seasons },
                    ].map(({ label, items }) => (
                      <div key={label} className="rounded-xl border border-[#EDE0D8] bg-white p-3">
                        <h4 className="mb-2 text-sm font-semibold text-[#1A1A1A]">{label}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {items.length > 0 ? items.map((item) => (
                            <span key={item} className="rounded-full border border-[#E8D4C4] bg-[#FDF6F3] px-2.5 py-0.5 text-xs font-medium capitalize text-[#B85A3A]">
                              {item}
                            </span>
                          )) : (
                            <span className="text-xs text-[#A09088]">Not selected</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Saved note */}
                  <div className="flex items-start gap-3 rounded-xl border border-[#E8D4C4] bg-[#FDF6F3] p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B85A3A]">
                      <Check className="h-4 w-4 text-white" aria-hidden />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1A1A]">{copy.savedTitle}</h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#8A6A5D]">
                        {copy.savedBody}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── CTAs ── */}
        <motion.div
          className="flex flex-col items-stretch justify-center gap-3 border-t border-[#EDE0D8] pt-10 sm:flex-row sm:items-center sm:gap-4"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <Link
            href="/catalog"
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1A1A1A] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#B85A3A] hover:shadow-[0_8px_24px_rgba(184,90,58,0.3)] sm:w-auto"
          >
            Browse full catalog
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onRetakeQuiz}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#1A1A1A]/15 bg-white px-8 py-3.5 text-sm font-bold text-[#1A1A1A] shadow-sm transition-all hover:border-[#B85A3A] hover:text-[#B85A3A] sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {copy.retake}
          </button>
        </motion.div>
      </div>

      <ScentDnaShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        data={dnaPayload}
        variant={resultsVariant}
        displayName={shareFirstName}
      />
    </div>
  );
}
