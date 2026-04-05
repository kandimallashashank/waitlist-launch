"use client";

/**
 * Blind Buy Score: short mention + signal-flow (sources → scentrev). No separate “score” card.
 * Reddit & Facebook marks live under /public/images/waitlist-pipeline/.
 */

import React, { forwardRef, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatedBeam } from "@/registry/magicui/animated-beam";
import { cn } from "@/lib/utils";

const REDDIT_SRC = "/images/waitlist-pipeline/reddit.png";
const FACEBOOK_SRC = "/images/waitlist-pipeline/facebook.png";

const SourceNode = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; "aria-label": string }
>(({ className, children, "aria-label": ariaLabel }, ref) => (
  <div
    ref={ref}
    role="img"
    aria-label={ariaLabel}
    className={cn(
      "z-[2] flex size-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D4C9BB]/90 bg-[#EFE8DE]/75 shadow-[0_8px_28px_-14px_rgba(20,18,15,0.18)] backdrop-blur-[2px] sm:size-[64px]",
      className
    )}
  >
    {children}
  </div>
));
SourceNode.displayName = "SourceNode";

function WebIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" className="size-[34px] sm:size-9" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#E8E2DA" stroke="#2563EB" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" fill="none" stroke="#3B82F6" strokeWidth="1.2" rx="6" ry="14" />
      <ellipse cx="16" cy="16" fill="none" stroke="#3B82F6" strokeWidth="1.2" rx="14" ry="6" />
      <line x1="1" y1="16" x2="31" y2="16" stroke="#60A5FA" strokeWidth="1" />
      <path fill="#22C55E" fillOpacity="0.35" d="M16 2a14 14 0 0 1 0 28c4-3 6-8 6-14s-2-11-6-14z" />
    </svg>
  );
}

export default function WaitlistBlindBuyPipeline(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const redditRef = useRef<HTMLDivElement>(null);
  const facebookRef = useRef<HTMLDivElement>(null);
  const webRef = useRef<HTMLDivElement>(null);
  const processorRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="blind-buy-score"
      className="border-t border-[#E8E0D6] bg-[#F8F5EF] py-10 md:py-12"
      aria-labelledby="blind-buy-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#B85A3A] sm:text-xs">
            Behind the score
          </span>
          <h2
            id="blind-buy-heading"
            className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight text-[#14120F] sm:text-3xl"
          >
            Blind Buy Score
          </h2>
          <p className="mt-3 text-sm leading-snug text-[#4A4540] sm:text-[0.9375rem] sm:leading-relaxed">
            We also surface a <span className="font-semibold text-[#14120F]">Blind Buy Score</span> from real chatter
            (Reddit, Facebook Marketplace, open web), normalized for India&apos;s heat and humidity, so samples and
            full bottles sit in the same honest picture.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-md sm:mt-9 sm:max-w-lg">
          <p className="mb-5 text-center text-[9px] font-semibold uppercase tracking-[0.32em] text-[#8A8279] sm:mb-6 sm:text-[10px]">
            Signal flow
          </p>

          <div
            ref={containerRef}
            className="relative isolate mx-auto grid min-h-[220px] w-full grid-rows-[auto_minmax(4.5rem,1fr)_auto] sm:min-h-[240px]"
          >
            <div className="relative z-[2] grid grid-cols-3 place-items-center gap-2 px-0 sm:gap-3">
              <SourceNode ref={redditRef} aria-label="Reddit">
                <Image
                  src={REDDIT_SRC}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 object-contain sm:size-11"
                  sizes="44px"
                />
              </SourceNode>
              <SourceNode ref={facebookRef} aria-label="Facebook Marketplace">
                <Image
                  src={FACEBOOK_SRC}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 object-contain sm:size-11"
                  sizes="44px"
                />
              </SourceNode>
              <SourceNode ref={webRef} aria-label="Open web">
                <WebIcon />
              </SourceNode>
            </div>

            <div className="relative z-[2] flex flex-col items-center justify-center py-3 sm:py-4">
              <div
                ref={processorRef}
                className="rounded-2xl border border-white/12 bg-[#14120F] px-6 py-3 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] sm:px-8 sm:py-3.5"
              >
                <span className="font-display text-sm font-semibold lowercase tracking-tight text-white sm:text-base">
                  scentrev
                </span>
              </div>
            </div>

            <p className="relative z-[2] pt-2 text-center font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A] sm:text-[11px] sm:tracking-[0.22em]">
              Blind Buy Score
            </p>

            <AnimatedBeam
              containerRef={containerRef}
              fromRef={redditRef}
              toRef={processorRef}
              fromEdge="bottom"
              toEdge="top"
              curvature={-52}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={facebookRef}
              toRef={processorRef}
              fromEdge="bottom"
              toEdge="top"
              curvature={0}
            />
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={webRef}
              toRef={processorRef}
              fromEdge="bottom"
              toEdge="top"
              curvature={52}
            />
          </div>
        </div>

        <div className="mt-7 flex justify-center sm:mt-8">
          <Link
            href="#waitlist-form"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#B85A3A] px-7 text-sm font-semibold text-white shadow-md shadow-[#B85A3A]/22 transition-colors hover:bg-[#A04D2F] sm:h-12 sm:px-8"
          >
            Join the waitlist
          </Link>
        </div>
      </div>
    </section>
  );
}
