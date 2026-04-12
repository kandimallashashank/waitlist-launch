'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus, X, Layers, Sparkles, Search, ShoppingCart, ExternalLink, Check, Bookmark, BookmarkCheck, Info, Clock, ChevronDown, ChevronUp,
  Heart, AlertTriangle, ThermometerSun, Snowflake, Sun, Moon, Sunset, TrendingUp, Zap, Asterisk,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/AppContext';
import { useAppContext } from '@/contexts/AppContext';
import { Cart } from '@/api/base44Client';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getAccessToken } from '@/lib/supabase';
import {
  formatWaitlistPreviewApiError,
  getPreviewAuthHeaders,
} from '@/lib/waitlist/previewSessionClient';
import { createProductUrl } from '@/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
  RadarChart, Radar, PolarGrid, PolarRadiusAxis,
} from 'recharts';
import {
  CuratedCombosIntro,
  CuratedCombosSection,
} from '@/components/layering/CuratedCombosSection';
import { GradientFeatureAnnouncePill } from '@/components/promos/GradientFeatureAnnouncePill';
import { PRODUCT_IMAGE_WELL_CLASS } from '@/lib/productCardVisual';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { AnimatedGradientText } from '@/registry/magicui/animated-gradient-text';
import { WaitlistGate } from '@/components/waitlist/WaitlistGate';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const IS_WAITLIST_PREVIEW =
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === 'true' ||
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === '1';

const LAYERING_ANALYZE_URL = IS_WAITLIST_PREVIEW
  ? '/api/waitlist-preview/layering/analyze'
  : `${API}/api/v1/layering/analyze`;

/** Waitlist pilot: search + prefill read Supabase via Next (no FastAPI). */
const LAYERING_SEARCH_URL = IS_WAITLIST_PREVIEW
  ? '/api/waitlist-preview/layering/search'
  : `${API}/api/v1/layering/search`;

const LAYERING_SAVED_COMBOS_URL = '/api/waitlist-preview/layering/saved-combos';

/** Pilot waitlist: max blends persisted in Supabase per email. */
const PILOT_MAX_SAVED_BLENDS = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fragrance {
  id: string;
  name: string;
  brand_name: string;
  primary_image_url?: string;
  price_3ml?: number;
  price_8ml?: number;
  price_12ml?: number;
  scent_family?: string;
  sillage?: number;
  longevity_hours?: number;
  gender_score?: number;
  main_accords?: string[];
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  concentration?: string;
}

interface DominantAccord {
  accord: string;
  count: number;
  dominance_pct: number;
  descriptor: string;
}

interface AnalysisResult {
  harmony_score: number;
  harmony_label?: string;
  harmony_description?: string;
  compatibility_score: number | null;
  compatibility_label: string | null;
  compatibility_reasons: string[];
  ai_powered?: boolean;
  dominant_accords: DominantAccord[];
  blended_notes: { top: string[]; middle: string[]; base: string[] };
  performance: {
    sillage: number;
    longevity_hours: number;
    gender_score: number;
    gender_label: string;
  };
  best_seasons: { season: string; score: number }[];
  best_occasions: { occasion: string; score: number }[];
  summary: string;
  tips: string[];
  fragrance_count: number;
  fragrances: Fragrance[];
  score_components?: {
    shared_notes: number;
    shared_accords: number;
    concentration_harmony: number;
    gender_harmony: number;
    performance_balance: number;
    heritage_bonus: number;
  };
  heritage_match?: string | null;
  balance_note?: string;
  /** Rich AI-only dashboard (Groq); null when using algorithm fallback. */
  blend_insights?: {
    compliment_potential: {
      score: number;
      label: string;
      crowd_pleasing_accords_detected: string[];
      rationale: string;
    };
    fatigue_risk: {
      level: 'Low' | 'Moderate' | 'High' | string;
      rationale: string;
      signals: string[];
    };
    projection_curve: {
      pattern: string;
      headline: string;
      detail: string;
    };
    longevity_stability: {
      evenness: string;
      rationale: string;
      longest_lingering: string | null;
    };
    clash_warnings: Array<{ pair: string; warning: string; severity: string }>;
    synergy_highlights: string[];
    climate_suitability: {
      hot_humid: string;
      cold_dry: string;
      overall_tip: string;
    };
    time_of_day_fit: {
      morning: number;
      daytime: number;
      evening: number;
      night: number;
      summary: string;
    };
  } | null;
  /** Present when analyze succeeds; daily cap metadata from API. */
  rate_limit?: {
    limit: number;
    remaining: number;
    resets_at_utc: string;
  };
}

/** UUID format expected by GET /api/v1/fragrances/{id}. */
const FRAGRANCE_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Map GET /fragrances/{id} JSON into the Layering Lab slot shape.
 *
 * Args:
 *     api: Raw JSON object from the fragrance detail endpoint.
 *
 * Returns:
 *     Fragrance for slots/analyze, or null if id is missing.
 */
function mapFragranceDetailToLayering(api: Record<string, unknown>): Fragrance | null {
  const id = api.id;
  if (typeof id !== 'string' || !id.trim()) {
    return null;
  }
  const img = api.primary_image_url ?? api.image_url;
  const toStrArr = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  const brandName =
    typeof api.brand_name === 'string'
      ? api.brand_name
      : typeof api.brand === 'string'
        ? api.brand
        : '';
  const concentration =
    typeof api.concentration === 'string'
      ? api.concentration
      : typeof api.type === 'string'
        ? api.type
        : undefined;
  return {
    id,
    name: typeof api.name === 'string' ? api.name : 'Fragrance',
    brand_name: brandName,
    primary_image_url: typeof img === 'string' ? img : undefined,
    price_3ml: typeof api.price_3ml === 'number' ? api.price_3ml : undefined,
    price_8ml: typeof api.price_8ml === 'number' ? api.price_8ml : undefined,
    price_12ml: typeof api.price_12ml === 'number' ? api.price_12ml : undefined,
    scent_family: typeof api.scent_family === 'string' ? api.scent_family : undefined,
    sillage: typeof api.sillage === 'number' ? api.sillage : undefined,
    longevity_hours: typeof api.longevity_hours === 'number' ? api.longevity_hours : undefined,
    gender_score: typeof api.gender_score === 'number' ? api.gender_score : undefined,
    main_accords: toStrArr(api.main_accords),
    notes_top: toStrArr(api.notes_top),
    notes_middle: toStrArr(api.notes_middle),
    notes_base: toStrArr(api.notes_base),
    concentration,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function harmonyColor(score: number) {
  if (score >= 93) return '#047857';
  if (score >= 80) return '#22c55e';
  if (score >= 68) return '#84cc16';
  if (score >= 52) return '#f59e0b';
  if (score >= 35) return '#f97316';
  return '#ef4444';
}

function harmonyLabel(score: number) {
  if (score >= 93) return 'Exceptional';
  if (score >= 80) return 'Excellent';
  if (score >= 68) return 'Harmonious';
  if (score >= 52) return 'Compatible';
  if (score >= 35) return 'Adventurous';
  return 'Contrasting';
}

function compatibilityColor(score: number) {
  if (score >= 86) return '#4f46e5';
  if (score >= 72) return '#6366f1';
  if (score >= 56) return '#8b5cf6';
  if (score >= 40) return '#a78bfa';
  return '#c4b5fd';
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Application order labels for the three layering slots (perfumer-style). */
const SLOT_CONFIG = [
  { step: '1', title: 'First on skin', hint: 'Apply first lighter, more volatile notes.' },
  { step: '2', title: 'Middle layer', hint: 'Bridges between your opening and base.' },
  { step: '3', title: 'Anchor', hint: 'Apply last depth, fixatives, and staying power.' },
] as const;

function normalizeNoteKey(n: string): string {
  return n.toLowerCase().trim();
}

/**
 * Notes that appear in two or more fragrances vs notes unique to a single bottle.
 *
 * Args:
 *     fragrances: Selected fragrances with optional note pyramids.
 *
 * Returns:
 *     Shared and contrasting note lists (normalized, display-cased).
 */
function computeNoteOverlap(fragrances: Fragrance[]): { shared: string[]; contrasting: string[] } {
  if (fragrances.length < 2) {
    return { shared: [], contrasting: [] };
  }
  const perFragSets = fragrances.map((f) => {
    const set = new Set<string>();
    for (const n of [...(f.notes_top || []), ...(f.notes_middle || []), ...(f.notes_base || [])]) {
      set.add(normalizeNoteKey(n));
    }
    return set;
  });
  const counts = new Map<string, number>();
  for (const set of perFragSets) {
    for (const n of set) {
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  }
  const shared = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .map(([n]) => n)
    .sort();
  const contrasting = [...counts.entries()]
    .filter(([, c]) => c === 1)
    .map(([n]) => n)
    .sort();
  return {
    shared: shared.slice(0, 14).map((n) => capitalize(n)),
    contrasting: contrasting.slice(0, 14).map((n) => capitalize(n)),
  };
}

/**
 * Which fragrance most aligns with dominant accords (blend "leans toward").
 *
 * Args:
 *     fragrances: Fragrances in the blend.
 *     dominant: Dominant accords from analysis.
 *
 * Returns:
 *     Leader fragrance if scores diverge; balanced flag when scores are close.
 */
function computeBlendLean(
  fragrances: Fragrance[],
  dominant: DominantAccord[],
): { leader: Fragrance | null; isBalanced: boolean } {
  if (fragrances.length === 0) {
    return { leader: null, isBalanced: true };
  }
  if (fragrances.length === 1) {
    return { leader: fragrances[0], isBalanced: true };
  }
  const scores = fragrances.map((f) => {
    const acc = new Set((f.main_accords || []).map((a) => normalizeNoteKey(a)));
    let score = 0;
    for (const d of dominant) {
      const a = normalizeNoteKey(d.accord);
      if (acc.has(a)) {
        score += d.dominance_pct;
      }
    }
    return { f, score };
  });
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0].score;
  const second = scores[1]?.score ?? 0;
  const isBalanced = top === 0 || top - second < 8;
  return { leader: isBalanced ? null : scores[0].f, isBalanced };
}

function formatConcentration(raw?: string | null): string | null {
  if (raw == null || !String(raw).trim()) return null;
  return String(raw).trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricBar({ label, value, max, unit = '', color = '#B85A3A', hint }: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
  /** Short explanation for hover / screen readers. */
  hint?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#404040] inline-flex items-center gap-1">
          {label}
          {hint ? (
            <span
              className="inline-flex text-gray-400 hover:text-[#B85A3A] transition-colors"
              title={hint}
              aria-label={hint}
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          ) : null}
        </span>
        <span className="font-semibold text-[#1A1A1A]">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function AccordPill({ accord, pct }: { accord: string; pct: number }) {
  const hue = Math.abs(accord.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  return (
    <div className="flex items-center gap-2 bg-[#FDF6F3] rounded-full px-3 py-1.5">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: `hsl(${hue}, 55%, 52%)` }}
      />
      <span className="text-sm font-medium text-[#1A1A1A]">{capitalize(accord)}</span>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

function AccordRadialChart({ accords }: { accords: DominantAccord[] }) {
  const data = accords.map((d) => ({
    name: capitalize(d.accord),
    value: d.dominance_pct,
    fill: `hsl(${Math.abs(d.accord.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 55%, 52%)`,
  }));
  const chartHeight = Math.min(340, Math.max(160, 96 + accords.length * 22));
  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="18%"
          outerRadius="92%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={4} />
          <Tooltip
            formatter={(v: number) => [`${v}%`, 'Dominance']}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8DDD8' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {data.map((d, i) => (
          <span key={`${d.name}-${i}`} className="flex items-center gap-1 text-[11px] text-[#404040]">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
            {d.name} <span className="text-gray-400">{d.value}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreBreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-semibold text-[#1A1A1A] w-6 text-right">{value}</span>
    </div>
  );
}

function ConcentrationBadge({ concentration }: { concentration?: string }) {
  const c = formatConcentration(concentration);
  if (!c) return null;
  return (
    <span
      className="text-[10px] uppercase tracking-wide bg-[#1A1A1A]/5 text-[#404040] px-2 py-0.5 rounded font-semibold border border-gray-200/80"
      title="Concentration affects strength. Use less of extrait / parfum when layering."
    >
      {c}
    </span>
  );
}

/** Compact horizontal card for mobile - tap to add, shows image + name + remove. */
function MobileFragranceSlot({
  index,
  fragrance,
  onRemove,
  onOpen,
}: {
  index: number;
  fragrance: Fragrance | null;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const slot = SLOT_CONFIG[index] ?? SLOT_CONFIG[0];

  if (!fragrance) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-[#D9CBC3] bg-gradient-to-r from-white/90 to-[#FFF9F5]/90 px-4 py-3.5 text-left transition-all active:scale-[0.98] hover:border-[#B85A3A]/55"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDF6F3] ring-1 ring-[#E8DDD8]">
          <Plus className="h-5 w-5 text-[#B85A3A]/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B4513]">
            {slot.step}. {slot.title}
          </p>
          <p className="mt-0.5 text-xs text-[#7A726B]">{slot.hint}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-[#B85A3A]">Add</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E4D5CD] bg-white px-3 py-3 shadow-sm">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#FAF7F4]">
        {fragrance.primary_image_url ? (
          <Image
            src={getProxiedImageUrl(fragrance.primary_image_url) || fragrance.primary_image_url}
            alt={fragrance.name}
            fill
            className="object-contain p-1.5 mix-blend-multiply"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">?</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B4513]">
          {slot.step}. {slot.title}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[#1A1A1A]">{fragrance.name}</p>
        <p className="truncate text-xs text-gray-400">{fragrance.brand_name}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-gray-100"
        aria-label={`Remove ${fragrance.name}`}
      >
        <X className="h-4 w-4 text-gray-400" />
      </button>
    </div>
  );
}

function FragranceSlot({
  index,
  fragrance,
  onRemove,
  onOpen,
}: {
  index: number;
  fragrance: Fragrance | null;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const slot = SLOT_CONFIG[index] ?? SLOT_CONFIG[0];
  /** Shared header block + bottom rule so all three columns align with the decorative line. */
  const slotHeaderClass =
    'mb-3 flex min-h-[5.25rem] shrink-0 flex-col items-center border-b border-[#E4D5CD]/80 px-1 pb-3 text-center';

  const stepCircleEmpty = (
    <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#B85A3A]/12 text-xs font-bold text-[#B85A3A] ring-1 ring-[#B85A3A]/20">
      {slot.step}
    </div>
  );
  const stepCircleFilled = (
    <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#B85A3A] text-xs font-bold text-white shadow-sm shadow-[#B85A3A]/30">
      {slot.step}
    </div>
  );

  if (!fragrance) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className={slotHeaderClass} title={slot.hint}>
          {stepCircleEmpty}
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B4513]">
            {slot.title}
          </p>
          <p className="mt-1 min-h-[2.5rem] text-[10px] leading-snug text-[#6B6560]">{slot.hint}</p>
        </div>
        <motion.button
          type="button"
          onClick={onOpen}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="group relative flex min-h-[280px] w-full flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[#D9CBC3] bg-gradient-to-b from-white/90 to-[#FFF9F5]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all hover:border-[#B85A3A]/55 hover:shadow-[0_12px_40px_-28px_rgba(120,55,35,0.45)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,90,58,0.08),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
          />
          <div className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF6F3] ring-1 ring-[#E8DDD8] transition-colors group-hover:bg-[#B85A3A]/10 group-hover:ring-[#B85A3A]/25">
            <Plus className="h-6 w-6 text-[#B85A3A]/70 transition-colors group-hover:text-[#B85A3A]" />
          </div>
          <div className="relative z-[1] text-center">
            <p className="text-sm font-semibold text-[#3D342E] transition-colors group-hover:text-[#B85A3A]">
              Add fragrance
            </p>
            <p className="mt-1 text-xs text-[#7A726B]">Search the collection</p>
          </div>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={slotHeaderClass} title={slot.hint}>
        {stepCircleFilled}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B4513]">{slot.title}</p>
        <p className="mt-1 min-h-[2.5rem] text-[10px] leading-snug text-[#6B6560]">{slot.hint}</p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#E4D5CD] bg-white p-4 shadow-[0_16px_40px_-28px_rgba(55,35,25,0.28)] ring-1 ring-white/80"
      >
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2.5 top-2.5 z-10 rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label={`Remove ${fragrance.name}`}
        >
          <X className="h-3.5 w-3.5 text-gray-400" />
        </button>

        <div
          className={`relative isolate mb-3 aspect-[4/3] shrink-0 overflow-hidden rounded-xl ${PRODUCT_IMAGE_WELL_CLASS}`}
        >
          {fragrance.primary_image_url ? (
            <Image
              src={getProxiedImageUrl(fragrance.primary_image_url) || fragrance.primary_image_url}
              alt={fragrance.name}
              fill
              className="object-contain p-3 mix-blend-multiply"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-300">
              No Image
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className="pr-4 text-sm font-semibold leading-tight text-[#1A1A1A]">{fragrance.name}</h3>
          <p className="mt-0.5 text-xs text-gray-400">{fragrance.brand_name}</p>
          <div className="mt-auto flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 pt-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <ConcentrationBadge concentration={fragrance.concentration} />
              {fragrance.scent_family && (
                <span className="rounded-full bg-[#B85A3A]/10 px-2 py-0.5 text-[10px] font-medium text-[#B85A3A]">
                  {fragrance.scent_family}
                </span>
              )}
            </div>
            <Link
              href={createProductUrl(fragrance.id, fragrance.name)}
              target="_blank"
              className="flex shrink-0 items-center gap-1 text-[10px] text-gray-400 transition-colors hover:text-[#B85A3A]"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              View
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SearchModal({
  onSelect,
  onClose,
  excluded,
}: {
  onSelect: (f: Fragrance) => void;
  onClose: () => void;
  excluded: string[];
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('');
  const [results, setResults] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FAMILIES = ['Floral', 'Woody', 'Oriental', 'Fresh', 'Citrus', 'Gourmand', 'Aquatic', 'Chypre'];

  const search = useCallback(async (q: string, fam: string) => {
    setLoading(true);
    try {
      const browseAll = !q.trim();
      const limit = browseAll ? '200' : '80';
      const params = new URLSearchParams({ q, limit });
      if (fam) params.set('family', fam);
      const res = await fetch(`${LAYERING_SEARCH_URL}?${params}`, {
        credentials: IS_WAITLIST_PREVIEW ? 'include' : 'same-origin',
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val, family), 300);
  };

  const handleFamily = (fam: string) => {
    const next = fam === family ? '' : fam;
    setFamily(next);
    search(query, next);
  };

  React.useEffect(() => { search('', ''); }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-[92dvh] sm:max-h-[82vh] flex flex-col overflow-hidden rounded-t-2xl"
      >
        {/* Search bar */}
        <div className="p-4 border-b space-y-3">
          {/* Mobile drag handle */}
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={handleInput}
                placeholder="Search by name or brand…"
                className="flex-1 bg-transparent text-sm outline-none text-[#1A1A1A] placeholder-gray-400"
              />
              {query && (
                <button onClick={() => { setQuery(''); search('', family); }}>
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Family filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {FAMILIES.map((f) => (
              <button
                key={f}
                onClick={() => handleFamily(f)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                  family === f
                    ? 'bg-[#B85A3A] border-[#B85A3A] text-white'
                    : 'border-gray-200 text-gray-500 hover:border-[#B85A3A] hover:text-[#B85A3A]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Searching…</div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">No fragrances found</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((f) => {
                const isExcluded = excluded.includes(f.id);
                return (
                  <button
                    key={f.id}
                    disabled={isExcluded}
                    onClick={() => { onSelect(f); onClose(); }}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      isExcluded
                        ? 'border-gray-100 opacity-40 cursor-not-allowed'
                        : 'border-gray-100 hover:border-[#B85A3A] hover:bg-[#FDF6F3]'
                    }`}
                  >
                    <div
                      className={`relative isolate aspect-square rounded-lg mb-2 overflow-hidden ${PRODUCT_IMAGE_WELL_CLASS}`}
                    >
                      {f.primary_image_url ? (
                        <Image
                          src={getProxiedImageUrl(f.primary_image_url) || f.primary_image_url}
                          alt={f.name}
                          fill
                          className="object-contain p-2 mix-blend-multiply"
                          sizes="150px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                      )}
                    </div>
                    <p className="font-medium text-xs text-[#1A1A1A] leading-tight line-clamp-2">{f.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{f.brand_name}</p>
                    {f.scent_family && (
                      <span className="inline-block mt-1 text-[10px] bg-[#B85A3A]/10 text-[#B85A3A] px-1.5 py-0.5 rounded-full">
                        {f.scent_family}
                      </span>
                    )}
                    {formatConcentration(f.concentration) && (
                      <span className="inline-block mt-1 ml-1 text-[9px] uppercase tracking-wide text-gray-500 border border-gray-200 px-1 py-0.5 rounded">
                        {formatConcentration(f.concentration)}
                      </span>
                    )}
                    {f.price_3ml && (
                      <p className="text-xs font-bold text-[#B85A3A] mt-1">₹{f.price_3ml}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add to Cart Card ─────────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { label: '3ml', cartSize: '3ml' as const, key: 'price_3ml' as const },
  { label: '8ml', cartSize: '8ml' as const, key: 'price_8ml' as const },
  /** UI 10ml maps to API / cart size ``12ml`` until backend fields are renamed. */
  { label: '10ml', cartSize: '12ml' as const, key: 'price_12ml' as const },
];

function AddToCartCard({ fragrance }: { fragrance: Fragrance }) {
  const { addToCart } = useCart();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const availableSizes = SIZE_OPTIONS.filter((s) => fragrance[s.key] != null);
  const selectedOption = SIZE_OPTIONS.find((s) => s.label === selectedLabel);
  const price = selectedOption ? Number(fragrance[selectedOption.key]) : null;

  const handleAdd = async () => {
    if (!selectedOption || price == null) {
      toast.error('Select a size first');
      return;
    }
    try {
      await addToCart({
        item_id: fragrance.id,
        item_type: 'fragrance',
        item_name: fragrance.name,
        item_brand: fragrance.brand_name,
        price,
        size: selectedOption.cartSize,
        quantity: 1,
        image_url: fragrance.primary_image_url,
      } as Cart);
      setAdded(true);
      toast.success(`${fragrance.name} (${selectedOption.label}) added to cart`);
      setTimeout(() => setAdded(false), 2500);
    } catch {
      // addToCart shows its own error toast for unauthenticated users
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-start">
      {/* Image */}
      <Link href={createProductUrl(fragrance.id, fragrance.name)} target="_blank" className="flex-shrink-0">
        <div className={`relative isolate w-16 h-16 rounded-xl overflow-hidden ${PRODUCT_IMAGE_WELL_CLASS}`}>
          {fragrance.primary_image_url ? (
            <Image
              src={getProxiedImageUrl(fragrance.primary_image_url) || fragrance.primary_image_url}
              alt={fragrance.name}
              fill
              className="object-contain p-1.5 mix-blend-multiply"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">-</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={createProductUrl(fragrance.id, fragrance.name)} target="_blank">
          <p className="font-semibold text-sm text-[#1A1A1A] leading-tight hover:text-[#B85A3A] transition-colors line-clamp-1">
            {fragrance.name}
          </p>
        </Link>
        <p className="text-xs text-gray-400 mt-0.5">{fragrance.brand_name}</p>
        {formatConcentration(fragrance.concentration) && (
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
            {formatConcentration(fragrance.concentration)}
          </p>
        )}

        {/* Size selector */}
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {availableSizes.map((s) => (
            <button
              key={s.label}
              onClick={() => setSelectedLabel(s.label)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                selectedLabel === s.label
                  ? 'border-[#B85A3A] bg-[#B85A3A] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-[#B85A3A] hover:text-[#B85A3A]'
              }`}
            >
              {s.label}
              {fragrance[s.key] != null && (
                <span className={`ml-1 ${selectedLabel === s.label ? 'text-white/80' : 'text-gray-400'}`}>
                  ₹{Number(fragrance[s.key])}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={!selectedLabel}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
          added
            ? 'bg-green-500 text-white'
            : selectedLabel
            ? 'bg-[#B85A3A] text-white hover:bg-[#A04D2F]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
        {added ? 'Added' : 'Add'}
      </button>
    </div>
  );
}

const PYRAMID_TIERS: {
  key: 'top' | 'middle' | 'base';
  label: string;
  sub: string;
  widthClass: string;
}[] = [
  {
    key: 'top',
    label: 'Opening',
    sub: 'First minutes on skin brightest, most volatile notes.',
    widthClass: 'max-w-md mx-auto',
  },
  {
    key: 'middle',
    label: 'Heart',
    sub: 'The story unfolds florals, spices, and core character.',
    widthClass: 'max-w-lg mx-auto',
  },
  {
    key: 'base',
    label: 'Dry-down',
    sub: 'What lingers woods, musks, resins, and fixatives.',
    widthClass: 'max-w-2xl mx-auto',
  },
];

/**
 * Radar chart 6-axis blend fingerprint.
 * Axes: Sillage, Longevity, Freshness, Warmth, Sweetness, Complexity.
 */
function BlendRadarChart({ analysis }: { analysis: AnalysisResult }) {
  const accords = analysis.dominant_accords.map((a) => a.accord.toLowerCase());
  const hasAccord = (...names: string[]) => names.some((n) => accords.includes(n));

  const freshness = hasAccord('citrus', 'aquatic', 'green', 'fresh', 'ozonic') ? 80
    : hasAccord('floral', 'aromatic') ? 55 : 25;
  const warmth = hasAccord('amber', 'oriental', 'vanilla', 'oud', 'tobacco', 'leather', 'incense') ? 80
    : hasAccord('woody', 'spicy') ? 60 : 30;
  const sweetness = hasAccord('gourmand', 'vanilla', 'caramel', 'honey', 'fruity') ? 80
    : hasAccord('floral', 'amber') ? 50 : 20;
  const complexity = Math.min(100, analysis.dominant_accords.length * 14 + (analysis.fragrance_count - 1) * 10);

  const data = [
    { axis: 'Sillage', value: Math.round(analysis.performance.sillage * 10) },
    { axis: 'Longevity', value: Math.round((analysis.performance.longevity_hours / 24) * 100) },
    { axis: 'Freshness', value: freshness },
    { axis: 'Warmth', value: warmth },
    { axis: 'Sweetness', value: sweetness },
    { axis: 'Complexity', value: complexity },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
        Blend Fingerprint
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Six-axis profile of this blend&apos;s character.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#6B7280' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#B85A3A" fill="#B85A3A" fillOpacity={0.18} strokeWidth={2} />
          <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8DDD8' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Score breakdown as a visible horizontal stacked bar (always shown, not in a details toggle). */
function ScoreBreakdownChart({ sc, harmonyScore }: { sc: NonNullable<AnalysisResult['score_components']>; harmonyScore: number }) {
  const segments = [
    {
      label: 'Shared notes',
      value: sc.shared_notes,
      max: 35,
      color: '#B85A3A',
      hint: 'Notes that appear in 2+ fragrances shared notes create a cohesive thread through the blend.',
    },
    {
      label: 'Shared accords',
      value: sc.shared_accords,
      max: 30,
      color: '#D4856A',
      hint: 'Scent families (woody, floral, oriental…) that overlap the more families in common, the smoother the blend.',
    },
    {
      label: 'Concentration balance',
      value: sc.concentration_harmony,
      max: 15,
      color: '#E8B4A0',
      hint: 'How well the strengths (EDP, EDT, Parfum…) complement each other similar concentrations layer more evenly.',
    },
    {
      label: 'Gender harmony',
      value: sc.gender_harmony,
      max: 10,
      color: '#6366f1',
      hint: 'How close the gender profiles of each fragrance are a mix of a very feminine and very masculine scent can clash; similar gender profiles blend more naturally.',
    },
    {
      label: 'Performance balance',
      value: sc.performance_balance,
      max: 10,
      color: '#8b5cf6',
      hint: 'Based on longevity longer-lasting blends score higher since the full accord has time to develop on skin.',
    },
  ];
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
        Score Breakdown
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Algorithm score: {total}/95 hover each row for what it means.
      </p>
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden mb-4 gap-px">
        {segments.map((seg) => (
          <motion.div
            key={seg.label}
            title={`${seg.label}: ${seg.value}/${seg.max}`}
            style={{ backgroundColor: seg.color, width: `${(seg.value / 95) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.value / 95) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </div>
      {/* Legend rows */}
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2" title={seg.hint}>
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-gray-500 flex-1 flex items-center gap-1">
              {seg.label}
              <span className="text-gray-300 hover:text-[#B85A3A] transition-colors cursor-help" title={seg.hint}>
                <Info className="w-3 h-3 inline" />
              </span>
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: seg.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(seg.value / seg.max) * 100}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#1A1A1A] w-10 text-right">{seg.value}/{seg.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AI-generated blend insights (compliment potential, fatigue, projection shape, climate, etc.).
 *
 * Args:
 *     insights: Parsed blend_insights from the harmony API (Groq).
 */
function BlendInsightsDashboard({ insights }: { insights: NonNullable<AnalysisResult['blend_insights']> }) {
  const cp = insights.compliment_potential ?? {
    score: 0,
    label: '-',
    crowd_pleasing_accords_detected: [] as string[],
    rationale: '',
  };
  const fr = insights.fatigue_risk ?? { level: 'Low', rationale: '', signals: [] as string[] };
  const pc = insights.projection_curve ?? { pattern: '-', headline: '', detail: '' };
  const ls = insights.longevity_stability ?? { evenness: '-', rationale: '', longest_lingering: null as string | null };
  const clash = insights.clash_warnings ?? [];
  const syn = insights.synergy_highlights ?? [];
  const cl = insights.climate_suitability ?? { hot_humid: '', cold_dry: '', overall_tip: '' };
  const tod = insights.time_of_day_fit ?? {
    morning: 0,
    daytime: 0,
    evening: 0,
    night: 0,
    summary: '',
  };

  const fatigueStyles =
    fr.level === 'High'
      ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' }
      : fr.level === 'Moderate'
        ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-900' }
        : { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' };

  const todSlots = [
    { key: 'morning', label: 'Morning', icon: Sun, v: tod.morning },
    { key: 'daytime', label: 'Daytime', icon: TrendingUp, v: tod.daytime },
    { key: 'evening', label: 'Evening', icon: Sunset, v: tod.evening },
    { key: 'night', label: 'Night', icon: Moon, v: tod.night },
  ] as const;

  return (
    <div className="rounded-2xl border border-[#E8DDD8] bg-gradient-to-br from-[#FDF6F3] via-white to-[#FAFAFA] p-5 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
            Blend insights
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Compliment potential, fatigue risk, how projection evolves over time, climate and time-of-day fit beyond a single harmony number.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[#B85A3A] shrink-0">AI analysis</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-[#B85A3A]" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Compliment potential</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 ml-auto">{cp.label}</span>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{Math.round(cp.score)}</span>
            <span className="text-sm text-gray-400 mb-1">/100</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#D4856A] to-[#B85A3A]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, cp.score))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {cp.crowd_pleasing_accords_detected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {cp.crowd_pleasing_accords_detected.map((a) => (
                <span key={a} className="text-[10px] bg-[#FDF6F3] border border-[#E8DDD8] text-[#404040] px-2 py-0.5 rounded-full">
                  {capitalize(a)}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-[#404040] leading-relaxed">{cp.rationale}</p>
        </div>

        <div className={`rounded-xl p-4 border ${fatigueStyles.bg} ${fatigueStyles.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-4 h-4 ${fatigueStyles.text}`} />
            <span className={`text-xs font-semibold ${fatigueStyles.text}`}>Fatigue risk</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto font-medium ${fatigueStyles.badge}`}>{fr.level}</span>
          </div>
          <p className={`text-xs leading-relaxed mb-2 ${fatigueStyles.text}`}>{fr.rationale}</p>
          {fr.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fr.signals.map((s) => (
                <span key={s} className="text-[10px] bg-white/60 border border-black/5 text-[#404040] px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#6366f1]" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Projection curve</span>
            <span className="text-[10px] text-gray-400 ml-auto">{pc.pattern}</span>
          </div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">{pc.headline}</p>
          <p className="text-xs text-[#404040] leading-relaxed">{pc.detail}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Longevity stability</span>
            <span className="text-[10px] text-gray-400 ml-auto">{ls.evenness.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-[#404040] leading-relaxed mb-2">{ls.rationale}</p>
          {ls.longest_lingering && (
            <p className="text-[11px] text-gray-500">
              <span className="font-medium text-[#1A1A1A]">Likely lingers longest:</span> {ls.longest_lingering}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Clash warnings</span>
          </div>
          {clash.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No major clash flags for this pairing.</p>
          ) : (
            <ul className="space-y-2">
              {clash.map((c, i) => (
                <li
                  key={i}
                  className={`text-xs border rounded-lg p-2 ${
                    c.severity === 'high'
                      ? 'border-red-200 bg-red-50/80'
                      : c.severity === 'medium'
                        ? 'border-amber-200 bg-amber-50/80'
                        : 'border-gray-100 bg-gray-50/80'
                  }`}
                >
                  <span className="font-medium text-[#1A1A1A]">{c.pair}</span>
                  <span className="text-gray-500"> {c.warning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#B85A3A]" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Synergy highlights</span>
          </div>
          <ul className="space-y-1.5">
            {syn.map((line, i) => (
              <li key={i} className="text-xs text-[#404040] flex gap-2">
                <Asterisk className="w-3 h-3 text-[#B85A3A] shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThermometerSun className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Climate suitability</span>
          </div>
          <div className="space-y-2 text-xs text-[#404040]">
            <p className="flex gap-2">
              <Sun className="w-3.5 h-3.5 shrink-0 text-orange-500 mt-0.5" />
              <span><span className="font-medium text-[#1A1A1A]">Hot / humid:</span> {cl.hot_humid}</span>
            </p>
            <p className="flex gap-2">
              <Snowflake className="w-3.5 h-3.5 shrink-0 text-sky-500 mt-0.5" />
              <span><span className="font-medium text-[#1A1A1A]">Cold / dry:</span> {cl.cold_dry}</span>
            </p>
            <p className="text-[11px] text-gray-600 pt-1 border-t border-gray-100">{cl.overall_tip}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#6366f1]" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Time-of-day fit</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {todSlots.map(({ key, label, icon: Icon, v }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>{label}</span>
                    <span className="tabular-nums">{Math.round(v)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#6366f1]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, v))}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#404040] leading-relaxed">{tod.summary}</p>
        </div>
      </div>
    </div>
  );
}

/** Gender spectrum horizontal gradient bar with a marker. */
function GenderSpectrumBar({ genderScore, genderLabel }: { genderScore: number; genderLabel: string }) {
  // genderScore: 1–10 (1=very feminine, 5=unisex, 10=very masculine)
  const pct = Math.round(((genderScore - 1) / 9) * 100);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
        Gender Spectrum
      </h2>
      <p className="text-xs text-gray-500 mb-4">Where this blend sits on the feminine–masculine axis.</p>
      <div className="relative">
        <div
          className="h-4 rounded-full w-full"
          style={{ background: 'linear-gradient(to right, #f9a8d4, #e9d5ff, #a5b4fc, #6366f1)' }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#1A1A1A] shadow-md"
          style={{ left: `calc(${pct}% - 8px)` }}
          initial={{ left: '50%' }}
          animate={{ left: `calc(${pct}% - 8px)` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-gray-400">Feminine</span>
        <span className="text-xs font-semibold text-[#1A1A1A]">{genderLabel}</span>
        <span className="text-[10px] text-gray-400">Masculine</span>
      </div>
    </div>
  );
}

/** Per-fragrance accord contribution horizontal stacked bar per fragrance. */
function FragranceContributionChart({ fragrances, dominantAccords }: { fragrances: Fragrance[]; dominantAccords: DominantAccord[] }) {
  if (fragrances.length < 2) return null;
  const topAccords = dominantAccords.map((a) => a.accord.toLowerCase());

  const rows = fragrances.map((f) => {
    const fragAccords = new Set((f.main_accords || []).map((a) => a.toLowerCase()));
    const matched = topAccords.filter((a) => fragAccords.has(a));
    const score =
      topAccords.length > 0 && matched.length > 0
        ? Math.round((matched.length / topAccords.length) * 100)
        : 5;
    return { name: f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name, score, matched };
  });

  const COLORS = ['#B85A3A', '#D4856A', '#6366f1'];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
        Fragrance Contribution
      </h2>
      <p className="text-xs text-gray-500 mb-4">How much each bottle drives the dominant accord profile.</p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#404040] font-medium">{row.name}</span>
              <span className="text-gray-400">{row.score}% match</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${row.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
              />
            </div>
            {row.matched.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Drives: {row.matched.map(capitalize).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Longevity timeline shows Opening / Heart / Dry-down phases with estimated hours. */
function LongevityTimeline({ longevityHours }: { longevityHours: number }) {
  const total = Math.max(longevityHours, 4);
  const opening = Math.min(1, total * 0.12);
  const heart = Math.min(total * 0.35, total - opening - 1);
  const drydown = total - opening - heart;

  const phases = [
    { label: 'Opening', hours: opening, color: '#E8B4A0', desc: 'Top notes bloom' },
    { label: 'Heart', hours: heart, color: '#B85A3A', desc: 'Core character emerges' },
    { label: 'Dry-down', hours: drydown, color: '#6B3A2A', desc: 'Base notes linger' },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
        Wear Timeline
      </h2>
      <p className="text-xs text-gray-500 mb-4">Estimated ~{Math.round(longevityHours)}h total wear how the blend evolves over time.</p>
      {/* Segmented bar */}
      <div className="flex h-6 rounded-full overflow-hidden gap-px mb-4">
        {phases.map((p) => (
          <motion.div
            key={p.label}
            title={`${p.label}: ~${p.hours.toFixed(1)}h`}
            style={{ backgroundColor: p.color, width: `${(p.hours / total) * 100}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${(p.hours / total) * 100}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            {(p.hours / total) > 0.15 && (
              <span className="text-[9px] text-white font-semibold truncate px-1">{p.label}</span>
            )}
          </motion.div>
        ))}
      </div>
      {/* Phase legend */}
      <div className="grid grid-cols-3 gap-2">
        {phases.map((p) => (
          <div key={p.label} className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: p.color }} />
            <p className="text-[11px] font-semibold text-[#1A1A1A]">{p.label}</p>
            <p className="text-[10px] text-gray-400">~{p.hours.toFixed(1)}h</p>
            <p className="text-[10px] text-gray-500 leading-tight">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tabbed panel for season vs occasion fit scores (single chart area).
 */
const SEASON_OCCASION_BAR_COLORS = [
  '#B85A3A',
  '#D4856A',
  '#E8B4A0',
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#f59e0b',
  '#94a3b8',
];

function SeasonOccasionTabs({
  bestSeasons,
  bestOccasions,
}: {
  bestSeasons: AnalysisResult['best_seasons'];
  bestOccasions: AnalysisResult['best_occasions'];
}) {
  const [tab, setTab] = useState<'seasons' | 'occasions'>('seasons');
  const isSeasons = tab === 'seasons';
  const rows = isSeasons ? bestSeasons : bestOccasions;
  const chartData = rows.map((row) => ({
    name: capitalize(isSeasons ? (row as { season: string; score: number }).season : (row as { occasion: string; score: number }).occasion),
    score: row.score,
  }));
  const chartHeight = Math.min(420, Math.max(160, 48 + rows.length * 36));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
          When & where to wear
        </h2>
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('seasons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isSeasons ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#B85A3A]'
            }`}
          >
            Seasons
          </button>
          <button
            type="button"
            onClick={() => setTab('occasions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isSeasons ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#B85A3A]'
            }`}
          >
            Occasions
          </button>
        </div>
      </div>
      {rows.length > 0 ? (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={36}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#C4B5AD' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number) => [`${v}%`, 'Score']}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8DDD8', color: '#1A1A1A' }}
              cursor={{ fill: '#FDF6F3' }}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {rows.map((_, i) => (
                <Cell
                  key={`${tab}-${i}`}
                  fill={SEASON_OCCASION_BAR_COLORS[i % SEASON_OCCASION_BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-400 py-8 text-center">
          No {isSeasons ? 'season' : 'occasion'} data available
        </p>
      )}
    </div>
  );
}

// ─── History Section ──────────────────────────────────────────────────────────

/**
 * Maps a waitlist saved-combo row (Supabase JSON) to the shape ``HistorySection`` expects.
 */
function mapPilotSavedComboToHistoryRow(
  entry: Record<string, unknown>,
  index: number,
): Record<string, unknown> {
  const idsRaw = entry.fragrance_ids;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.filter((x): x is string => typeof x === "string")
    : [];
  const names = Array.isArray(entry.fragrance_names)
    ? entry.fragrance_names.filter((x): x is string => typeof x === "string")
    : [];
  const imgsRaw = entry.fragrance_images;
  const imgs = Array.isArray(imgsRaw)
    ? imgsRaw.filter((x): x is string => typeof x === "string")
    : [];
  const images = [...imgs];
  while (images.length < names.length) {
    images.push("");
  }
  const savedAt =
    typeof entry.saved_at === "string" ? entry.saved_at : new Date().toISOString();
  const id =
    ids.length > 0 ? `pilot-${ids.join("-")}-${savedAt}` : `pilot-${index}-${savedAt}`;
  return {
    id,
    fragrance_ids: ids,
    fragrance_names: names,
    fragrance_brands: Array.isArray(entry.fragrance_brands)
      ? entry.fragrance_brands.filter((x): x is string => typeof x === "string")
      : [],
    fragrance_images: images.slice(0, 3),
    harmony_score:
      typeof entry.harmony_score === "number" ? entry.harmony_score : 0,
    created_at: savedAt,
    dominant_accords: Array.isArray(entry.dominant_accords)
      ? entry.dominant_accords
      : [],
    performance: entry.performance ?? {},
    best_seasons: Array.isArray(entry.best_seasons) ? entry.best_seasons : [],
    best_occasions: Array.isArray(entry.best_occasions)
      ? entry.best_occasions
      : [],
    score_components: entry.score_components ?? null,
  };
}

function HistorySection({
  onReload,
  refreshKey = 0,
}: {
  onReload: (item: any) => void;
  refreshKey?: number;
}) {
  const { user } = useAppContext();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        if (IS_WAITLIST_PREVIEW) {
          const res = await fetch(LAYERING_SAVED_COMBOS_URL, {
            headers: { ...getPreviewAuthHeaders() },
            credentials: "include",
          });
          const raw = (await res.json().catch(() => ({}))) as {
            combos?: unknown;
          };
          if (cancelled) return;
          const combos = Array.isArray(raw.combos) ? raw.combos : [];
          const mapped = combos.map((c, i) =>
            mapPilotSavedComboToHistoryRow(
              c as Record<string, unknown>,
              i,
            ),
          );
          setHistory(mapped);
        } else {
          const token = await getAccessToken();
          const res = await fetch(`${API}/api/v1/layering/history?limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (cancelled) return;
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  if (!user) return null;

  if (IS_WAITLIST_PREVIEW && !loading && history.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-[#E8DFD8] bg-white/90 px-4 py-6 text-center shadow-sm">
        <Clock className="mx-auto mb-2 h-5 w-5 text-[#B85A3A]" aria-hidden />
        <h2 className="text-sm font-semibold text-[#1A1A1A]">Saved blends</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#5C5A52]">
          After you analyze a blend, tap <span className="font-semibold">Save blend</span>{" "}
          to store it here (up to {PILOT_MAX_SAVED_BLENDS} on this pilot).
        </p>
      </div>
    );
  }

  if (history.length === 0 && !loading) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#B85A3A]" aria-hidden />
        <h2 className="text-sm font-semibold text-[#1A1A1A]">
          {IS_WAITLIST_PREVIEW ? "Saved blends" : "Recent analyses"}
        </h2>
      </div>
      {loading ? (
        <div className="text-xs text-gray-400 py-4 text-center">Loading history…</div>
      ) : (
        <div className="space-y-3">
          {history.map((h) => {
            const isOpen = expanded === h.id;
            const sc = h.score_components;
            const perf = h.performance || {};
            const seasons: { season: string; score: number }[] = h.best_seasons || [];
            const occasions: { occasion: string; score: number }[] = h.best_occasions || [];
            const chartData = seasons.map((s) => ({
              name: capitalize(s.season),
              score: s.score,
            }));
            const seasonChartH = Math.min(280, Math.max(100, 36 + chartData.length * 28));
            return (
              <div key={h.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Row header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FDF6F3] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : h.id)}
                >
                  {/* Fragrance images */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    {(h.fragrance_images || []).slice(0, 3).map((img: string, i: number) => (
                      <div key={i} className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FDF6F3] to-[#F8E8E0] border-2 border-white overflow-hidden">
                        {img ? <img src={img} alt="" className="w-full h-full object-contain p-1" style={{ mixBlendMode: 'multiply' }} /> : null}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {(h.fragrance_names || []).join(' + ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {/* Harmony badge */}
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: h.harmony_score >= 80 ? '#dcfce7' : h.harmony_score >= 52 ? '#fef9c3' : '#fee2e2',
                      color: h.harmony_score >= 80 ? '#16a34a' : h.harmony_score >= 52 ? '#ca8a04' : '#dc2626',
                    }}
                  >
                    {h.harmony_score}/100
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {/* Expanded metrics */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-4">
                    {/* Performance */}
                    {perf.sillage != null && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-[#B85A3A] uppercase tracking-wide">Performance</p>
                        <MetricBar label="Sillage" value={perf.sillage} max={10} unit="/10" />
                        <MetricBar label="Longevity" value={perf.longevity_hours} max={24} unit="h" color="#A04D2F" />
                        {perf.gender_label && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#404040]">Gender Lean</span>
                            <span className="text-xs font-semibold bg-[#FDF6F3] text-[#B85A3A] px-3 py-1 rounded-full">{perf.gender_label}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Score breakdown */}
                    {sc && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#B85A3A] uppercase tracking-wide">Score Breakdown</p>
                        <ScoreBreakdownBar label="Shared notes" value={sc.shared_notes} max={35} color="#B85A3A" />
                        <ScoreBreakdownBar label="Shared accords" value={sc.shared_accords} max={30} color="#D4856A" />
                        <ScoreBreakdownBar label="Concentration" value={sc.concentration_harmony} max={15} color="#E8B4A0" />
                        <ScoreBreakdownBar label="Gender harmony" value={sc.gender_harmony} max={10} color="#6366f1" />
                        <ScoreBreakdownBar label="Performance" value={sc.performance_balance} max={10} color="#8b5cf6" />
                        <ScoreBreakdownBar label="Heritage bonus" value={sc.heritage_bonus} max={5} color="#22c55e" />
                      </div>
                    )}

                    {/* Seasons chart */}
                    {chartData.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#B85A3A] uppercase tracking-wide mb-2">Best Seasons</p>
                        <ResponsiveContainer width="100%" height={seasonChartH}>
                          <BarChart data={chartData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }} barSize={28}>
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#C4B5AD' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E8DDD8' }} cursor={{ fill: '#FDF6F3' }} />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                              {chartData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={SEASON_OCCASION_BAR_COLORS[i % SEASON_OCCASION_BAR_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Dominant accords */}
                    {(h.dominant_accords || []).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#B85A3A] uppercase tracking-wide mb-2">Dominant Accords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(h.dominant_accords as any[]).map((a: any, idx: number) => (
                            <AccordPill key={`${String(a.accord)}-${idx}`} accord={a.accord} pct={a.dominance_pct} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Re-analyze button */}
                    <button
                      type="button"
                      onClick={() => onReload(h)}
                      className="w-full text-xs font-semibold text-[#B85A3A] border border-[#B85A3A] rounded-xl py-2 hover:bg-[#FDF6F3] transition-colors"
                    >
                      Re-analyze this combo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function LayeringLabPageContent() {
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get('first');
  const appliedFirstQueryRef = useRef<string | null>(null);

  const [selected, setSelected] = useState<(Fragrance | null)[]>([null, null, null]);
  const [modalSlot, setModalSlot] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pilotSavedComboCount, setPilotSavedComboCount] = useState(0);
  const [pilotSavedCombosRevision, setPilotSavedCombosRevision] = useState(0);
  const { user, isLoading: authLoading } = useAppContext();
  const analytics = useAnalytics();

  useEffect(() => {
    if (!IS_WAITLIST_PREVIEW || !user || authLoading) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LAYERING_SAVED_COMBOS_URL, {
          headers: { ...getPreviewAuthHeaders() },
          credentials: 'include',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { count?: number };
        if (typeof data.count === 'number') setPilotSavedComboCount(data.count);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    if (!prefilledId || !FRAGRANCE_ID_UUID_RE.test(prefilledId)) {
      appliedFirstQueryRef.current = null;
      return;
    }
    if (appliedFirstQueryRef.current === prefilledId) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const prefillUrl = IS_WAITLIST_PREVIEW
          ? `/api/waitlist-preview/fragrances/${prefilledId}`
          : `${API}/api/v1/fragrances/${prefilledId}`;
        const res = await fetch(prefillUrl, {
          headers: { Accept: 'application/json' },
          credentials: IS_WAITLIST_PREVIEW ? 'include' : 'same-origin',
        });
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          toast.error('Could not load this fragrance for layering.');
          return;
        }
        const raw = (await res.json()) as Record<string, unknown>;
        const mapped = mapFragranceDetailToLayering(raw);
        if (!mapped || cancelled) {
          return;
        }
        appliedFirstQueryRef.current = prefilledId;
        setSelected((prev) => {
          const next: (Fragrance | null)[] = [...prev];
          next[0] = mapped;
          return next;
        });
        setAnalysis(null);
      } catch {
        if (!cancelled) {
          toast.error('Could not load this fragrance for layering.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, prefilledId]);

  const filled = selected.filter(Boolean) as Fragrance[];
  const excludedIds = filled.map((f) => f.id);

  const noteOverlap = useMemo(
    () =>
      analysis ? computeNoteOverlap(analysis.fragrances) : { shared: [] as string[], contrasting: [] as string[] },
    [analysis],
  );

  const blendLean = useMemo(
    () =>
      analysis
        ? computeBlendLean(analysis.fragrances, analysis.dominant_accords)
        : { leader: null as Fragrance | null, isBalanced: true },
    [analysis],
  );

  const handleSelect = (f: Fragrance) => {
    if (modalSlot === null) return;
    const next = [...selected];
    next[modalSlot] = f;
    setSelected(next);
    setAnalysis(null);
  };

  const handleRemove = (i: number) => {
    const next = [...selected];
    next[i] = null;
    setSelected(next);
    setAnalysis(null);
  };

  const handleReload = useCallback((item: any) => {
    // Reconstruct minimal fragrance slots from stored history data
    const ids: string[] = item.fragrance_ids || [];
    const names: string[] = item.fragrance_names || [];
    const brands: string[] = item.fragrance_brands || [];
    const images: string[] = item.fragrance_images || [];
    const slots: (Fragrance | null)[] = [null, null, null];
    ids.slice(0, 3).forEach((id, i) => {
      slots[i] = {
        id,
        name: names[i] || '',
        brand_name: brands[i] || '',
        primary_image_url: images[i] || undefined,
      } as Fragrance;
    });
    setSelected(slots);
    setAnalysis(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAnalyze = async () => {
    if (filled.length < 1) return;
    setSaved(false);
    setAnalyzing(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(IS_WAITLIST_PREVIEW ? getPreviewAuthHeaders() : {}),
      };
      if (!IS_WAITLIST_PREVIEW) {
        const token = await getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(LAYERING_ANALYZE_URL, {
        method: 'POST',
        headers,
        credentials: IS_WAITLIST_PREVIEW ? 'include' : 'same-origin',
        body: JSON.stringify({ fragrance_ids: filled.map((f) => f.id) }),
      });
      const raw = await res.text();
      if (!res.ok) {
        const message = IS_WAITLIST_PREVIEW
          ? formatWaitlistPreviewApiError(raw, res.status)
          : (() => {
              let m = 'Analysis failed. Please try again.';
              try {
                const j = JSON.parse(raw) as {
                  detail?: string | { detail?: string; code?: string };
                };
                const d = j.detail;
                if (typeof d === 'string') m = d;
                else if (d && typeof d === 'object' && typeof d.detail === 'string')
                  m = d.detail;
              } catch {
                /* keep default */
              }
              return m;
            })();
        toast.error(message);
        return;
      }
      const data = JSON.parse(raw) as AnalysisResult;
      const idOrder = filled.map((f) => f.id);
      const byId = new Map(data.fragrances.map((f) => [f.id, f]));
      data.fragrances = idOrder.map((id) => byId.get(id)).filter(Boolean) as Fragrance[];
      setAnalysis(data);
      analytics.layeringLabAnalyzed(data.fragrance_count, data.harmony_score, data.ai_powered ?? false);
      setTimeout(() => {
        document.getElementById('layering-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      toast.error('Could not reach the server. Check your connection and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !user) {
      toast.error('Sign in to save your blend');
      return;
    }
    if (IS_WAITLIST_PREVIEW) {
      setSaving(true);
      try {
        const res = await fetch(LAYERING_SAVED_COMBOS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getPreviewAuthHeaders(),
          },
          credentials: 'include',
          body: JSON.stringify({
            fragrance_ids: analysis.fragrances.map((f) => f.id),
            fragrance_names: analysis.fragrances.map((f) => f.name),
            fragrance_brands: analysis.fragrances.map((f) => f.brand_name),
            fragrance_images: analysis.fragrances.map(
              (f) => f.primary_image_url || "",
            ),
            harmony_score: analysis.harmony_score,
            summary: analysis.summary,
            dominant_accords: analysis.dominant_accords,
            performance: analysis.performance,
            best_seasons: analysis.best_seasons,
            best_occasions: analysis.best_occasions,
          }),
        });
        const raw = await res.text();
        if (!res.ok) {
          toast.error(formatWaitlistPreviewApiError(raw, res.status));
          return;
        }
        const data = JSON.parse(raw) as { count?: number };
        if (typeof data.count === 'number') setPilotSavedComboCount(data.count);
        setPilotSavedCombosRevision((n) => n + 1);
        setSaved(true);
        analytics.layeringLabBlendSaved(analysis.harmony_score);
        toast.success('Blend saved');
      } catch {
        toast.error('Failed to save blend');
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Please sign in again to save your blend');
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openSignIn'));
        return;
      }
      const res = await fetch(`${API}/api/v1/layering/combos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fragrance_ids: analysis.fragrances.map((f) => f.id),
          fragrance_names: analysis.fragrances.map((f) => f.name),
          fragrance_brands: analysis.fragrances.map((f) => f.brand_name),
          fragrance_images: analysis.fragrances.map((f) => f.primary_image_url || ''),
          harmony_score: analysis.harmony_score,
          dominant_accords: analysis.dominant_accords,
          performance: analysis.performance,
          best_seasons: analysis.best_seasons,
          best_occasions: analysis.best_occasions,
          summary: analysis.summary,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          toast.error('Please sign in again to save your blend');
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openSignIn'));
          return;
        }
        throw new Error(text);
      }
      setSaved(true);
      analytics.layeringLabBlendSaved(analysis.harmony_score);
      toast.success('Blend saved to your profile');
    } catch {
      toast.error('Failed to save blend');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 pb-20 pt-16 sm:pt-20">
        <Layers className="w-10 h-10 text-[#B85A3A]/40 mb-4 animate-pulse" aria-hidden />
        <p className="text-sm text-[#5C5A52]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white pb-20 pt-16 sm:pt-20">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center">
            <GradientFeatureAnnouncePill
              lead={<Layers className="size-4 text-terracotta-500" aria-hidden />}
              gradientLabel="Stack scents AI scores your harmony"
            />
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-[#1A1A1A] mb-3">
            Sign in to use Layering Lab
          </h1>
          <p className="text-[#404040] text-sm mb-8 leading-relaxed">
            Build blends, analyze harmony, and save combinations to your profile. Sign in to get started.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('openSignIn'));
              }
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#B85A3A] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#A04D2F] transition-colors"
          >
            Sign in
          </button>
          <p className="mt-8">
            <Link href="/" className="text-sm text-[#B85A3A] hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#FAF7F4] pb-24 pt-4 sm:pt-6">
      {/* Header */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">Pilot tool</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#1A1A1A] md:text-3xl flex items-center gap-2">
              <Layers className="h-6 w-6 text-[#B85A3A]" aria-hidden />
              <AnimatedGradientText className="font-display text-2xl font-bold md:text-3xl">
                Layering Lab
              </AnimatedGradientText>
            </h1>
          </div>
          {/* Live slot counter */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  selected[i] ? 'bg-[#B85A3A] scale-125' : 'bg-[#E4D5CD]'
                }`}
              />
            ))}
            <span className="ml-1.5 text-xs text-[#9A928B]">{filled.length}/3</span>
          </div>
        </div>

        {!analysis && <CuratedCombosIntro className="mb-8" />}

        {/* Fragrance Slots */}
        <div className="mb-6 rounded-2xl border border-[#E8DFD8] bg-white p-4 shadow-sm md:p-6">
          {/* Mobile: vertical stack of compact horizontal cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {[0, 1, 2].map((i) => (
              <MobileFragranceSlot
                key={i}
                index={i}
                fragrance={selected[i]}
                onRemove={() => handleRemove(i)}
                onOpen={() => setModalSlot(i)}
              />
            ))}
          </div>
          {/* Desktop: 3-column grid */}
          <div className="hidden md:grid md:grid-cols-3 md:items-stretch md:gap-4">
            {[0, 1, 2].map((i) => (
              <FragranceSlot
                key={i}
                index={i}
                fragrance={selected[i]}
                onRemove={() => handleRemove(i)}
                onOpen={() => setModalSlot(i)}
              />
            ))}
          </div>
        </div>

        {/* Analyze Button prominent, always visible */}
        <div className="mb-10 flex flex-col items-center gap-2">
          <motion.button
            onClick={handleAnalyze}
            disabled={filled.length === 0 || analyzing}
            whileHover={{ scale: filled.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: filled.length > 0 ? 0.98 : 1 }}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all ${
              filled.length === 0
                ? 'bg-[#EDE8E4] text-[#9A928B] cursor-not-allowed'
                : 'bg-[#B85A3A] text-white hover:bg-[#A04D2F] shadow-lg shadow-[#B85A3A]/25'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {analyzing
              ? 'Analyzing…'
              : filled.length === 0
                ? 'Add fragrances to analyze'
                : filled.length === 1
                  ? 'Analyze this fragrance'
                  : `Analyze ${filled.length}-fragrance blend`}
          </motion.button>
          {filled.length === 0 && (
            <p className="text-xs text-[#9A928B]">Pick 2–3 fragrances above to score harmony</p>
          )}
          {IS_WAITLIST_PREVIEW && filled.length > 0 && (
            <p className="text-[11px] text-[#9A928B]">
              {pilotSavedComboCount}/{PILOT_MAX_SAVED_BLENDS} blends saved
            </p>
          )}
        </div>

        {/* Community combos hidden while viewing your analysis so results stay focused */}
        {!analysis && <CuratedCombosSection omitIntro />}
        {!analysis && (
          <HistorySection
            onReload={handleReload}
            refreshKey={pilotSavedCombosRevision}
          />
        )}

        {/* Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              id="layering-results"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.45 }}
              className="space-y-5"
            >
              {/* Summary card scores + key stats at a glance */}
              <div className="rounded-2xl border border-[#E8DFD8] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">Blend Report</span>
                    {analysis.ai_powered && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5 text-[#B85A3A]" />
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelected([null, null, null]); setAnalysis(null); setSaved(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-xs text-gray-400 hover:text-[#B85A3A] transition-colors"
                    >
                      ← New blend
                    </button>
                    <motion.button
                      onClick={handleSave}
                      disabled={saving || saved}
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        saved ? 'bg-green-500 text-white' : 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                      }`}
                    >
                      {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {saving ? 'Saving…' : saved ? 'Saved' : 'Save blend'}
                    </motion.button>
                  </div>
                </div>

                {/* Score row */}
                <div className={`grid gap-4 ${analysis.compatibility_score != null ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {/* Harmony */}
                  <div className="flex flex-col items-center rounded-xl bg-[#FAF7F4] p-3">
                    <svg width="64" height="64" viewBox="0 0 80 80" className="mb-1">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                      <motion.circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={harmonyColor(analysis.harmony_score)}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - analysis.harmony_score / 100) }}
                        transition={{ duration: 1.1, ease: 'easeOut' }}
                        transform="rotate(-90 40 40)"
                      />
                      <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A1A1A">{analysis.harmony_score}</text>
                    </svg>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Harmony</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: harmonyColor(analysis.harmony_score) }}>
                      {analysis.harmony_label || harmonyLabel(analysis.harmony_score)}
                    </p>
                  </div>

                  {/* Compatibility */}
                  {analysis.compatibility_score != null && (
                    <div className="flex flex-col items-center rounded-xl bg-[#FAF7F4] p-3">
                      <svg width="64" height="64" viewBox="0 0 80 80" className="mb-1">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                        <motion.circle
                          cx="40" cy="40" r="32"
                          fill="none"
                          stroke={compatibilityColor(analysis.compatibility_score)}
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - analysis.compatibility_score / 100) }}
                          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                          transform="rotate(-90 40 40)"
                        />
                        <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A1A1A">{analysis.compatibility_score}</text>
                      </svg>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Your match</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: compatibilityColor(analysis.compatibility_score) }}>
                        {analysis.compatibility_label || 'Compatibility'}
                      </p>
                    </div>
                  )}

                  {/* Sillage + Longevity */}
                  <div className="flex flex-col justify-center gap-3 rounded-xl bg-[#FAF7F4] p-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500">Sillage</span>
                        <span className="font-semibold text-[#1A1A1A]">{analysis.performance.sillage}/10</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-[#B85A3A]" initial={{ width: 0 }} animate={{ width: `${analysis.performance.sillage * 10}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500">Longevity</span>
                        <span className="font-semibold text-[#1A1A1A]">{analysis.performance.longevity_hours}h</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-[#A04D2F]" initial={{ width: 0 }} animate={{ width: `${(analysis.performance.longevity_hours / 24) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{analysis.performance.gender_label}</p>
                  </div>

                  {/* Dominant accords */}
                  {analysis.dominant_accords.length > 0 && (
                    <div className="flex flex-col justify-center rounded-xl bg-[#FAF7F4] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Top accords</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.dominant_accords.slice(0, 4).map((a) => (
                          <AccordPill key={a.accord} accord={a.accord} pct={a.dominance_pct} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary text */}
                <p className="mt-4 text-sm leading-relaxed text-[#404040] border-t border-gray-100 pt-4">
                  {analysis.harmony_description || analysis.summary}
                </p>
                {analysis.balance_note && analysis.fragrance_count >= 2 && (
                  <p className="mt-1.5 text-xs text-gray-500">{analysis.balance_note}</p>
                )}
                {analysis.heritage_match && (
                  <p className="mt-1.5 text-xs font-medium text-[#B85A3A]">Heritage match: {analysis.heritage_match}</p>
                )}
                {analysis.compatibility_reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {analysis.compatibility_reasons.map((r, i) => (
                      <li key={i} className="text-xs text-[#404040] flex items-start gap-1.5">
                        <Asterisk className="w-3 h-3 text-[#6366f1] mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Score breakdown algorithm only */}
              {analysis.score_components && !analysis.ai_powered && (
                <ScoreBreakdownChart sc={analysis.score_components} harmonyScore={analysis.harmony_score} />
              )}

              {/* Two-column grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Dominant Accords radial */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
                    Dominant Accords
                  </h2>
                  {analysis.dominant_accords.length > 0 ? (
                    <AccordRadialChart accords={analysis.dominant_accords} />
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">No accord data available</p>
                  )}
                  {analysis.dominant_accords[0] && (
                    <p className="text-xs text-gray-500 mt-3 italic text-center">
                      <span className="text-gray-600">&ldquo;{capitalize(analysis.dominant_accords[0].accord)}&rdquo;</span>{' '}
                      leads {analysis.dominant_accords[0].descriptor}.
                    </p>
                  )}
                </div>

                {/* Performance */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
                    Blend Performance
                  </h2>
                  <div className="space-y-3">
                    <MetricBar label="Sillage (projection)" value={analysis.performance.sillage} max={10} unit="/10" hint="How far the scent travels off your skin when layered." />
                    <MetricBar label="Longevity" value={analysis.performance.longevity_hours} max={24} unit="h" color="#A04D2F" hint="Approximate wear time for the blend." />
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-[#404040]">Gender Lean</span>
                      <span className="text-xs font-semibold text-[#1A1A1A] bg-[#FDF6F3] px-3 py-1 rounded-full">
                        {analysis.performance.gender_label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {analysis.fragrance_count >= 2 && analysis.blend_insights && analysis.ai_powered && (
                <BlendInsightsDashboard insights={analysis.blend_insights} />
              )}

              {/* Blend Fingerprint radar + Gender Spectrum */}
              <div className="grid md:grid-cols-2 gap-4">
                <BlendRadarChart analysis={analysis} />
                <GenderSpectrumBar genderScore={analysis.performance.gender_score} genderLabel={analysis.performance.gender_label} />
              </div>

              {/* Longevity Timeline + Fragrance Contribution */}
              <div className="grid md:grid-cols-2 gap-4">
                <LongevityTimeline longevityHours={analysis.performance.longevity_hours} />
                <FragranceContributionChart fragrances={analysis.fragrances} dominantAccords={analysis.dominant_accords} />
              </div>

              {/* Shared vs contrasting notes */}
              {analysis.fragrance_count >= 2 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
                    Common thread vs unique character
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">Notes shared across bottles vs notes unique to one fragrance.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-[#FDF6F3] rounded-xl p-4">
                      <p className="text-[11px] font-semibold text-[#B85A3A] uppercase tracking-wide mb-2">Shared notes</p>
                      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                        {noteOverlap.shared.length > 0 ? noteOverlap.shared.map((note) => (
                          <span key={`s-${note}`} className="text-[11px] bg-white border border-[#E8DDD8] text-[#1A1A1A] px-2 py-0.5 rounded-full">{note}</span>
                        )) : <span className="text-xs text-gray-400 italic">No overlapping note names rely on dominant accords above.</span>}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[11px] font-semibold text-[#404040] uppercase tracking-wide mb-2">Contrasting / unique</p>
                      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                        {noteOverlap.contrasting.length > 0 ? noteOverlap.contrasting.map((note) => (
                          <span key={`c-${note}`} className="text-[11px] bg-white border border-gray-200 text-[#1A1A1A] px-2 py-0.5 rounded-full">{note}</span>
                        )) : <span className="text-xs text-gray-400 italic">No unique single-bottle notes listed.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Pyramid */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-sm text-[#1A1A1A] mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#B85A3A]" />
                  How the blend evolves on skin
                </h2>
                <p className="text-xs text-gray-500 mb-5">From first spray through the dry-down.</p>
                <div className="flex flex-col gap-3">
                  {PYRAMID_TIERS.map((tier) => {
                    const notes = analysis.blended_notes[tier.key];
                    return (
                      <div key={tier.key} className={`rounded-2xl border border-[#E8DDD8] bg-gradient-to-br from-[#FDF6F3] to-white p-4 ${tier.widthClass}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-[#1A1A1A]">{tier.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{tier.sub}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-[#B85A3A] shrink-0">
                            {tier.key === 'top' ? 'Top' : tier.key === 'middle' ? 'Heart' : 'Base'} notes
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {notes.length > 0 ? notes.slice(0, 12).map((note) => (
                            <span key={note} className="text-[11px] bg-white border border-gray-100 text-[#1A1A1A] px-2 py-0.5 rounded-full">{capitalize(note)}</span>
                          )) : <span className="text-xs text-gray-300">-</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <SeasonOccasionTabs bestSeasons={analysis.best_seasons} bestOccasions={analysis.best_occasions} />

              {/* Layering Tips */}
              <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
                <h2 className="font-semibold text-sm text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B85A3A]" />
                  Layering Tips
                </h2>
                <ul className="space-y-2.5">
                  {analysis.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-gray-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-[#B85A3A]/20 text-[#B85A3A] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shop This Blend */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-sm text-[#1A1A1A] mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#B85A3A]" />
                  Shop This Blend
                </h2>
                <div className="space-y-3">
                  {analysis.fragrances.map((f) => (
                    <AddToCartCard key={f.id} fragrance={f} />
                  ))}
                </div>
              </div>

              {/* Bottom actions */}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => { setSelected([null, null, null]); setAnalysis(null); setSaved(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-sm text-gray-400 hover:text-[#B85A3A] transition-colors underline underline-offset-4"
                >
                  Start a new blend
                </button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving || saved}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    saved ? 'bg-green-500 text-white' : 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save Blend'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {modalSlot !== null && (
          <SearchModal
            onSelect={handleSelect}
            onClose={() => setModalSlot(null)}
            excluded={excludedIds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LayeringLabPage() {
  return (
    <WaitlistGate featureName="Layering Lab">
      <Suspense fallback={
        <div className="min-h-screen bg-white store-main-scroll-offset flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#B85A3A] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <LayeringLabPageContent />
      </Suspense>
    </WaitlistGate>
  );
}
