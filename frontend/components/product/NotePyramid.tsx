'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Info, Clock3 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NotePyramidProps {
  notes?: { top?: string | string[]; middle?: string | string[]; base?: string | string[] };
  notes_top?: string | string[];
  notes_middle?: string | string[];
  notes_base?: string | string[];
}

/** Tier metadata for note presentation cards. */
const TIERS = [
  {
    key: 'top' as const,
    label: 'Top',
    timing: '0–15 min',
    subtitle: 'First impression',
    accent: 'from-[#C45C3E]/15 via-[#C45C3E]/8 to-white',
    border: 'border-[#C45C3E]/30',
    labelColor: 'text-[#9A3D26]',
    chipBg: 'bg-white',
    chipBorder: 'border-[#C45C3E]/20',
    chipText: 'text-[#7A3320]',
    marker: 'bg-[#C45C3E]',
  },
  {
    key: 'middle' as const,
    label: 'Heart',
    timing: '15 min – 4 hrs',
    subtitle: 'The story unfolds',
    accent: 'from-[#C49A6C]/18 via-[#C49A6C]/8 to-white',
    border: 'border-[#C49A6C]/35',
    labelColor: 'text-[#8B6235]',
    chipBg: 'bg-white',
    chipBorder: 'border-[#C49A6C]/25',
    chipText: 'text-[#6B4A28]',
    marker: 'bg-[#C49A6C]',
  },
  {
    key: 'base' as const,
    label: 'Base',
    timing: '4+ hours',
    subtitle: 'What lingers on skin',
    accent: 'from-[#7A6555]/16 via-[#7A6555]/8 to-white',
    border: 'border-[#7A6555]/30',
    labelColor: 'text-[#5C4A3D]',
    chipBg: 'bg-white',
    chipBorder: 'border-[#7A6555]/20',
    chipText: 'text-[#4A3D32]',
    marker: 'bg-[#7A6555]',
  },
];

function parseNotes(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((n) => n.trim()).filter(Boolean);
  return val.split(',').map((n) => n.trim()).filter(Boolean);
}

function NotesInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-500 shadow-sm transition hover:border-[#C45C3E]/30 hover:text-[#9A3D26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C45C3E]/40"
          aria-label="Learn about fragrance notes"
        >
          <Info className="h-4 w-4" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] border border-neutral-200/80 bg-white p-4 shadow-xl" align="start" sideOffset={8}>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-900">What are fragrance notes?</h4>
          <p className="text-sm leading-relaxed text-neutral-600">
            Perfumes unfold in three layers: top notes arrive first and fade, heart notes define the character, and base
            notes anchor the scent and last longest on your skin.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function NotePyramid({ notes, notes_top, notes_middle, notes_base }: NotePyramidProps) {
  const noteData = {
    top: parseNotes(notes?.top || notes_top),
    middle: parseNotes(notes?.middle || notes_middle),
    base: parseNotes(notes?.base || notes_base),
  };

  if (!noteData.top.length && !noteData.middle.length && !noteData.base.length) return null;

  const tierContent: Record<'top' | 'middle' | 'base', string[]> = noteData;

  return (
    <div className="relative">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-neutral-900 md:text-lg">Note pyramid</h3>
          <p className="mt-1 text-sm text-neutral-500">A layered read of how this scent evolves on skin.</p>
        </div>
        <NotesInfoPopover />
      </div>

      <div className="relative pl-5">
        <div className="pointer-events-none absolute left-[0.44rem] top-2 bottom-2 w-px bg-gradient-to-b from-[#C45C3E]/35 via-[#C49A6C]/35 to-[#7A6555]/30" />
        <div className="space-y-3.5">
          {TIERS.map((tier, tierIndex) => {
            const items = tierContent[tier.key];
            if (items.length === 0) return null;

            return (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: tierIndex * 0.05 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[1.125rem] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-[#FBF4EE] ${tier.marker}`}
                  aria-hidden
                />
                <div
                  className={`overflow-hidden rounded-xl border bg-gradient-to-r p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_20px_-10px_rgba(0,0,0,0.1)] md:p-4 ${tier.accent} ${tier.border}`}
                >
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${tier.labelColor}`}>{tier.label}</span>
                      <span className="text-xs text-neutral-600">{tier.subtitle}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                      <Clock3 className="h-3.5 w-3.5" />
                      {tier.timing}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="list">
                    {items.map((note, j) => (
                      <li key={j}>
                        <span
                          className={`inline-flex w-full max-w-full items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium leading-tight shadow-sm ${tier.chipBg} ${tier.chipBorder} ${tier.chipText}`}
                        >
                          {note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
