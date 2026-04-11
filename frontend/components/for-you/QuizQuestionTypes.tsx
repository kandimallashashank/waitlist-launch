"use client";

import React from "react";
import { Sparkles, Droplets, Wind, Flame, Leaf, Sun, Moon, Coffee, Zap } from "lucide-react";

// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────
export interface QuizOption {
  value: string;
  label: string;
  subline?: string;
  imageUrl?: string;
  /** Optional icon shown when no image is available */
  icon?: React.ReactNode;
}

/** Fallback gradient and optional center icon when ``imageUrl`` is omitted. */
const CATEGORY_FALLBACKS: Record<string, { gradient: string; icon?: React.ReactNode }> = {
  men: { gradient: "from-slate-800 via-slate-700 to-slate-900", icon: <Wind className="w-10 h-10 text-white/60" /> },
  women: { gradient: "from-rose-300 via-pink-200 to-rose-400", icon: <Sparkles className="w-10 h-10 text-white/70" /> },
  unisex: { gradient: "from-amber-700 via-amber-600 to-amber-800", icon: <Droplets className="w-10 h-10 text-white/60" /> },
  bold_romantic: { gradient: "from-red-900 via-rose-800 to-red-950", icon: <Flame className="w-10 h-10 text-white/60" /> },
  fresh_polished: { gradient: "from-sky-400 via-cyan-300 to-sky-500", icon: <Wind className="w-10 h-10 text-white/70" /> },
  soft_romantic: { gradient: "from-pink-300 via-rose-200 to-pink-400", icon: <Sparkles className="w-10 h-10 text-white/70" /> },
  unexpected_statement: { gradient: "from-violet-900 via-purple-800 to-violet-950", icon: <Zap className="w-10 h-10 text-white/60" /> },
  daily_office: { gradient: "from-slate-600 via-slate-500 to-slate-700", icon: <Coffee className="w-10 h-10 text-white/60" /> },
  date_night: { gradient: "from-rose-900 via-red-800 to-rose-950", icon: <Moon className="w-10 h-10 text-white/60" /> },
  casual_day: { gradient: "from-amber-500 via-yellow-400 to-amber-600", icon: <Sun className="w-10 h-10 text-white/70" /> },
  special_events: { gradient: "from-indigo-900 via-purple-800 to-indigo-950", icon: <Sparkles className="w-10 h-10 text-white/60" /> },
  travel: { gradient: "from-teal-600 via-emerald-500 to-teal-700", icon: <Leaf className="w-10 h-10 text-white/70" /> },
  confident: { gradient: "from-zinc-800 via-zinc-700 to-zinc-900", icon: <Zap className="w-10 h-10 text-white/60" /> },
  romantic: { gradient: "from-rose-700 via-pink-600 to-rose-800", icon: <Sparkles className="w-10 h-10 text-white/70" /> },
  fresh_clean: { gradient: "from-sky-500 via-cyan-400 to-sky-600", icon: <Wind className="w-10 h-10 text-white/70" /> },
  sweet_gourmand: { gradient: "from-amber-800 via-orange-700 to-amber-900", icon: <Coffee className="w-10 h-10 text-white/60" /> },
  woody_spicy: { gradient: "from-stone-800 via-amber-900 to-stone-950", icon: <Leaf className="w-10 h-10 text-white/60" /> },
  unsure: { gradient: "from-slate-500 via-slate-400 to-slate-600", icon: <Sparkles className="w-10 h-10 text-white/70" /> },
  humid: { gradient: "from-teal-600 via-cyan-500 to-emerald-700", icon: <Droplets className="w-10 h-10 text-white/70" /> },
  dry_cold: { gradient: "from-slate-400 via-sky-300 to-slate-500", icon: <Wind className="w-10 h-10 text-white/80" /> },
  ac_indoor: { gradient: "from-slate-600 via-zinc-500 to-slate-700", icon: <Coffee className="w-10 h-10 text-white/60" /> },
  energetic: { gradient: "from-orange-500 via-amber-400 to-orange-600", icon: <Zap className="w-10 h-10 text-white/70" /> },
  mysterious: { gradient: "from-violet-950 via-purple-900 to-violet-950", icon: <Moon className="w-10 h-10 text-white/60" /> },
  /** Gift flow: age band tiles use gradient only (no stock photos). */
  under_18: { gradient: "from-sky-800 via-cyan-900 to-slate-950" },
  age_18_24: { gradient: "from-orange-800 via-amber-900 to-stone-950" },
  age_25_34: { gradient: "from-emerald-900 via-teal-950 to-slate-950" },
  age_35_44: { gradient: "from-violet-950 via-purple-950 to-stone-950" },
  age_45_plus: { gradient: "from-stone-800 via-neutral-900 to-stone-950" },
};

function getFallback(value: string) {
  return CATEGORY_FALLBACKS[value] ?? {
    gradient: "from-[#3A2A20] via-[#5A3A28] to-[#2A1A10]",
    icon: <Sparkles className="w-10 h-10 text-white/50" />,
  };
}

// ─────────────────────────────────────────────
// Type A Hero Image Grid (gender / main choice)
// ─────────────────────────────────────────────
interface TypeAProps {
  options: QuizOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}
export function TypeA({ options, selected, onSelect }: TypeAProps) {
  const cols =
    options.length === 4
      ? "grid-cols-2 sm:grid-cols-2"
      : options.length >= 3
        ? "grid-cols-3 sm:grid-cols-3"
        : options.length === 2
          ? "grid-cols-2"
          : "grid-cols-1";

  return (
    <div className={`grid ${cols} w-full max-w-3xl mx-auto gap-2 sm:gap-4`}>
      {options.map((opt, optIndex) => {
        const active = selected === opt.value;
        const fallback = getFallback(opt.value);
        const inFirstRow = optIndex < 3;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`group relative w-full overflow-hidden rounded-xl transition-transform duration-200 sm:rounded-2xl max-sm:h-[min(30svh,168px)] max-sm:min-h-0 sm:aspect-auto sm:h-64 ${
              active
                ? "ring-[3px] ring-[#B85A3A] shadow-[0_12px_40px_rgba(184,90,58,0.35)]"
                : "ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.18)] active:scale-[0.98] sm:hover:shadow-[0_12px_36px_rgba(0,0,0,0.28)]"
            }`}
          >
            {opt.imageUrl ? (
              <img
                src={opt.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top sm:object-center"
                loading={inFirstRow ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={optIndex === 0 ? "high" : inFirstRow ? "auto" : "low"}
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${fallback.gradient}`}>
                {fallback.icon != null ? (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    {fallback.icon}
                  </div>
                ) : null}
              </div>
            )}

            {/* Layered overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

            {/* Active tint */}
            {active && <div className="absolute inset-0 bg-[#B85A3A]/20" />}

            {/* Label */}
            <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white drop-shadow-sm sm:text-sm sm:tracking-[0.18em]">
                {opt.label}
              </span>
              {opt.subline && (
                <p className="text-white/70 text-xs mt-0.5 leading-snug">{opt.subline}</p>
              )}
            </div>

            {/* Selected check */}
            {active && (
              <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#B85A3A] shadow-lg">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Type B Occasion / Mood Cards (responsive grid)
// ─────────────────────────────────────────────
interface TypeBProps {
  options: QuizOption[];
  selected: string[];
  onToggle: (value: string) => void;
  maxSelect?: number;
  onFilledToMax?: () => void;
}
export function TypeB({ options, selected, onToggle, maxSelect, onFilledToMax }: TypeBProps) {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isDisabled = !isSelected && maxSelect !== undefined && selected.length >= maxSelect;
        const fallback = getFallback(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (isDisabled) return;
              if (!isSelected) {
                onToggle(opt.value);
                if (maxSelect !== undefined && selected.length + 1 >= maxSelect && onFilledToMax) {
                  window.setTimeout(() => onFilledToMax(), 420);
                }
                return;
              }
              onToggle(opt.value);
            }}
            disabled={isDisabled}
            className={`flex flex-col overflow-hidden rounded-xl text-left transition-transform duration-200 sm:rounded-2xl ${
              isSelected
                ? "ring-[3px] ring-[#B85A3A] shadow-[0_10px_32px_rgba(184,90,58,0.28)]"
                : isDisabled
                  ? "opacity-30 cursor-not-allowed"
                  : "ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.14)] active:scale-[0.99] sm:hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
            }`}
          >
            {/* Image area — shorter on phones so grids do not dominate the viewport */}
            <div className="relative h-[92px] w-full shrink-0 overflow-hidden sm:aspect-[4/3] sm:h-auto sm:min-h-0">
              {opt.imageUrl ? (
                <img
                  src={opt.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  decoding="async"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
                  <div className="opacity-40">{fallback.icon}</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              {isSelected && <div className="absolute inset-0 bg-[#B85A3A]/15" />}
              {/* Selection badge */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#B85A3A] text-[10px] font-bold text-white shadow-md">
                  {selected.indexOf(opt.value) + 1}
                </div>
              )}
              {/* Label overlay on image */}
              <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-white drop-shadow-sm sm:text-[11px] sm:tracking-[0.12em]">
                  {opt.label}
                </p>
                {opt.subline && (
                  <p className="mt-0.5 text-[9px] leading-snug text-white/65 sm:text-[10px]">{opt.subline}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Type C Personality / Style Card (single select)
// ─────────────────────────────────────────────
interface TypeCProps {
  options: QuizOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}
export function TypeC({ options, selected, onSelect }: TypeCProps) {
  const hasImages = options.some((o) => o.imageUrl);

  if (hasImages) {
    const cols =
      options.length <= 3
        ? options.length === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 md:grid-cols-3";
    return (
      <div className={`mx-auto grid w-full max-w-5xl gap-2 sm:gap-4 ${cols}`}>
        {options.map((opt) => {
          const active = selected === opt.value;
          const fallback = getFallback(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col overflow-hidden rounded-xl text-left transition-transform duration-200 sm:rounded-2xl ${
                active
                  ? "ring-[3px] ring-[#B85A3A] shadow-[0_10px_32px_rgba(184,90,58,0.28)]"
                  : "ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.14)] active:scale-[0.99] sm:hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              }`}
            >
              <div className="relative h-[100px] w-full shrink-0 overflow-hidden sm:aspect-[3/2] sm:h-auto">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    decoding="async"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
                    <div className="opacity-40">{fallback.icon}</div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {active && <div className="absolute inset-0 bg-[#B85A3A]/15" />}
                {active && (
                  <div className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#B85A3A] shadow-md">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Label on image */}
                <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4">
                  <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-white drop-shadow-sm sm:text-xs sm:tracking-[0.12em]">
                    {opt.label}
                  </p>
                  {opt.subline && (
                    <p className="mt-0.5 text-[8px] leading-snug text-white/65 sm:text-[10px]">{opt.subline}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Text-list mode (experience level, etc.)
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-lg mx-auto">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`relative flex items-center gap-4 rounded-2xl p-4 pl-5 text-left transition-colors duration-200 overflow-hidden border-2 ${
              active
                ? "border-[#B85A3A] bg-[#FDF6F3] shadow-[0_6px_24px_rgba(184,90,58,0.16)]"
                : "border-[#EDE0D8] bg-white shadow-sm hover:shadow-md hover:border-[#D4B8A4]"
            }`}
          >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full transition-colors ${
              active ? "bg-[#B85A3A]" : "bg-[#EDE0D8]"
            }`} />

            {opt.icon && (
              <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center transition-colors ${
                active ? "bg-[#B85A3A]/12" : "bg-[#F5EDE7]"
              }`}>
                {opt.icon}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-[15px] leading-snug transition-colors ${
                active ? "text-[#B85A3A]" : "text-[#1A1A1A]"
              }`}>
                {opt.label}
              </p>
              {opt.subline && (
                <p className="text-[13px] text-[#8A6A5D] mt-0.5 leading-snug">{opt.subline}</p>
              )}
            </div>

            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              active ? "border-[#B85A3A] bg-[#B85A3A]" : "border-[#D0CBC6]"
            }`}>
              {active && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Type D Pill Chips (multi-select)
// ─────────────────────────────────────────────
interface TypeDProps {
  options: QuizOption[];
  selected: string[];
  onToggle: (value: string) => void;
  maxSelect?: number;
  hint?: string;
  onFilledToMax?: () => void;
}
export function TypeD({ options, selected, onToggle, maxSelect, hint, onFilledToMax }: TypeDProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-0.5 sm:max-w-4xl sm:px-1">
      {hint && (
        <p className="mb-3 text-center text-xs leading-relaxed text-[#8A6A5D] sm:mb-5 sm:text-sm">{hint}</p>
      )}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const isDisabled = !isSelected && maxSelect !== undefined && selected.length >= maxSelect;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (isDisabled) return;
                if (!isSelected) {
                  onToggle(opt.value);
                  if (maxSelect !== undefined && selected.length + 1 >= maxSelect && onFilledToMax) {
                    window.setTimeout(() => onFilledToMax(), 420);
                  }
                  return;
                }
                onToggle(opt.value);
              }}
              disabled={isDisabled}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                isSelected
                  ? "bg-[#1A1A1A] text-white shadow-[0_4px_14px_rgba(26,26,26,0.22)]"
                  : isDisabled
                    ? "bg-[#F0ECE9] text-[#C0BAB4] cursor-not-allowed"
                    : "bg-white text-[#1A1A1A] shadow-sm ring-1 ring-[#E8D4C4] hover:ring-[#B85A3A] hover:shadow-md"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Type F Text Cards with level indicator
// (budget / longevity / intensity / age)
// ─────────────────────────────────────────────
interface TypeFProps {
  options: QuizOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  showLevelBar?: boolean;
}
export function TypeF({ options, selected, onSelect, showLevelBar = true }: TypeFProps) {
  const total = options.length;
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-lg mx-auto">
      {options.map((opt, index) => {
        const active = selected === opt.value;
        const level = index + 1;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`relative p-4 pl-5 rounded-2xl text-left transition-colors duration-200 overflow-hidden border-2 ${
              active
                ? "border-[#B85A3A] bg-[#FDF6F3] shadow-[0_6px_24px_rgba(184,90,58,0.16)]"
                : "border-[#EDE0D8] bg-white shadow-sm hover:shadow-md hover:border-[#D4B8A4]"
            }`}
          >
            <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full transition-colors ${
              active ? "bg-[#B85A3A]" : "bg-[#EDE0D8]"
            }`} />

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt=""
                    className="mt-0.5 h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#E8D4C4]/80"
                    decoding="async"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-[15px] leading-snug transition-colors ${
                    active ? "text-[#B85A3A]" : "text-[#1A1A1A]"
                  }`}>
                    {opt.label}
                  </p>
                  {opt.subline && (
                    <p className="text-[13px] text-[#8A6A5D] mt-0.5 leading-snug">{opt.subline}</p>
                  )}
                  {showLevelBar && (
                    <div className="flex gap-1 mt-2.5">
                      {Array.from({ length: total }).map((_, j) => (
                        <div
                          key={j}
                          className={`h-1 rounded-full ${
                            j < level
                              ? active
                                ? "w-5 bg-[#B85A3A]"
                                : "w-5 bg-[#C8956E]"
                              : active
                                ? "w-3.5 bg-white/30"
                                : "w-3.5 bg-[#E8D4C4]"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active ? "border-[#B85A3A] bg-[#B85A3A]" : "border-[#D0CBC6]"
              }`}>
                {active && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
