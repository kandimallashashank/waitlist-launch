'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Dna, ChevronDown } from 'lucide-react';
import NotePyramid from './NotePyramid';
import SeasonOccasionRadials from './SeasonOccasionRadials';
import PerformanceMetrics from './PerformanceMetrics';

interface FragranceDNAProps {
  notes_top?: string | string[];
  notes_middle?: string | string[];
  notes_base?: string | string[];
  notes?: { top?: string | string[]; middle?: string | string[]; base?: string | string[] };
  seasons?: string[] | Record<string, number>;
  occasions?: Record<string, number> | string[];
  main_accords?: string[];
  sillage?: number;
  longevity_hours?: number;
  price_value?: number;
  gender_score?: number;
  pros?: string[];
  cons?: string[];
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

export default function FragranceDNA({
  notes,
  notes_top,
  notes_middle,
  notes_base,
  seasons,
  occasions,
  main_accords,
  sillage,
  longevity_hours,
  price_value,
  gender_score,
  info_card,
  pros = [],
  cons = [],
}: FragranceDNAProps) {
  const [isOpen, setIsOpen] = useState(false);

  const parseList = (value?: string | string[]): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  };

  const topNotes = parseList(notes?.top || notes_top);
  const middleNotes = parseList(notes?.middle || notes_middle);
  const baseNotes = parseList(notes?.base || notes_base);

  const hasNotes = !!(notes?.top || notes?.middle || notes?.base || notes_top || notes_middle || notes_base);
  const hasSeasons = !!(seasons && (Array.isArray(seasons) ? seasons.length : Object.keys(seasons).length));
  const hasOccasions = !!(occasions && (Array.isArray(occasions) ? occasions.length : Object.keys(occasions).length));
  const hasPerformance = !!(sillage || longevity_hours || price_value || gender_score || info_card);
  const hasAccords = !!(main_accords?.length || info_card?.accords?.length);
  const hasPros = pros.length > 0;
  const hasCons = cons.length > 0;

  const summaryChips = useMemo(() => {
    const chips: string[] = [];

    const firstTop = topNotes[0];
    const firstHeart = middleNotes[0];
    const firstBase = baseNotes[0];
    if (firstTop || firstHeart || firstBase) {
      const noteTrail = [firstTop, firstHeart, firstBase].filter(Boolean).join(' -> ');
      chips.push(`Scent journey: ${noteTrail}`);
    }

    if (hasSeasons && seasons) {
      if (Array.isArray(seasons) && seasons.length > 0) {
        chips.push(`Best in: ${seasons[0]}`);
      } else if (!Array.isArray(seasons)) {
        const topSeason = Object.entries(seasons).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
        if (topSeason) chips.push(`Best in: ${topSeason}`);
      }
    }

    if (hasOccasions && occasions) {
      if (Array.isArray(occasions) && occasions.length > 0) {
        chips.push(`Perfect for: ${occasions[0]}`);
      } else if (!Array.isArray(occasions)) {
        const topOccasion = Object.entries(occasions).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
        if (topOccasion) chips.push(`Perfect for: ${topOccasion}`);
      }
    }

    const accord = info_card?.accords?.[0] || main_accords?.[0];
    if (accord) chips.push(`Vibe: ${accord}`);
    if (chips.length === 0) chips.push('Explore notes, occasions, and character');
    return chips.slice(0, 3);
  }, [
    topNotes,
    middleNotes,
    baseNotes,
    hasSeasons,
    seasons,
    hasOccasions,
    occasions,
    info_card?.accords,
    main_accords,
  ]);

  if (!hasNotes && !hasSeasons && !hasOccasions && !hasPerformance && !hasAccords && !hasPros && !hasCons) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-gradient-to-b from-[#FDF8F4] via-[#FBF4EE] to-[#F7EDE4] p-4 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_40px_-12px_rgba(90,60,40,0.12)] md:p-6"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C45C3E]/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#8B9E7E]/[0.08] blur-3xl"
        aria-hidden
      />

      <div className="relative">
        {!isOpen && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-0.5 rounded-xl"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(184,90,58,0.0)',
                '0 0 0 3px rgba(184,90,58,0.14)',
                '0 0 0 0 rgba(184,90,58,0.0)',
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          whileHover={{ y: -1, scale: 1.003 }}
          whileTap={{ scale: 0.997 }}
          className="group w-full rounded-xl border border-white/75 bg-white/60 p-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85A3A]/45 md:p-4"
          aria-expanded={isOpen}
          aria-controls="fragrance-dna-panel"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 shadow-sm">
              <Dna className="h-5 w-5 text-[#9A3D26]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-neutral-900 md:text-xl">
                    Fragrance DNA
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    Open for notes, season fit, and performance details.
                  </p>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-500"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-neutral-200/80 bg-white/80 px-2.5 py-1 text-[11px] text-neutral-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="fragrance-dna-panel"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="relative mt-4 grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5">
              {hasNotes && (
                <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/60 bg-white/40 p-3 shadow-sm backdrop-blur-sm md:p-4">
                  <NotePyramid
                    notes={notes}
                    notes_top={notes_top}
                    notes_middle={notes_middle}
                    notes_base={notes_base}
                  />
                </div>
              )}

              {(hasSeasons || hasOccasions) && (
                <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-sm md:p-5">
                  <h3 className="font-display mb-0.5 text-sm font-semibold text-neutral-900">Where it shines</h3>
                  <p className="mb-4 text-xs text-neutral-500">Seasons and occasions that suit this fragrance.</p>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <SeasonOccasionRadials seasons={seasons} occasions={occasions} />
                  </div>
                </div>
              )}

              {(hasPerformance || hasAccords) && (
                <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-sm md:p-5">
                  <h3 className="font-display mb-0.5 text-sm font-semibold text-neutral-900">Performance</h3>
                  <p className="mb-4 text-xs text-neutral-500">Wear time, projection, and character.</p>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <PerformanceMetrics
                      sillage={sillage}
                      longevity_hours={longevity_hours}
                      price_value={price_value}
                      gender_score={gender_score}
                      accords={main_accords}
                      fragrance={info_card ? { info_card } : null}
                    />
                  </div>
                </div>
              )}
            </div>

            {(hasPros || hasCons) && (
              <div className="relative mt-5 border-t border-neutral-200/70 pt-4">
                <h3 className="mb-3 font-display text-sm font-semibold text-neutral-900">What to know</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {hasPros && (
                    <div className="rounded-xl border border-[#8B9E7E]/20 bg-white/70 p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B9E7E]/12">
                          <ThumbsUp className="h-3.5 w-3.5 text-[#5F7352]" strokeWidth={2} />
                        </div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#5F7352]">The good</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-neutral-700">
                            <span className="mt-0.5 flex-shrink-0 text-[#8B9E7E]">&#10003;</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hasCons && (
                    <div className="rounded-xl border border-[#B85A3A]/18 bg-white/70 p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B85A3A]/10">
                          <ThumbsDown className="h-3.5 w-3.5 text-[#9A3D26]" strokeWidth={2} />
                        </div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9A3D26]">Heads up</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-neutral-700">
                            <span className="mt-0.5 flex-shrink-0 text-[#B85A3A]">&#10007;</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hasPros && !hasCons && (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-neutral-200/90 bg-white/30 p-4">
                      <p className="text-xs italic text-neutral-500">No known drawbacks</p>
                    </div>
                  )}
                  {!hasPros && hasCons && (
                    <div className="order-first flex items-center justify-center rounded-xl border border-dashed border-neutral-200/90 bg-white/30 p-4">
                      <p className="text-xs italic text-neutral-500">Pros not yet reviewed</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
