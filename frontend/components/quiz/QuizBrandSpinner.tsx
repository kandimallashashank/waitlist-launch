"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

/**
 * Quiz / waitlist pilot loading indicator: Lucide arc (clear at any DPI, no nested spin effects).
 */
export function QuizBrandSpinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("inline-flex text-[#B85A3A]", className)} role="status" aria-label={label}>
      <Loader2 className={cn("animate-spin", SIZE_CLASS[size])} strokeWidth={1.65} aria-hidden />
    </span>
  );
}
