"use client";

import React from 'react';
import { useReducedMotion } from 'framer-motion';

const TICKER_ITEMS = [
  'Data-backed discovery',
  'Climate-aware picks for India',
  'Graph-linked recommendations',
  'Micro samples · Full transparency',
  'Blind-buy score + real sentiment',
  'Quiz in 90 seconds',
];

/**
 * Infinite horizontal ticker of value props (YC-style startup strip).
 * Uses CSS `translate3d` + linear animation (compositor-friendly; see emil-design-eng).
 *
 * Returns:
 *   A full-width dark band with scrolling phrases, or a static wrap when reduced motion is requested.
 */
export default function WaitlistValueTicker(): React.ReactElement {
  const loop = [...TICKER_ITEMS, ...TICKER_ITEMS];
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className="w-full border-b border-[#7A3A23]/30 bg-[#3A1A10] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#E8B99A]">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-center">
          {TICKER_ITEMS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden border-b border-[#7A3A23]/30 bg-[#3A1A10] py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#E8B99A]"
      aria-hidden
    >
      <div
        className="waitlist-marquee-track gap-10 md:gap-14"
        style={{ ['--waitlist-marquee-duration' as string]: '48s' }}
      >
        {loop.map((label, i) => (
          <span key={`${label}-${i}`} className="flex shrink-0 items-center gap-10 md:gap-14">
            <span>{label}</span>
            <span className="text-[#B85A3A]" aria-hidden>
              ·
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
