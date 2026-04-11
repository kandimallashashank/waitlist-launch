"use client";

/**
 * PostHog client for the waitlist pilot app only.
 * Use a dedicated PostHog project (separate API key from ``apps/web``) so dashboards
 * stay isolated: create project "ScentRev Waitlist Pilot" and paste its key here.
 */

import posthog from "posthog-js";

/** Project API key from PostHog → Project settings (waitlist pilot project, not production store). */
export const WAITLIST_POSTHOG_KEY =
  process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_KEY?.trim() || "";

export const WAITLIST_POSTHOG_HOST =
  process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_HOST?.trim() ||
  "https://us.i.posthog.com";

let warnedMissingKey = false;

/**
 * Initialize the waitlist PostHog client once. Safe to call from any client code.
 */
export function initWaitlistPosthogClient(): void {
  if (typeof window === "undefined") return;
  if (!WAITLIST_POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development" && !warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[PostHog Waitlist] Set NEXT_PUBLIC_WAITLIST_POSTHOG_KEY in .env.local — events are skipped until configured.",
      );
    }
    return;
  }
  if (posthog.__loaded) return;
  posthog.init(WAITLIST_POSTHOG_KEY, {
    api_host: WAITLIST_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: false,
    disable_surveys: true,
    capture_performance: false,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_DEBUG === "true") {
        ph.debug();
      }
    },
  });
}

export { posthog };
