"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { AnimatedGradientText } from "@/registry/magicui/animated-gradient-text";
import { cn } from "@/lib/utils";

export interface GradientFeatureAnnouncePillProps {
  /** Shown before the divider (emoji or short text). */
  lead: React.ReactNode;
  /** Main line; rendered with animated gradient. */
  gradientLabel: string;
  className?: string;
}

/**
 * Rounded “announcement” chip with animated gradient label (Magic UI style),
 * adapted for ScentRev terracotta-friendly inset shadow.
 */
export function GradientFeatureAnnouncePill({
  lead,
  gradientLabel,
  className,
}: GradientFeatureAnnouncePillProps): React.ReactElement {
  return (
    <div
      className={cn(
        "group relative mx-auto flex w-fit max-w-full items-center justify-center rounded-full px-4 py-1.5",
        "shadow-[inset_0_-8px_10px_rgba(184,90,58,0.12)] transition-shadow duration-500 ease-out",
        "hover:shadow-[inset_0_-5px_10px_rgba(184,90,58,0.2)]",
        className
      )}
    >
      <span
        className={cn(
          "animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r",
          "from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]"
        )}
        style={{
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "subtract",
        }}
        aria-hidden
      />
      <span className="relative z-[1] flex items-center">
        <span className="shrink-0 text-base leading-none">{lead}</span>
        <span
          className="mx-2 h-4 w-px shrink-0 bg-neutral-400"
          aria-hidden
        />
        <AnimatedGradientText className="text-sm font-medium">
          {gradientLabel}
        </AnimatedGradientText>
        <ChevronRight
          className="ml-1 size-4 shrink-0 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </div>
  );
}
