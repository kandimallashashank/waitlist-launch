"use client";

/**
 * PostHog client for the waitlist pilot app only.
 * Use a dedicated PostHog project (separate API key from ``apps/web``) so dashboards
 * stay isolated: create project "ScentRev Waitlist Pilot" and paste its key here.
 *
 * Initialization: ``WaitlistPostHogProvider`` uses ``PostHogProvider`` with ``apiKey``
 * so posthog-js/react calls ``init`` in the correct order. Do not pass ``client={posthog}``
 * without init — the provider skips ``init`` when ``client`` is set.
 */

import type { PostHogConfig } from "posthog-js";
import posthog from "posthog-js";

/** Project API key from PostHog → Project settings (waitlist pilot project, not production store). */
export const WAITLIST_POSTHOG_KEY =
  process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_KEY?.trim() || "";

export const WAITLIST_POSTHOG_HOST =
  process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_HOST?.trim() ||
  "https://us.i.posthog.com";

let warnedMissingKey = false;

function warnMissingPosthogKeyOnce(): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  const msg =
    "[PostHog Waitlist] Set NEXT_PUBLIC_WAITLIST_POSTHOG_KEY (Vercel → Environment Variables, then redeploy). Analytics are disabled until it is set.";
  if (process.env.NODE_ENV === "development") {
    console.warn(msg);
    return;
  }
  if (typeof window !== "undefined") {
    console.warn(msg);
  }
}

/**
 * Shared options for ``PostHogProvider`` and fallback ``init`` (must stay in sync).
 */
export function getWaitlistPosthogInitOptions(): Partial<PostHogConfig> {
  return {
    api_host: WAITLIST_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: false,
    disable_surveys: true,
    capture_performance: false,
    persistence: "localStorage+cookie",
  };
}

/**
 * Idempotent init for hooks that run outside the provider path or before effects run.
 * When the provider is used with ``apiKey``, this is usually a no-op after the first paint.
 */
export function initWaitlistPosthogClient(): void {
  if (typeof window === "undefined") return;
  if (!WAITLIST_POSTHOG_KEY) {
    warnMissingPosthogKeyOnce();
    return;
  }
  if (posthog.__loaded) return;
  posthog.init(WAITLIST_POSTHOG_KEY, {
    ...getWaitlistPosthogInitOptions(),
    loaded: (ph) => {
      if (process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_DEBUG === "true") {
        ph.debug();
      }
    },
  });
}

export { posthog };
