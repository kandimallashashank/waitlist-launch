"use client";

/**
 * SVG beam between two elements inside a shared container (Magic UI–style).
 * Supports edge anchors so lines connect to node tops/bottoms, not only centers.
 */

import { motion } from "framer-motion";

import { useHydrationSafeReducedMotion } from "@/hooks/useHydrationSafeReducedMotion";
import { type ReactElement, type RefObject, useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

export type BeamEdge = "center" | "top" | "bottom";

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Offset control point perpendicular to chord (px). */
  curvature?: number;
  /** Extra vertical nudge for the end point (px). */
  endYOffset?: number;
  reverse?: boolean;
  duration?: number;
  /** Anchor on the start element (default center). */
  fromEdge?: BeamEdge;
  /** Anchor on the end element (default center). */
  toEdge?: BeamEdge;
}

function anchorPoint(
  rect: DOMRect,
  containerRect: DOMRect,
  edge: BeamEdge,
  pad: number
): { x: number; y: number } {
  const x = rect.left + rect.width / 2 - containerRect.left;
  let y: number;
  if (edge === "top") {
    y = rect.top - containerRect.top + pad;
  } else if (edge === "bottom") {
    y = rect.bottom - containerRect.top - pad;
  } else {
    y = rect.top + rect.height / 2 - containerRect.top;
  }
  return { x, y };
}

/**
 * Draws a quadratic curve between two refs inside `containerRef`.
 *
 * Args:
 *   fromEdge / toEdge: Connect bottom→top for vertical “wiring” through stacked nodes.
 *   curvature: Bends the mid control point (use negative for left-side sources).
 */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  endYOffset = 0,
  reverse = false,
  duration = 3.5,
  fromEdge = "center",
  toEdge = "center",
}: AnimatedBeamProps): ReactElement {
  const rawId = useId().replace(/:/g, "");
  const [d, setD] = useState("");
  const [svgSize, setSvgSize] = useState({ w: 320, h: 280 });
  const reduceMotion = useHydrationSafeReducedMotion();
  const pad = 3;

  useEffect(() => {
    const update = () => {
      const c = containerRef.current;
      const a = fromRef.current;
      const b = toRef.current;
      if (!c || !a || !b) return;
      const w = Math.max(1, Math.round(c.clientWidth));
      const h = Math.max(1, Math.round(c.clientHeight));
      setSvgSize({ w, h });
      const cr = c.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const p1 = anchorPoint(ar, cr, fromEdge, pad);
      const p2 = anchorPoint(br, cr, toEdge, pad);
      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y + endYOffset;
      const dy = y2 - y1;

      // Smooth vertical “wiring”: cubic curve reads cleaner than a single quadratic bump.
      if (fromEdge === "bottom" && toEdge === "top" && Math.abs(dy) > 8) {
        const lift = Math.min(Math.max(Math.abs(dy) * 0.42, 20), 120);
        const lateral = curvature;
        const cp1x = x1 + lateral * 0.35;
        const cp1y = y1 + lift;
        const cp2x = x2 - lateral * 0.35;
        const cp2y = y2 - lift;
        setD(`M ${x1},${y1} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`);
        return;
      }

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + curvature;
      setD(`M ${x1},${y1} Q ${midX},${midY} ${x2},${y2}`);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    const id = window.setInterval(update, 320);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
      window.clearInterval(id);
    };
  }, [containerRef, fromRef, toRef, curvature, endYOffset, fromEdge, toEdge]);

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 size-full overflow-visible",
        className,
      )}
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`beam-grad-${rawId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A67C52" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#C9A07A" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#A67C52" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {d ? (
        <path
          d={d}
          stroke={`url(#beam-grad-${rawId})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 8"
        />
      ) : null}
      {d && !reduceMotion ? (
        <motion.path
          key={d.slice(0, 48)}
          d={d}
          stroke="#9A6B47"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 12"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: reverse ? -68 : 68 }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
          opacity={0.65}
        />
      ) : null}
    </svg>
  );
}
