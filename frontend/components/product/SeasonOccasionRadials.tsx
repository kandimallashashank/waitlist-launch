'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface SeasonOccasionRadialsProps {
  seasons?: string[] | Record<string, number>;
  occasions?: Record<string, number> | string[];
}

const SEASON_COLORS: Record<string, string> = {
  spring: '#8B9E7E',
  summer: '#D4A574',
  fall: '#B85A3A',
  autumn: '#B85A3A',
  winter: '#6B8CAE',
  monsoon: '#7B9BAA',
};

const OCCASION_COLORS: Record<string, string> = {
  office: '#6B8CAE',
  daily: '#8B9E7E',
  date: '#B85A3A',
  party: '#D4A574',
  wedding: '#A04D2F',
  formal: '#7B9BAA',
  casual: '#8B9E7E',
  evening: '#6B8CAE',
  sport: '#D4A574',
};

const SEASON_ICONS: Record<string, string> = {
  spring: '\u{1F338}',
  summer: '\u{2600}\u{FE0F}',
  fall: '\u{1F342}',
  autumn: '\u{1F342}',
  winter: '\u{2744}\u{FE0F}',
  monsoon: '\u{1F327}\u{FE0F}',
};

interface GaugeEntry {
  name: string;
  value: number;
  color: string;
  icon?: string;
}

function normalizeSeasons(seasons: string[] | Record<string, number> | undefined): GaugeEntry[] {
  if (!seasons) return [];
  if (Array.isArray(seasons)) {
    return seasons
      .filter(k => !['day', 'night'].includes(k.toLowerCase()))
      .map(k => ({
        name: k,
        value: 80,
        color: SEASON_COLORS[k.toLowerCase()] || '#8B9E7E',
        icon: SEASON_ICONS[k.toLowerCase()],
      }));
  }
  return Object.entries(seasons)
    .filter(([k]) => !['day', 'night'].includes(k.toLowerCase()))
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([k, v]) => ({
      name: k,
      value: Number(v),
      color: SEASON_COLORS[k.toLowerCase()] || '#8B9E7E',
      icon: SEASON_ICONS[k.toLowerCase()],
    }));
}

/**
 * Returns day vs night scores when present on the seasons map (some feeds tag these).
 */
function getDayNightFromSeasons(seasons?: string[] | Record<string, number>): { day: number; night: number } | null {
  if (!seasons || Array.isArray(seasons)) return null;
  const lower = Object.fromEntries(
    Object.entries(seasons).map(([k, v]) => [k.toLowerCase(), Number(v)])
  ) as Record<string, number>;
  const day = lower.day;
  const night = lower.night;
  if (day == null && night == null) return null;
  if (Number.isNaN(day ?? 0) && Number.isNaN(night ?? 0)) return null;
  return { day: day ?? 0, night: night ?? 0 };
}

function normalizeOccasions(occasions: Record<string, number> | string[] | undefined): GaugeEntry[] {
  if (!occasions) return [];
  if (Array.isArray(occasions)) {
    return occasions.map(k => ({
      name: k,
      value: 80,
      color: OCCASION_COLORS[k.toLowerCase()] || '#6B8CAE',
    }));
  }
  return Object.entries(occasions)
    .filter(([, v]) => Number(v) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 6)
    .map(([k, v]) => ({
      name: k,
      value: Number(v),
      color: OCCASION_COLORS[k.toLowerCase()] || '#6B8CAE',
    }));
}

function RadialGauge({ entry, delay }: { entry: GaugeEntry; delay: number }) {
  const size = 72;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (entry.value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${entry.name}: ${entry.value}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E5E5"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={entry.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay, duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-neutral-900">{entry.value}%</span>
        </div>
      </div>
      <div className="text-center">
        {entry.icon && <span className="text-xs">{entry.icon} </span>}
        <span className="text-[11px] font-medium text-neutral-800 capitalize">{entry.name}</span>
      </div>
    </div>
  );
}

function formatInsightList(names: string[], max: number): string {
  const slice = names.slice(0, max);
  if (slice.length === 0) return '';
  if (slice.length === 1) return slice[0];
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(', ')}, and ${slice[slice.length - 1]}`;
}

export default function SeasonOccasionRadials({ seasons, occasions }: SeasonOccasionRadialsProps) {
  const seasonEntries = normalizeSeasons(seasons);
  const occasionEntries = normalizeOccasions(occasions);
  const dayNight = getDayNightFromSeasons(seasons);

  const insightText = useMemo(() => {
    const sE = normalizeSeasons(seasons);
    const oE = normalizeOccasions(occasions);
    const sNames = sE.map((e) => e.name);
    const oNames = oE.map((e) => e.name);
    if (sNames.length === 0 && oNames.length === 0) return null;
    const parts: string[] = [];
    if (sNames.length) {
      parts.push(`Shines in ${formatInsightList(sNames, 4)} weather`);
    }
    if (oNames.length) {
      parts.push(`a natural fit for ${formatInsightList(oNames, 3)}`);
    }
    return parts.join(' ');
  }, [seasons, occasions]);

  if (!seasonEntries.length && !occasionEntries.length) return null;

  return (
    <div className="flex h-full min-h-[200px] flex-col">
      <div className="space-y-5">
        {seasonEntries.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-700">Best Worn In</h3>
            <div className="flex flex-wrap justify-start gap-4">
              {seasonEntries.map((entry, i) => (
                <RadialGauge key={entry.name} entry={entry} delay={i * 0.1} />
              ))}
            </div>
          </div>
        )}

        {occasionEntries.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-700">Best For</h3>
            <div className="flex flex-wrap justify-start gap-4">
              {occasionEntries.map((entry, i) => (
                <RadialGauge key={entry.name} entry={entry} delay={seasonEntries.length * 0.1 + i * 0.1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {dayNight && (dayNight.day > 0 || dayNight.night > 0) && (
        <div className="mt-4 rounded-xl border border-neutral-200/70 bg-white/60 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Day vs evening</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              <span className="w-14 text-xs text-neutral-700">Day</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                <motion.div
                  className="h-full rounded-full bg-amber-500/90"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, dayNight.day)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums text-neutral-800">{dayNight.day}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
              <span className="w-14 text-xs text-neutral-700">Evening</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                <motion.div
                  className="h-full rounded-full bg-indigo-500/85"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, dayNight.night)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
                />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums text-neutral-800">{dayNight.night}%</span>
            </div>
          </div>
        </div>
      )}

      {insightText && (
        <div className="mt-auto border-t border-neutral-200/60 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">At a glance</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{insightText}.</p>
        </div>
      )}
    </div>
  );
}
