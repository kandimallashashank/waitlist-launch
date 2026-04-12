'use client';

/**
 * Sillage and longevity blocks for PDP "At a Glance": mini bar + scale labels + tooltip
 * so shoppers understand projection vs wear time (aligned with Layering Lab MetricBar hints).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock3, HelpCircle, Wind } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SILLAGE_HELP =
  'Sillage (say "see-yazh") is projection: how far the scent travels from your skin. A low score stays closer to you; a high score is easier for others to notice across the room. This score is out of 10.';

const LONGEVITY_HELP =
  'Longevity is about how long the scent stays noticeable on your skin, in hours. Real wear varies with skin, weather, and how much you apply. This value is a catalogue estimate for the pilot.';

/** Short hover text for header stat pills (matches At a Glance). */
export const PDP_HOVER_SILLAGE =
  'Sillage is projection: how far the scent carries from your skin. Score out of 10.';
export const PDP_HOVER_LONGEVITY =
  'Longevity: estimated hours the scent stays noticeable on skin (pilot estimate).';

function LabelWithTip({
  label,
  micro,
  tooltip,
  icon: Icon,
}: {
  label: string;
  micro: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-[#B85A3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A]/40"
                aria-label={`What is ${label}?`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[min(18rem,calc(100vw-2rem))] text-left text-xs leading-snug">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-neutral-500">{micro}</p>
      </div>
      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
    </div>
  );
}

/** Single horizontal bar with optional endpoint labels (like the gender spectrum on PDP). */
function MetricScaleBar({
  pct,
  barClassName,
}: {
  pct: number;
  barClassName: string;
}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-2">
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200/90">
        <motion.div
          className={`h-full rounded-full ${barClassName}`}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function AtGlanceSillageCard({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="min-w-0 rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5"
    >
      <LabelWithTip
        label="Sillage"
        micro="Projection, scored out of 10"
        tooltip={SILLAGE_HELP}
        icon={Wind}
      />
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-neutral-800">{value}/10</p>
      <MetricScaleBar pct={pct} barClassName="bg-[#B85A3A]/90" />
      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-neutral-400">
        <span>Close to skin</span>
        <span>Room filling</span>
      </div>
    </motion.div>
  );
}

const LONGEVITY_BAR_MAX_H = 24;

export function AtGlanceLongevityCard({ hours }: { hours: number }) {
  const rounded = Math.round(hours);
  const pct = Math.max(0, Math.min(100, (Math.min(hours, LONGEVITY_BAR_MAX_H) / LONGEVITY_BAR_MAX_H) * 100));
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="min-w-0 rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5"
    >
      <LabelWithTip
        label="Longevity"
        micro="Estimated wear on skin (hours)"
        tooltip={LONGEVITY_HELP}
        icon={Clock3}
      />
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-neutral-800">{rounded} hrs</p>
      <MetricScaleBar pct={pct} barClassName="bg-[#A04D2F]/90" />
      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-neutral-400">
        <span>Brief</span>
        <span>All day ({LONGEVITY_BAR_MAX_H}h scale)</span>
      </div>
      {hours > LONGEVITY_BAR_MAX_H ? (
        <p className="mt-1 text-[10px] leading-snug text-neutral-500">
          Above {LONGEVITY_BAR_MAX_H}h the bar stays full; the number is still the estimate.
        </p>
      ) : null}
    </motion.div>
  );
}

/** Wrap the At a Glance row that contains {@link AtGlanceSillageCard} / {@link AtGlanceLongevityCard} tooltips. */
export function AtGlanceTooltipsProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}
