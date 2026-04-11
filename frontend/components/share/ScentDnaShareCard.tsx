/**
 * Portrait share art aligned with apps/web ``FragranceDNACard`` (palette, chrome, sections).
 * Fixed canvas: only top families, signature opening notes, and vibe pills — no overflow.
 */

"use client";

import * as React from "react";
import { Dna, Sparkles } from "lucide-react";

import type { DnaBarItem, ScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";
import {
  buildScentDnaShareHeadline,
  buildScentDnaShareTagline,
  titleCaseWords,
  truncScentDnaChipLabel,
} from "@/lib/waitlist/scentDnaShareCopy";
import { scentDnaFamilyBarColor } from "@/lib/waitlist/scentDnaPalette";
import { cn } from "@/lib/utils";

export interface ScentDnaShareCardProps {
  data: ScentDnaCardData;
  variant: "quiz" | "gift";
  /** First name or short display string. */
  displayName: string;
  className?: string;
}

/** Grid tint — matches profile DNA card terracotta (``#B85A3A`` → RGB). */
const THEME_TERRACOTTA_RGB = "184, 90, 58";

const MAX_FAMILIES = 4;
const MAX_SIGNATURE_NOTES = 4;
const MAX_VIBE_TRAITS = 3;
const NOTE_LABEL_MAX_CHARS = 20;
const MOOD_LABEL_MAX_CHARS = 22;

/** Shared chip style for top notes and mood (export-safe, one line). */
const DNA_CHIP_CLASS =
  "max-w-[10rem] truncate rounded-xl border border-terracotta-200/80 bg-terracotta-50 px-3 py-1.5 text-[10px] font-semibold text-terracotta-700";

/**
 * One scent-family row: label, colored bar, percent (same structure as profile DNA card).
 */
function ScentFamilyRow({
  name,
  percentage,
  color,
}: {
  name: string;
  percentage: number;
  color: string;
}): React.ReactElement {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <div className="flex items-center gap-2">
      <span className="w-[5.5rem] shrink-0 truncate text-[11px] font-semibold text-dark-800">
        {titleCaseWords(name)}
      </span>
      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full border border-black/[0.06] bg-white shadow-inner">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`,
          }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums text-neutral-600">
        {pct}%
      </span>
    </div>
  );
}

/**
 * Instagram / story–sized art (360×640). Extra height keeps mood chips above the fixed footer.
 */
export const ScentDnaShareCard = React.forwardRef<HTMLDivElement, ScentDnaShareCardProps>(
  function ScentDnaShareCard({ data, variant, displayName, className }, ref) {
    const trimmedName = displayName.trim();
    const headingName = trimmedName ? `${trimmedName}'s` : "Your";
    const shareHeadline = buildScentDnaShareHeadline(data);
    const shareTagline = buildScentDnaShareTagline(data, variant);

    const families = data.familyBars.slice(0, MAX_FAMILIES);
    const signatureFromBars = data.openingNoteBars
      .slice(0, MAX_SIGNATURE_NOTES)
      .map((row) =>
        truncScentDnaChipLabel(titleCaseWords(row.label), NOTE_LABEL_MAX_CHARS),
      );
    const moodChips = data.moodBars.slice(0, MAX_VIBE_TRAITS).map((row, idx) => ({
      key: `${row.label}-${idx}`,
      text: truncScentDnaChipLabel(titleCaseWords(row.label), MOOD_LABEL_MAX_CHARS),
      title: row.label,
    }));

    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        className={cn(
          "relative box-border flex w-[360px] shrink-0 flex-col overflow-hidden rounded-3xl border-2 border-terracotta-200/70 bg-gradient-to-b from-[#FDF8F6] to-[#F5EDE9] text-dark-800",
          className,
        )}
        style={{
          height: 640,
          boxShadow:
            "0 32px 64px -16px rgba(184, 90, 58, 0.12), 0 0 0 1px rgba(184, 90, 58, 0.08)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
        aria-hidden
      >
        <div className="absolute top-0 left-0 right-0 h-1 shrink-0 bg-gradient-to-r from-terracotta-500 to-terracotta-400" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
            linear-gradient(rgba(${THEME_TERRACOTTA_RGB}, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(${THEME_TERRACOTTA_RGB}, 0.5) 1px, transparent 1px)
          `,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-[5.75rem] pt-6">
          <div className="shrink-0 text-center">
            <div className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-500/15 text-terracotta-600 shadow-lg">
              <Dna className="h-7 w-7" strokeWidth={2.2} aria-hidden />
            </div>
            <h2 className="font-display text-[1.35rem] font-bold leading-tight tracking-tight text-dark-900">
              {headingName}
            </h2>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-terracotta-600">
              Fragrance DNA
            </p>
            <div className="mt-2.5 border-t border-black/[0.06] pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                In one line
              </p>
              <h3 className="font-display mx-auto mt-1 max-w-[17.5rem] text-base font-bold leading-snug text-terracotta-700 line-clamp-2">
                {shareHeadline}
              </h3>
              <p className="mx-auto mt-1.5 max-w-[17.5rem] text-[11px] font-medium leading-relaxed text-neutral-600 line-clamp-2">
                {shareTagline}
              </p>
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-visible">
            {families.length > 0 ? (
              <div className="min-h-0 shrink">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                  Your mix
                </p>
                <div className="space-y-2">
                  {families.map((row: DnaBarItem, idx: number) => (
                    <ScentFamilyRow
                      key={`${row.label}-${idx}`}
                      name={row.label}
                      percentage={row.percent}
                      color={scentDnaFamilyBarColor(idx)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {signatureFromBars.length > 0 ? (
              <div className="shrink-0">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                  Top notes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {signatureFromBars.map((note, idx) => (
                    <span
                      key={`${note}-${idx}`}
                      className={DNA_CHIP_CLASS}
                      title={data.openingNoteBars[idx]?.label}
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {moodChips.length > 0 ? (
              <div className="shrink-0">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                  Mood
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {moodChips.map(({ key, text, title }) => (
                    <span key={key} className={DNA_CHIP_CLASS} title={title}>
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-black/[0.06] bg-[#FDF8F6]/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth={2.2} aria-hidden />
            <span className="text-sm font-bold text-dark-800">ScentRev</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-neutral-500 tabular-nums">{exportDate}</span>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-terracotta-600">Pilot</p>
          </div>
        </div>
      </div>
    );
  },
);
