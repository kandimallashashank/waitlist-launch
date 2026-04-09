'use client';

/**
 * Product listing skeleton: matches PLP card chrome (image well, meta, CTA) so
 * loading reads as “grid incoming” instead of a single centered spinner block.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  PRODUCT_CARD_LISTING_IMAGE_ASPECT_CLASS,
  PRODUCT_IMAGE_WELL_CLASS,
} from '@/lib/productCardVisual';

export interface PlpProductGridSkeletonProps {
  /** Same grid class as the real PLP (`productGridClassName` from `usePlpListingView`). */
  gridClassName: string;
  /** Placeholder cards (default: 9 ≈ 3×3 on large screens). */
  cardCount?: number;
  className?: string;
  /** Screen-reader-only status (visual layout implies loading). */
  statusLabel?: string;
  /** When true, omit role/sr-only so a parent route shell owns the live region. */
  embedded?: boolean;
}

function shimmerStyle(delaySec: number): React.CSSProperties {
  return {
    animation: `scentrev-skeleton-shimmer 1.7s ease-in-out ${delaySec.toFixed(2)}s infinite`,
  };
}

/**
 * Single PLP tile skeleton aligned with `new-arrivals-men` / `PerfumeListingCard` footprint.
 */
function PlpSkeletonCard({ index }: { index: number }) {
  const baseDelay = (index % 8) * 0.07;

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_0_rgba(26,26,26,0.04)]">
      <div
        className={cn(
          'relative p-2 sm:p-2.5',
          PRODUCT_CARD_LISTING_IMAGE_ASPECT_CLASS,
          PRODUCT_IMAGE_WELL_CLASS,
        )}
      >
        <div
          className="scentrev-skeleton-pulse absolute left-2 top-2 h-5 w-11 rounded-full bg-[#B85A3A]/25"
          style={shimmerStyle(baseDelay)}
          aria-hidden
        />
        <div className="absolute right-2 top-2 flex flex-col gap-1.5" aria-hidden>
          <div
            className="scentrev-skeleton-pulse h-7 w-7 rounded-full bg-white/80 ring-1 ring-[#E8DDD8]/80"
            style={shimmerStyle(baseDelay + 0.04)}
          />
          <div
            className="scentrev-skeleton-pulse h-7 w-7 rounded-full bg-white/80 ring-1 ring-[#E8DDD8]/80"
            style={shimmerStyle(baseDelay + 0.08)}
          />
        </div>
        <div className="flex h-full flex-col items-center justify-end pb-2 pt-6">
          <div
            className="scentrev-skeleton-pulse h-[62%] w-[38%] max-w-[5.5rem] rounded-lg bg-gradient-to-b from-[#EDE4DE]/90 to-[#DDD3CC]/50"
            style={shimmerStyle(baseDelay + 0.02)}
            aria-hidden
          />
          <div
            className="scentrev-skeleton-pulse mt-2 h-2 w-[42%] max-w-[6rem] rounded-full bg-[#C4B4A8]/35"
            style={shimmerStyle(baseDelay + 0.06)}
            aria-hidden
          />
        </div>
      </div>

      <div className="space-y-2 p-2.5 sm:p-3">
        <div
          className="scentrev-skeleton-pulse h-2.5 w-1/3 max-w-[5rem] rounded-md bg-[#E5DFD8]"
          style={shimmerStyle(baseDelay + 0.1)}
          aria-hidden
        />
        <div
          className="scentrev-skeleton-pulse h-3.5 w-[88%] max-w-none rounded-md bg-[#E8E2DC]"
          style={shimmerStyle(baseDelay + 0.12)}
          aria-hidden
        />
        <div className="flex items-center gap-1.5 pt-0.5" aria-hidden>
          <div
            className="scentrev-skeleton-pulse h-3 w-3 rounded-sm bg-[#D4A574]/40"
            style={shimmerStyle(baseDelay + 0.14)}
          />
          <div
            className="scentrev-skeleton-pulse h-2.5 w-8 rounded bg-[#DDD5CE]"
            style={shimmerStyle(baseDelay + 0.15)}
          />
        </div>
        <div className="flex items-baseline gap-2 pt-0.5" aria-hidden>
          <div
            className="scentrev-skeleton-pulse h-5 w-16 rounded-md bg-[#DDD5CE]"
            style={shimmerStyle(baseDelay + 0.16)}
          />
          <div
            className="scentrev-skeleton-pulse h-3.5 w-12 rounded bg-[#E8E2DC]/80"
            style={shimmerStyle(baseDelay + 0.17)}
          />
        </div>
        <div
          className="scentrev-skeleton-pulse mt-1 h-9 w-full rounded-lg bg-gradient-to-r from-[#C9A088]/30 via-[#B85A3A]/22 to-[#C9A088]/30"
          style={shimmerStyle(baseDelay + 0.18)}
          aria-hidden
        />
      </div>
    </div>
  );
}

/**
 * Skeleton grid for fragrance PLPs while catalog data loads.
 *
 * Args:
 *     gridClassName: Tailwind grid classes matching the loaded product grid.
 *     cardCount: How many placeholder cards to render.
 *     className: Optional wrapper classes.
 *     statusLabel: Accessible loading message.
 *
 * Returns:
 *     Status region with a grid of skeleton product tiles.
 */
export default function PlpProductGridSkeleton({
  gridClassName,
  cardCount = 9,
  className,
  statusLabel = 'Loading products',
  embedded = false,
}: PlpProductGridSkeletonProps) {
  const grid = (
    <div className={gridClassName}>
      {Array.from({ length: cardCount }, (_, i) => (
        <PlpSkeletonCard key={i} index={i} />
      ))}
    </div>
  );

  if (embedded) {
    return <div className={cn('w-full', className)}>{grid}</div>;
  }

  return (
    <div
      className={cn('w-full', className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{statusLabel}</span>
      {grid}
    </div>
  );
}
