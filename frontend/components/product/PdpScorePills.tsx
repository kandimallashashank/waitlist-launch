"use client";

/**
 * PdpScorePills compact compliment score indicator for the PDP.
 * Fetches /api/v1/fragrances/{id}/pdp-scores once on mount.
 * Renders nothing while loading or if score is absent.
 */

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ComplimentBar({ value }: { value: number }) {
  const filled = Math.round(value / 2); // 0-10 → 0-5 dots
  return (
    <div className="flex items-center gap-0.5" aria-label={`Compliment score ${value} out of 10`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < filled ? "bg-[#B85A3A]" : "bg-neutral-200"}`}
        />
      ))}
    </div>
  );
}

export default function PdpScorePills({ fragranceId }: { fragranceId: string }) {
  const [complimentFactor, setComplimentFactor] = useState<number | null>(null);

  useEffect(() => {
    // pdp-scores endpoint requires FastAPI - not available in waitlist
  }, [fragranceId]);

  if (complimentFactor == null) return null;

  return (
    <div
      className="flex w-fit items-center gap-1.5 rounded-full border border-[#E9DBD2] bg-[#FFF8F5] px-2.5 py-1"
      title={`Compliment score: ${complimentFactor}/10`}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-[#B85A3A]" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B85A3A]">
        Gets noticed
      </span>
      <ComplimentBar value={complimentFactor} />
    </div>
  );
}
