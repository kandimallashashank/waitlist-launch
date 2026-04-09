/**
 * Site-wide notice: pilot preview uses placeholder prices and blind-buy scores.
 */

import React from "react";

/**
 * Renders a compact banner under the main nav on every page.
 *
 * Args:
 *   className: Optional extra Tailwind classes for the outer wrapper.
 *
 * Returns:
 *   Static notice element (server-safe).
 */
export function PilotPreviewDataNotice({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`border-b border-amber-900/20 bg-amber-950/90 px-4 py-2 text-center text-[11px] leading-snug text-amber-100/95 sm:text-xs ${className}`}
      role="note"
      aria-label="Pilot preview data disclaimer"
    >
      <span className="font-semibold text-amber-50">Pilot preview: </span>
      Prices and blind buy scores here are{" "}
      <span className="font-semibold text-amber-50">testing values only</span>, not final launch
      pricing or scores. Notes, accords, brands, and other fragrance data are from our real
      catalogue.
    </div>
  );
}
