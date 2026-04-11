"use client";

/**
 * PostHog provider + SPA pageviews + identify waitlist emails from session API.
 */

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PostHogConfig } from "posthog-js";

import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";
import {
  getWaitlistPosthogInitOptions,
  initWaitlistPosthogClient,
  posthog,
  WAITLIST_POSTHOG_KEY,
} from "@/lib/posthogWaitlist";

/**
 * Manual ``$pageview`` on App Router navigations (``capture_pageview: false`` in init).
 */
function WaitlistPostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    let cancelled = false;
    let idleId: ReturnType<typeof window.requestIdleCallback> | undefined;
    let timeoutId: number | undefined;

    const firePageview = () => {
      if (cancelled) return;
      initWaitlistPosthogClient();
      if (!WAITLIST_POSTHOG_KEY || !posthog.__loaded) return;

      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
        app_surface: "waitlist_pilot",
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(firePageview, { timeout: 8000 });
    } else {
      timeoutId = window.setTimeout(firePageview, 2500) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pathname, searchParams]);

  return null;
}

/**
 * Calls ``identify`` with waitlist email when ``/api/waitlist-preview/session`` succeeds.
 */
function WaitlistPostHogIdentify() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/waitlist-preview/session", {
          credentials: "include",
          headers: { ...getPreviewAuthHeaders() },
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { email?: unknown };
        const email =
          typeof data.email === "string" && data.email.includes("@")
            ? data.email.trim().toLowerCase()
            : null;
        if (!email) return;

        initWaitlistPosthogClient();
        if (!posthog.__loaded) return;

        posthog.identify(email, {
          email,
          app_surface: "waitlist_pilot",
        });
      } catch {
        /* ignore */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function WaitlistPostHogProvider({ children }: { children: ReactNode }) {
  const posthogOptions = useMemo((): Partial<PostHogConfig> => {
    return {
      ...getWaitlistPosthogInitOptions(),
      loaded: (ph) => {
        if (process.env.NEXT_PUBLIC_WAITLIST_POSTHOG_DEBUG === "true") {
          ph.debug();
        }
      },
    };
  }, []);

  if (!WAITLIST_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider apiKey={WAITLIST_POSTHOG_KEY} options={posthogOptions}>
      <WaitlistPostHogIdentify />
      <Suspense fallback={null}>
        <WaitlistPostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
