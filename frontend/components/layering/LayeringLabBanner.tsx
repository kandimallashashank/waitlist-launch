"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layers, Sparkles, BadgeCheck, FlaskConical, Zap } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

type LayeringLabBannerProps = {
  variant?: "full" | "compact";
  source?: string;
  /**
   * When set (e.g. on PDP), copy targets layering this product; CTA links to
   * `/layering-lab?first=<id>` so slot 1 is prefilled after sign-in.
   */
  prefillFragranceId?: string;
};

export default function LayeringLabBanner({
  variant = "full",
  source = "homepage",
  prefillFragranceId,
}: LayeringLabBannerProps) {
  const isCompact = variant === "compact";
  const analytics = useAnalytics();
  const viewedRef = useRef(false);
  /** Mount-in animation (avoids framer-motion in this dynamic-import chunk; fewer webpack edge cases). */
  const [bannerEntered, setBannerEntered] = useState(false);
  useEffect(() => {
    setBannerEntered(true);
  }, []);

  useEffect(() => {
    if (viewedRef.current) return;
    const el = document.getElementById(`layering-lab-banner-${source}`);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          analytics.layeringLabBannerViewed?.(source);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [analytics, source]);

  const labHref = prefillFragranceId
    ? `/layering-lab?first=${encodeURIComponent(prefillFragranceId)}`
    : "/layering-lab";
  const isPdpPrefill = Boolean(prefillFragranceId);

  return (
    <section
      id={`layering-lab-banner-${source}`}
      className={
        isCompact
          ? "mt-10 mb-10"
          : "mt-8 mb-5 md:mt-10 md:mb-6"
      }
    >
      <div
        className={
          (isCompact
            ? "relative overflow-hidden rounded-2xl border border-[#E9DBD2] bg-white/80 backdrop-blur p-5"
            : "relative overflow-hidden rounded-3xl border border-[#E9DBD2] bg-white/80 backdrop-blur p-7 md:p-9 shadow-sm") +
          " transition-[opacity,transform] duration-[450ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 " +
          (bannerEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[14px]")
        }
      >
        <div aria-hidden className={isCompact ? "absolute inset-0 bg-gradient-to-br from-[#B85A3A]/10 via-transparent to-[#D4A574]/10" : "absolute inset-0 bg-gradient-to-br from-[#B85A3A]/12 via-transparent to-[#D4A574]/12"} />
        <div aria-hidden className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#D4A574]/20 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#B85A3A]/15 blur-2xl" />

        <div
          className={
            isCompact
              ? "relative"
              : "relative transition-transform duration-200 ease-out hover:scale-[1.01]"
          }
        >
          <div
            className={
              isCompact
                ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                : "flex flex-col md:flex-row md:items-center md:justify-between gap-5"
            }
          >
            <div className="flex min-w-0 w-full items-start gap-3 sm:gap-4 sm:flex-1">
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E9DBD2] bg-[#B85A3A]/10">
                <Layers className="h-5 w-5 text-[#B85A3A]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E9DBD2] bg-[#FDF6F3] px-3 py-1 text-[10px] uppercase tracking-widest text-[#B85A3A] sm:text-[11px] whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  AI Layering Lab
                </div>

                <h2 className={isCompact ? "mt-2 text-base font-display font-bold leading-snug text-[#1A1A1A] sm:text-lg" : "mt-3 text-2xl md:text-3xl font-display font-bold text-[#1A1A1A] leading-snug"}>
                  {isPdpPrefill
                    ? isCompact
                      ? "Test this perfume layered with another"
                      : "Want to test this perfume layered with another?"
                    : "Stop wearing one scent. Start wearing a story."}
                </h2>

                {isPdpPrefill && isCompact && (
                  <p className="mt-1.5 max-w-none text-xs leading-relaxed text-[#5C5A52] sm:max-w-md">
                    Open the lab we&apos;ll set this scent as your first layer. You choose what pairs with it.
                  </p>
                )}

                {!isCompact && (
                  <p className="mt-2 text-sm text-[#404040] max-w-2xl leading-relaxed">
                    {isPdpPrefill
                      ? "See how this fragrance harmonises with a second or third scent. We pre-select it as the first layer so you can pick companions and get an AI harmony score, wear tips, and a blend profile tailored to you."
                      : "Mix up to 3 fragrances and get an AI harmony score, wear timeline, gender spectrum, and layering tips all personalised to your quiz preferences and past orders."}
                  </p>
                )}

                {!isCompact && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { icon: <FlaskConical className="h-3 w-3" />, label: "Harmony score" },
                      { icon: <Zap className="h-3 w-3" />, label: "AI-powered" },
                      { icon: <BadgeCheck className="h-3 w-3" />, label: "Personalised to you" },
                    ].map((pill) => (
                      <span key={pill.label} className="inline-flex items-center gap-1.5 text-[11px] text-[#B85A3A] bg-[#FDF6F3] border border-[#E9DBD2] rounded-full px-2.5 py-1">
                        {pill.icon}{pill.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={
                isCompact
                  ? "flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
                  : "flex shrink-0 items-center gap-3"
              }
            >
              {!isCompact && (
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#E9DBD2] bg-white/70 px-3 py-2">
                  <BadgeCheck className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-xs text-[#404040]">Quiz + past orders</p>
                </div>
              )}
              <Link
                href={labHref}
                onClick={() => analytics.layeringLabCtaClicked?.(source)}
                className={
                  isCompact
                    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#B85A3A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A04D2F] sm:w-auto sm:py-2"
                    : "inline-flex items-center justify-center gap-2 rounded-xl bg-[#B85A3A] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#B85A3A]/20 transition-colors hover:bg-[#A04D2F] md:text-base"
                }
              >
                {isPdpPrefill ? "Open Layering Lab" : "Try it free"}
                <span aria-hidden className="text-white/90">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
