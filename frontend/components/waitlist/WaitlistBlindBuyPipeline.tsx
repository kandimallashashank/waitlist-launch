"use client";

/**
 * Blind Buy Score: 0-5 rating, sources (Reddit, Facebook Marketplace, web) → ScentRev pipeline.
 * Reddit & Facebook marks live under /public/images/waitlist-pipeline/.
 */

import React, { forwardRef, useRef } from "react";
import Image from "next/image";
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
        <div className="mx-auto max-w-2xl text-center">
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
            We collect what people actually say about each perfume across{' '}
            <span className="font-medium text-[#14120F]">Reddit</span>,{' '}
            <span className="font-medium text-[#14120F]">Facebook</span> (including Marketplace), and the{' '}
            <span className="font-medium text-[#14120F]">open web</span>, then feed it through an integrated pipeline
            alongside hard metrics on the fragrance itself.
          </p>
          <p className="mt-3 text-sm leading-snug text-[#4A4540] sm:text-[0.9375rem] sm:leading-relaxed">
            <span className="font-semibold text-[#14120F]">Blind Buy Score</span> is a single number from{' '}
            <span className="font-semibold tabular-nums text-[#14120F]">0</span> to{' '}
            <span className="font-semibold tabular-nums text-[#14120F]">5</span>:{' '}
            <span className="font-medium text-[#14120F]">0</span> means a weak blind buy (high regret risk),{' '}
            <span className="font-medium text-[#14120F]">5</span> means the crowd signal and the juice&apos;s profile
            line up for buying unsniffed. It&apos;s a weighted blend so you spend less time hunting threads and more
            time on scents worth trying, with India&apos;s heat and humidity in the mix.
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
                <span className="font-display text-sm font-semibold tracking-tight text-white sm:text-base">
                  ScentRev
                </span>
              </div>
            </div>

            <div className="relative z-[2] pt-2 text-center">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A] sm:text-[11px] sm:tracking-[0.22em]">
                Blind Buy Score
              </p>
              <p className="mt-1 text-[10px] leading-snug text-[#6B645C] sm:text-[11px]">
                <span className="tabular-nums font-medium text-[#14120F]">0</span> weak blind buy ·{' '}
                <span className="tabular-nums font-medium text-[#14120F]">5</span> strong blind buy
              </p>
            </div>

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
      </div>
    </section>
  );
}
