"use client";

/**
 * Animated border highlight (Magic UI-style beam) for bordered containers.
 * Uses framer-motion; styles are Tailwind v3–safe (no v4-only utilities).
 */

import { motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  /** Beam square size in pixels (path radius). */
  size?: number;
  /** Full loop duration in seconds. */
  duration?: number;
  /** Seconds before the loop starts (subtracted in repeat for phase). */
  delay?: number;
  /** Gradient start color (left side of the beam). */
  colorFrom?: string;
  /** Gradient middle / peak color. */
  colorTo?: string;
  /** Optional framer-motion transition overrides. */
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  /** Run the beam counter-clockwise. */
  reverse?: boolean;
  /** Starting position along the path (0–100). */
  initialOffset?: number;
  /** Border thickness the mask follows. */
  borderWidth?: number;
}

export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) {
  const bw = `${borderWidth}px`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent"
      style={{
        borderWidth: bw,
        maskImage:
          "linear-gradient(transparent,transparent), linear-gradient(#000, #000)",
        WebkitMaskImage:
          "linear-gradient(transparent,transparent), linear-gradient(#000, #000)",
        maskClip: "padding-box, border-box",
        WebkitMaskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <motion.div
        className={cn("absolute aspect-square", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          backgroundImage: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
          ...style,
        }}
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}
