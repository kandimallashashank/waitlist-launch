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

/** Fallback gradient + icon per category value */
const CATEGORY_FALLBACKS: Record<string, { gradient: string; icon: React.ReactNode }> = {
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
  energetic: { gradient: "from-orange-500 via-amber-400 to-orange-600", icon: <Zap className="w-10 h-10 text-white/70" /> },
  mysterious: { gradient: "from-violet-950 via-purple-900 to-violet-950", icon: <Moon className="w-10 h-10 text-white/60" /> },
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
    options.length >= 3
      ? "grid-cols-1 sm:grid-cols-3"
      : options.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={`grid ${cols} gap-3 sm:gap-4 w-full max-w-3xl mx-auto`}>
      {options.map((opt, optIndex) => {
        const active = selected === opt.value;
        const fallback = getFallback(opt.value);
        const inFirstRow = optIndex < 3;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`group relative w-full overflow-hidden rounded-2xl transition-colors duration-200 aspect-[5/6] max-sm:max-h-[min(70vw,22rem)] sm:aspect-auto sm:h-64 sm:max-h-none ${
              active
                ? "ring-[3px] ring-[#B85A3A] shadow-[0_12px_40px_rgba(184,90,58,0.35)]"
                : "ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.28)]"
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
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  {fallback.icon}
                </div>
              </div>
            )}

            {/* Layered overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

            {/* Active tint */}
            {active && <div className="absolute inset-0 bg-[#B85A3A]/20" />}

            {/* Label */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <span className="text-white font-bold uppercase tracking-[0.18em] text-sm drop-shadow-sm">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-5xl mx-auto">
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
            className={`flex flex-col overflow-hidden rounded-2xl text-left transition-colors duration-200 ${
              isSelected
                ? "ring-[3px] ring-[#B85A3A] shadow-[0_10px_32px_rgba(184,90,58,0.28)]"
                : isDisabled
                  ? "opacity-30 cursor-not-allowed"
                  : "ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
            }`}
          >
            {/* Image area */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              {opt.imageUrl ? (
                <img src={opt.imageUrl} alt="" className="h-full w-full object-cover" />
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
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className={`font-bold text-[11px] uppercase tracking-[0.12em] leading-tight text-white drop-shadow-sm`}>
                  {opt.label}
                </p>
                {opt.subline && (
                  <p className="text-white/65 text-[10px] mt-0.5 leading-snug">{opt.subline}</p>
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
      <div className={`grid ${cols} w-full max-w-5xl gap-3 sm:gap-4 mx-auto`}>
        {options.map((opt) => {
          const active = selected === opt.value;
          const fallback = getFallback(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col overflow-hidden rounded-2xl text-left transition-colors duration-200 ${
                active
                  ? "ring-[3px] ring-[#B85A3A] shadow-[0_10px_32px_rgba(184,90,58,0.28)]"
                  : "ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              }`}
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden">
                {opt.imageUrl ? (
                  <img src={opt.imageUrl} alt="" className="h-full w-full object-cover" />
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
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="font-bold text-[11px] sm:text-xs uppercase tracking-[0.12em] leading-tight text-white drop-shadow-sm">
                    {opt.label}
                  </p>
                  {opt.subline && (
                    <p className="text-white/65 text-[9px] sm:text-[10px] mt-0.5 leading-snug">{opt.subline}</p>
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
    <div className="w-full max-w-3xl sm:max-w-4xl mx-auto px-1">
      {hint && (
        <p className="text-center text-sm text-[#8A6A5D] mb-5 leading-relaxed">{hint}</p>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
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

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
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

              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                active ? "border-[#B85A3A] bg-[#B85A3A]" : "border-[#D0CBC6]"
              }`}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
