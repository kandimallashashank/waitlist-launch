'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wind, Clock, DollarSign, Users, Droplets } from 'lucide-react';

interface InfoCard {
  longevity_score: number;
  longevity_label?: string;
  sillage_score: number;
  sillage_label?: string;
  accords?: string[];
  performance_notes?: string;
  concentration?: string;
}

interface PerformanceMetricsProps {
  sillage?: number;
  longevity_hours?: number;
  price_value?: number;
  gender_score?: number;
  accords?: string[];
  fragrance?: {
    info_card?: InfoCard | null;
  } | null;
  /** Tighter spacing and scroll cap for quick view / modals. */
  compact?: boolean;
  /** Max accord rows (default 12). */
  accordMax?: number;
}

function genderLabel(score: number): string {
  if (score <= 2) return 'Feminine';
  if (score <= 4) return 'More Feminine';
  if (score <= 6) return 'Unisex';
  if (score <= 8) return 'More Masculine';
  return 'Masculine';
}

function priceValueLabel(score: number): string {
  if (score <= 2) return 'Overpriced';
  if (score <= 4) return 'Below Average';
  if (score <= 6) return 'Fair Value';
  if (score <= 8) return 'Good Value';
  return 'Great Value';
}

export default function PerformanceMetrics({
  sillage,
  longevity_hours,
  price_value,
  gender_score,
  accords,
  fragrance,
  compact = false,
  accordMax = 12,
}: PerformanceMetricsProps) {
  const info = fragrance?.info_card ?? null;

  const metrics: {
    label: string;
    value: number;
    max: number;
    icon: typeof Wind;
    color: string;
    description: string;
    hint: string;
  }[] = [];

  const longevityVal = info
    ? (info.longevity_score != null ? (info.longevity_score / 10) * 24 : undefined)
    : longevity_hours;
  if (longevityVal != null && !Number.isNaN(longevityVal)) {
    metrics.push({
      label: 'Longevity',
      value: Math.round(longevityVal * 10) / 10,
      max: 24,
      icon: Clock,
      color: '#8B9E7E',
      description: info?.longevity_label || `${Math.round(longevityVal)} hours wear time`,
      hint: 'How long the scent lasts',
    });
  }

  const sillageVal = info?.sillage_score ?? sillage;
  if (sillageVal != null && !Number.isNaN(sillageVal)) {
    metrics.push({
      label: 'Sillage',
      value: sillageVal,
      max: 10,
      icon: Wind,
      color: '#B85A3A',
      description: info?.sillage_label || 'Projection strength',
      hint: 'How far the scent travels',
    });
  }

  if (price_value != null && !Number.isNaN(price_value)) {
    metrics.push({
      label: 'Price Value',
      value: price_value,
      max: 10,
      icon: DollarSign,
      color: '#D4A574',
      description: priceValueLabel(price_value),
      hint: 'Bang for your buck',
    });
  }

  if (gender_score != null && !Number.isNaN(gender_score)) {
    metrics.push({
      label: 'Gender',
      value: gender_score,
      max: 10,
      icon: Users,
      color: '#A04D2F',
      description: genderLabel(gender_score),
      hint: '5 = perfectly unisex',
    });
  }

  const allAccords = Array.from(
    new Set([...(accords || []), ...(info?.accords || [])].map((a) => a.trim()).filter(Boolean))
  ).slice(0, accordMax);

  const concentration = (info?.concentration || '').trim();
  const performanceNotes = (info?.performance_notes || '').trim();

  if (metrics.length === 0 && allAccords.length === 0 && !concentration && !performanceNotes) return null;

  return (
    <div
      className={
        compact
          ? 'flex min-h-0 flex-col gap-2'
          : 'flex h-full min-h-[220px] flex-col gap-4'
      }
    >
      {/* Metric bars */}
      {metrics.length > 0 && (
        <div className={compact ? 'space-y-2' : 'space-y-5'}>
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            const percentage = (metric.value / metric.max) * 100;

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                className={compact ? 'space-y-1.5' : 'space-y-2'}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className={`shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} style={{ color: metric.color }} />
                    <div className="min-w-0">
                      <p className={`font-semibold text-neutral-900 ${compact ? 'text-[11px]' : 'text-xs'}`}>{metric.label}</p>
                      <p className={`text-neutral-600 ${compact ? 'text-[9px] leading-tight' : 'text-[10px]'}`}>{metric.hint}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`font-bold text-neutral-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {metric.label === 'Longevity' ? `${metric.value}h` : metric.value.toFixed(1)}
                      <span className={`text-neutral-600 ml-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>/{metric.max}</span>
                    </span>
                    <p className={`text-neutral-500 ${compact ? 'text-[9px] leading-tight' : 'text-[10px]'}`}>{metric.description}</p>
                  </div>
                </div>
                <div className={`w-full bg-neutral-200 rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: metric.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Accord strength bars extra top spacing when stacked under metrics */}
      {allAccords.length > 0 && (
        <div
          className={
            compact
              ? 'space-y-1.5'
              : metrics.length > 0
                ? 'mt-8 space-y-3 border-t border-neutral-200/50 pt-7'
                : 'space-y-2.5'
          }
        >
          <h4 className={`font-semibold uppercase tracking-wider text-neutral-900 ${compact ? 'text-[10px]' : 'text-xs'}`}>Accords</h4>
          {!compact && (
            <p className="text-[10px] leading-snug text-neutral-500">Relative prominence (strongest at the top).</p>
          )}
          <div
            className={`grid gap-1.5 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible ${
              compact ? 'max-h-[112px]' : 'max-h-[220px]'
            }`}
          >
            {allAccords.map((accord, i) => {
              const strength = Math.max(22, 100 - i * 8);
              return (
                <div key={accord} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-[5.5rem] shrink-0 truncate text-xs capitalize text-neutral-700 sm:w-24">{accord}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 sm:h-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, #B85A3A, #D4A574)`,
                        opacity: 0.55 + (strength / 100) * 0.45,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength}%` }}
                      transition={{ delay: 0.25 + i * 0.04, duration: 0.45, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(concentration || performanceNotes) && (
        <div className={`mt-auto border-t border-neutral-200/60 ${compact ? 'space-y-2 pt-2' : 'space-y-3 pt-4'}`}>
          {concentration && (
            <div
              className={`rounded-xl border border-[#B85A3A]/15 bg-gradient-to-br from-white/90 to-[#FDF6F3] shadow-sm ${
                compact ? 'p-2' : 'p-3'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-[#B85A3A]/10 ${
                    compact ? 'h-6 w-6' : 'h-8 w-8'
                  }`}
                >
                  <Droplets className={compact ? 'h-3 w-3 text-[#9A3D26]' : 'h-4 w-4 text-[#9A3D26]'} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Concentration</p>
                  <p className={`mt-0.5 font-medium text-neutral-900 ${compact ? 'text-xs' : 'text-sm'}`}>{concentration}</p>
                  {!compact && (
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
                      Higher oil % usually means richer scent and longer wear; lighter concentrations feel airier.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {performanceNotes && (
            <div className={`rounded-xl border border-neutral-200/80 bg-white/70 ${compact ? 'p-2' : 'p-3'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Expert note</p>
              <p
                className={`mt-1 text-neutral-700 ${compact ? 'line-clamp-3 text-xs leading-snug' : 'mt-2 text-sm leading-relaxed'}`}
              >
                {performanceNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {!concentration && !performanceNotes && metrics.length > 0 && allAccords.length === 0 && (
        <p className="mt-auto border-t border-neutral-200/50 pt-3 text-[11px] leading-relaxed text-neutral-500">
          Bars compare this fragrance to typical ranges in our catalog. Layer them with the note pyramid for a full
          picture.
        </p>
      )}
    </div>
  );
}
