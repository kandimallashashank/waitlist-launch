'use client';

import { cn } from '@/lib/utils';

type ProductDetailLoadingSkeletonProps = {
  /** Optional root class (e.g. min-height overrides). */
  className?: string;
};

/**
 * Skeleton layout that mirrors the product detail page (gallery + buy box).
 *
 * Args:
 *     className: Extra classes on the root element.
 *
 * Returns:
 *     Accessible busy region with shimmer placeholders (no centered spinner card).
 */
export function ProductDetailLoadingSkeleton({
  className,
}: ProductDetailLoadingSkeletonProps) {
  const pulse = (delaySec: number) => ({
    animation: `scentrev-skeleton-shimmer 1.65s ease-in-out ${delaySec}s infinite`,
  });

  return (
    <div
      className={cn(
        'relative min-h-screen w-full min-w-0 overflow-x-clip bg-white pt-16 sm:pt-20',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading product"
    >
      <div className="mx-auto max-w-7xl min-w-0 px-4 pt-3 pb-10 md:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="scentrev-skeleton-pulse h-3 w-24 rounded-md bg-[#EDE8E4]"
            style={pulse(0)}
          />
          <span className="text-[#D4CFC9]">/</span>
          <div
            className="scentrev-skeleton-pulse h-3 w-28 rounded-md bg-[#EDE8E4]"
            style={pulse(0.05)}
          />
          <span className="text-[#D4CFC9]">/</span>
          <div
            className="scentrev-skeleton-pulse h-3 w-36 rounded-md bg-[#E8E2DC]"
            style={pulse(0.1)}
          />
        </div>

        <div className="mt-5 grid gap-8 md:grid-cols-2 md:items-start lg:gap-12">
          <div className="space-y-4">
            <div
              className="scentrev-skeleton-pulse aspect-[4/5] w-full max-w-xl mx-auto md:mx-0 rounded-2xl border border-[#F0EBE6] bg-gradient-to-b from-[#FAF7F4] to-[#F3EDE8] shadow-[0_8px_32px_-16px_rgba(26,26,26,0.08)]"
              style={pulse(0)}
            />
            <div className="flex justify-center gap-2 md:justify-start">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="scentrev-skeleton-pulse h-14 w-14 shrink-0 rounded-lg border border-[#F0EBE6] bg-[#F7F3EF]"
                  style={pulse(0.08 * i)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-5 md:pt-1">
            <div
              className="scentrev-skeleton-pulse h-3.5 w-28 rounded-md bg-[#E5DFD8]"
              style={pulse(0.02)}
            />
            <div
              className="scentrev-skeleton-pulse h-9 max-w-lg rounded-lg bg-[#E8E2DC]"
              style={pulse(0.06)}
            />
            <div
              className="scentrev-skeleton-pulse h-3.5 max-w-xs rounded-md bg-[#EDE8E4]"
              style={pulse(0.1)}
            />
            <div className="flex items-center gap-3 pt-1">
              <div
                className="scentrev-skeleton-pulse h-8 w-24 rounded-md bg-[#D4C4BA]/45"
                style={pulse(0.12)}
              />
              <div
                className="scentrev-skeleton-pulse h-6 w-16 rounded bg-[#EDE8E4]"
                style={pulse(0.14)}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="scentrev-skeleton-pulse h-10 w-[4.5rem] rounded-full border border-[#EDE8E4] bg-[#FAF7F4]"
                  style={pulse(0.06 + i * 0.04)}
                />
              ))}
            </div>
            <div
              className="scentrev-skeleton-pulse mt-2 h-[3.25rem] w-full max-w-sm rounded-xl bg-gradient-to-r from-[#C9A088]/35 via-[#B85A3A]/25 to-[#C9A088]/35"
              style={pulse(0.2)}
            />
            <div className="space-y-2.5 pt-4 border-t border-[#F0EBE6]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="scentrev-skeleton-pulse h-3 rounded bg-[#EDE8E4]"
                  style={{
                    ...pulse(0.22 + i * 0.04),
                    width: `${72 - i * 8}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
