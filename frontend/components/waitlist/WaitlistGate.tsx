"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { QuizBrandSpinner } from "@/components/quiz/QuizBrandSpinner";
import { Sparkles, Lock } from "lucide-react";
import { usePreviewSession } from "@/lib/waitlist/usePreviewSession";
import { useAnalytics } from "@/hooks/useAnalytics";

interface WaitlistGateBodyProps {
  children: React.ReactNode;
  featureName: string;
  ready: boolean;
  hasSession: boolean;
}

function WaitlistGateBody({
  children,
  featureName,
  ready,
  hasSession,
}: WaitlistGateBodyProps) {
  const analytics = useAnalytics();
  const prevLockedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    const locked = !hasSession;
    if (locked && prevLockedRef.current !== true) {
      analytics.waitlistGateShown(featureName);
    }
    prevLockedRef.current = locked;
  }, [ready, hasSession, featureName, analytics]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-[#FAF7F4] to-[#F0E9E2]">
        <QuizBrandSpinner size="sm" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E0D8CC] bg-white shadow-sm">
          <Lock className="h-6 w-6 text-[#B85A3A]" aria-hidden />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">
          Pilot preview
        </p>
        <h1 className="font-display text-2xl font-semibold text-[#14120F] sm:text-3xl">
          Join the waitlist to unlock {featureName}.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#3A342E]">
          The quiz, gift finder, Layering Lab, catalog, and subscription are available to waitlist members during the pilot.
          Sign up takes 10 seconds.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/#waitlist-form"
            scroll={false}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B85A3A] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A04D2F]"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Join the waitlist
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[#8A7A72] underline-offset-2 hover:text-[#B85A3A] hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function WaitlistGateWithProbe({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName: string;
}) {
  const { ready, hasSession } = usePreviewSession();
  return (
    <WaitlistGateBody
      featureName={featureName}
      ready={ready}
      hasSession={hasSession}
    >
      {children}
    </WaitlistGateBody>
  );
}

interface WaitlistGateProps {
  children: React.ReactNode;
  /** Label shown in the lock screen, e.g. "Quiz" */
  featureName?: string;
  /**
   * When set, skip ``/api/waitlist-preview/session`` inside the gate (parent already called it).
   * Avoids duplicate network work on pages that bootstrap session first (e.g. quiz).
   */
  verifiedHasSession?: boolean;
}

/**
 * Wraps a page and shows a waitlist signup prompt if the user hasn't joined yet.
 * Once they have a preview session token, renders children normally.
 */
export function WaitlistGate({
  children,
  featureName = "this feature",
  verifiedHasSession,
}: WaitlistGateProps) {
  if (typeof verifiedHasSession === "boolean") {
    return (
      <WaitlistGateBody
        featureName={featureName}
        ready
        hasSession={verifiedHasSession}
      >
        {children}
      </WaitlistGateBody>
    );
  }

  return (
    <WaitlistGateWithProbe featureName={featureName}>
      {children}
    </WaitlistGateWithProbe>
  );
}
