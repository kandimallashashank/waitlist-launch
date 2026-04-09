"use client";

import React, { useId } from "react";

/**
 * Inline bottle silhouette when no product image is available (quiz loading, waitlist hero).
 */
export function BottlePlaceholderSVG(): React.ReactElement {
  const gradId = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 120 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-56 w-auto opacity-30"
      aria-hidden
    >
      <rect x="42" y="0" width="36" height="22" rx="6" fill="#C4A48E" />
      <rect x="46" y="22" width="28" height="8" rx="2" fill="#B89880" />
      <rect x="50" y="30" width="20" height="30" rx="4" fill="#D8C4B4" />
      <path
        d="M50 60 C50 60, 24 75, 24 95 L24 240 C24 256 36 268 52 268 L68 268 C84 268 96 256 96 240 L96 95 C96 75, 70 60 70 60 Z"
        fill={`url(#${gradId})`}
        stroke="#C4A48E"
        strokeWidth="1.5"
      />
      <rect x="36" y="120" width="48" height="72" rx="8" fill="white" fillOpacity="0.35" />
      <rect x="44" y="140" width="32" height="3" rx="1.5" fill="#C4A48E" fillOpacity="0.4" />
      <rect x="48" y="150" width="24" height="2" rx="1" fill="#C4A48E" fillOpacity="0.25" />
      <defs>
        <linearGradient id={gradId} x1="60" y1="60" x2="60" y2="268" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0E2D6" />
          <stop offset="0.5" stopColor="#E8D4C4" />
          <stop offset="1" stopColor="#D8C0AE" />
        </linearGradient>
      </defs>
    </svg>
  );
}
