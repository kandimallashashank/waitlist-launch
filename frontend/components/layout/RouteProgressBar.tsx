'use client';

/**
 * Thin indeterminate bar fixed to the top of the viewport during transitions.
 * Shared by route fallbacks and in-page loading shells (e.g. PDP fetch).
 */

export function RouteProgressBar() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-[#E8DDD8]/40"
      aria-hidden
    >
      <div
        className="scentrev-route-progress-bar h-full w-[min(42%,280px)] rounded-full bg-gradient-to-r from-transparent via-[#C17A5B] to-transparent shadow-[0_0_12px_rgba(184,90,58,0.35)]"
        style={{
          animation:
            'scentrev-route-progress 1.05s cubic-bezier(0.45, 0, 0.2, 1) infinite',
        }}
      />
    </div>
  );
}
