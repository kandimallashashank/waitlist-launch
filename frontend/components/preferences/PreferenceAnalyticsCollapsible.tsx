"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const KPI_HELP: Record<string, string> = {
  "Signature focus":
    "How tight your quiz is around a few scent families and moods. High = a clear “type” (signature). Low = you like to explore many directions we call that a wide explorer.",
  "Wear presence":
    "From your intensity, longevity, and sillage answers: how bold or quiet you want a fragrance to feel on skin and in the room. Not “good” or “bad” just your comfort zone.",
  "Occasion versatility":
    "How many different moments you selected (work, date, gym, etc.). Higher = you want scents that can flex across more situations.",
  "Season versatility":
    "How many seasons you picked. Higher = you’re open to wearing fragrance year-round or across more weather types.",
};

const PYRAMID_LAYER_HELP: Record<string, string> = {
  opening_forward:
    "You chose more opening (top) notes first blast, freshness, and what hits the nose first matter most in your picks.",
  heart_forward:
    "You leaned into heart (middle) notes the core character of a scent, often florals, spices, or fruits after the opening fades.",
  base_forward:
    "You picked more base notes the dry-down: woods, musk, amber, vanilla, resins. These last longest on skin and define depth.",
  balanced:
    "Your liked notes are spread across opening, heart, and base you’re drawn to the full story of a fragrance, not just one phase.",
};

export interface PreferenceAnalyticsData {
  archetype_focus_score: number;
  archetype_focus_label: string;
  performance_appetite_score: number;
  performance_appetite_label: string;
  occasion_versatility_score: number;
  season_versatility_score: number;
  pyramid: {
    top_pct: number;
    middle_pct: number;
    base_pct: number;
    dominant_layer: string;
    dominant_layer_label: string;
  };
  ai_summary?: string | null;
  computed_at?: string | null;
}

function KpiBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const help = KPI_HELP[label];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-[#404040]">
          <span className="truncate">{label}</span>
          {help ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-0.5 text-[#B85A3A]/80 hover:bg-[#FDF6F3] hover:text-[#B85A3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A]/40"
                  aria-label={`What ${label} means`}
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[min(280px,calc(100vw-2rem))] border-0 bg-neutral-900 px-3 py-2 text-xs leading-relaxed text-neutral-50 shadow-lg"
              >
                {help}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-[#666]">{v}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#EDE8E4]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#D4856A] to-[#B85A3A] transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
      {hint ? <p className="text-[11px] leading-snug text-[#888]">{hint}</p> : null}
    </div>
  );
}

/**
 * Collapsible quiz KPI block (matches profile Preferences tab).
 */
export function PreferenceAnalyticsCollapsible({
  analytics,
  defaultOpen = false,
  className,
  variant = "default",
}: {
  analytics: PreferenceAnalyticsData | null | undefined;
  defaultOpen?: boolean;
  className?: string;
  variant?: "default" | "profile";
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!analytics) {
    if (variant === "profile") {
      return (
        <div
          className={cn(
            "rounded-xl border border-terracotta-200 bg-gradient-to-br from-terracotta-50/80 to-sand p-4 text-sm text-neutral-600",
            className
          )}
        >
          <p className="mb-1 flex items-center gap-2 font-medium text-terracotta-800">
            <BarChart3 className="h-4 w-4 text-terracotta-500" />
            Preference analytics
          </p>
          <p className="mb-3 text-xs leading-relaxed text-neutral-600">
            Metrics come from your quiz answers (deterministic KPI engine on the server).
          </p>
          <Link
            href="/quiz"
            className="text-xs font-semibold text-terracotta-600 underline underline-offset-2 hover:text-terracotta-700"
          >
            Open Scent Finder
          </Link>
        </div>
      );
    }
    return null;
  }

  const { pyramid } = analytics;
  const shell =
    variant === "profile"
      ? "overflow-hidden rounded-xl border border-terracotta-200 bg-white shadow-sm"
      : "overflow-hidden rounded-2xl border border-[#E8DDD8] bg-white/90 shadow-sm";
  const triggerHover =
    variant === "profile" ? "hover:bg-terracotta-50/50" : "hover:bg-[#FDF8F6]";
  const contentBg =
    variant === "profile"
      ? "space-y-5 border-t border-terracotta-100 bg-gradient-to-b from-white to-terracotta-50/30 px-4 py-4"
      : "space-y-5 border-t border-[#F0EBE8] bg-gradient-to-b from-white to-[#FDFAF8] px-4 py-4";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      <div className={shell}>
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors",
            triggerHover
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B85A3A]",
                variant === "profile" ? "bg-terracotta-100" : "bg-[#FDF6F3]"
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  variant === "profile" ? "text-dark-800" : "text-[#1A1A1A]"
                )}
              >
                Your preference KPIs
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {variant === "profile"
                  ? "Signature focus, wear presence, versatility from your quiz"
                  : "From your quiz tap to expand"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-[#B85A3A] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TooltipProvider delayDuration={200}>
            <div className={contentBg}>
              <div className="rounded-lg border border-dashed border-[#E8DDD8] bg-[#FAFAFA] px-3 py-2.5 text-[11px] leading-relaxed text-[#555]">
                <span className="font-semibold text-[#1A1A1A]">How to read this</span>
                <span className="text-[#888]"> · </span>
                Scores come from your quiz answers. Tap the{" "}
                <Info className="inline h-3 w-3 align-text-bottom text-[#B85A3A]" aria-hidden /> icon
                for plain-English hints. The short blurb below may use Groq on the API when configured.
              </div>

              {analytics.ai_summary ? (
                <p className="border-l-2 border-[#B85A3A] pl-3 text-sm leading-relaxed text-[#404040]">
                  {analytics.ai_summary}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <KpiBar
                  label="Signature focus"
                  value={analytics.archetype_focus_score}
                  hint={analytics.archetype_focus_label}
                />
                <KpiBar
                  label="Wear presence"
                  value={analytics.performance_appetite_score}
                  hint={analytics.performance_appetite_label}
                />
                <KpiBar label="Occasion versatility" value={analytics.occasion_versatility_score} />
                <KpiBar label="Season versatility" value={analytics.season_versatility_score} />
              </div>

              <div className="rounded-xl border border-[#E8DDD8] bg-gradient-to-br from-white to-[#FDF8F6] p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[#1A1A1A]">Note pyramid</p>
                  <span className="text-[10px] uppercase tracking-wide text-[#B85A3A]">
                    From your picks
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium text-[#1A1A1A]">{pyramid.dominant_layer_label}</p>
                <p className="mb-3 text-[11px] leading-relaxed text-[#555]">
                  {PYRAMID_LAYER_HELP[pyramid.dominant_layer] ?? PYRAMID_LAYER_HELP.balanced}
                </p>
                <div className="flex h-3 gap-px overflow-hidden rounded-full bg-[#EDE8E4]">
                  <div
                    className="bg-[#93C5FD]"
                    style={{ width: `${pyramid.top_pct}%` }}
                    title={`Opening ${pyramid.top_pct}%`}
                  />
                  <div
                    className="bg-[#C4B5FD]"
                    style={{ width: `${pyramid.middle_pct}%` }}
                    title={`Heart ${pyramid.middle_pct}%`}
                  />
                  <div
                    className="bg-[#B85A3A]/85"
                    style={{ width: `${pyramid.base_pct}%` }}
                    title={`Base ${pyramid.base_pct}%`}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[#888]">
                  <span>Opening {pyramid.top_pct}%</span>
                  <span>Heart {pyramid.middle_pct}%</span>
                  <span>Base {pyramid.base_pct}%</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
