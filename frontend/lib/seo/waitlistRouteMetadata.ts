/**
 * Per-route SEO for the waitlist Next app (canonical, robots, social).
 */

import type { Metadata } from "next";

const PUBLIC_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/**
 * Caps ``meta description`` length for SERP display.
 */
export function clampWaitlistDescription(text: string, maxLength: number = 160): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Builds language alternates for waitlist pages.
 *
 * The site currently serves a single locale, but including `x-default`
 * keeps metadata shape stable for multi-locale expansion.
 */
export function waitlistHreflangLanguages(pathname: string): Record<string, string> {
  return {
    "en-IN": pathname,
    "x-default": pathname,
  };
}

/**
 * Builds metadata for a waitlist route with a self-referencing canonical path.
 */
export function buildWaitlistRouteMetadata(
  pathname: string,
  title: string,
  description: string,
): Metadata {
  const desc = clampWaitlistDescription(description);
  return {
    title,
    description: desc,
    alternates: { canonical: pathname },
    robots: PUBLIC_ROBOTS,
    openGraph: {
      title,
      description: desc,
      type: "website",
      url: pathname,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  };
}
