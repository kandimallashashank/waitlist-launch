"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface AnimatedGradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Inline text with an animated multi-stop gradient (Magic UI pattern).
 *
 * Args:
 *   className: Extra classes (e.g. font size).
 *   children: Label content.
 */
export function AnimatedGradientText({
  className,
  children,
  ...props
}: AnimatedGradientTextProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:300%_100%] bg-clip-text text-transparent animate-gradient",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
