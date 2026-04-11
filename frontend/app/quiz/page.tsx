"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import type { WaitlistQuizSuccessPayload } from "@/components/for-you/ForYouWizard";
import { QuizBrandSpinner } from "@/components/quiz/QuizBrandSpinner";
import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";
import { WaitlistGate } from "@/components/waitlist/WaitlistGate";
import { useAnalytics } from "@/hooks/useAnalytics";

const ForYouWizard = dynamic(
  () =>
    import("@/components/for-you/ForYouWizard").then((m) => ({
      default: m.ForYouWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#FAF7F4] to-[#F0E9E2]">
        <QuizBrandSpinner size="md" />
      </div>
    ),
  },
);

const QuizPilotResultsPanel = dynamic(
  () =>
    import("@/components/quiz/QuizPilotResultsPanel").then((m) => ({
      default: m.QuizPilotResultsPanel,
    })),
  { ssr: false },
);

/**
 * Waitlist pilot scent quiz: restore saved results from session API, or run wizard.
 * Submit uses ``/api/waitlist-preview/quiz/submit``; results show matches, why-copy, and scent chart.
 */
export default function WaitlistQuizPage() {
  const analytics = useAnalytics();
  const [result, setResult] = useState<WaitlistQuizSuccessPayload | null>(null);
  /** From waitlist row ``full_name`` (session API) for share card + greetings. */
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  /** Mirrors session endpoint success so WaitlistGate can skip a second /session fetch. */
  const [verifiedHasSession, setVerifiedHasSession] = useState(false);

  const refreshSession = useCallback(
    async (options?: { showBootstrapping?: boolean }) => {
      const showBootstrapping = options?.showBootstrapping === true;
      if (showBootstrapping) {
        setBootstrapping(true);
      }
      try {
        const res = await fetch("/api/waitlist-preview/session", {
          credentials: "include",
          headers: { ...getPreviewAuthHeaders() },
          cache: "no-store",
        });
        setVerifiedHasSession(res.ok);
        if (!res.ok) {
          setResult(null);
          setSessionDisplayName(null);
          return;
        }
        const data = (await res.json()) as {
          quiz_result?: WaitlistQuizSuccessPayload | null;
          display_name?: string;
        };
        setResult(data.quiz_result ?? null);
        setSessionDisplayName(
          typeof data.display_name === "string" && data.display_name.trim()
            ? data.display_name.trim()
            : null,
        );
      } catch {
        setVerifiedHasSession(false);
        setResult(null);
        setSessionDisplayName(null);
      } finally {
        if (showBootstrapping) {
          setBootstrapping(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const safeRefresh = async (options?: { showBootstrapping?: boolean }) => {
      if (cancelled) return;
      await refreshSession(options);
    };

    void safeRefresh({ showBootstrapping: true });

    const onWindowFocus = () => {
      void safeRefresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void safeRefresh();
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!verifiedHasSession) {
      setResult(null);
      setSessionDisplayName(null);
    }
  }, [verifiedHasSession]);

  const handleSuccess = useCallback((payload: WaitlistQuizSuccessPayload) => {
    setResult(payload);
  }, []);

  const handleRetake = useCallback(() => {
    analytics.waitlistQuizRetaken("scent");
    setResult(null);
  }, [analytics]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#FAF7F4] to-[#F0E9E2] px-6">
        <QuizBrandSpinner size="lg" label="Loading your quiz" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#1A1A1A]">Loading your quiz</p>
          <p className="text-xs text-[#8A6A5D]">Preparing your personalized experience…</p>
        </div>
      </div>
    );
  }

  if (!verifiedHasSession) {
    return (
      <WaitlistGate featureName="the Quiz" verifiedHasSession={false}>
        <span className="sr-only">Join the waitlist to use the quiz.</span>
      </WaitlistGate>
    );
  }

  if (result) {
    return (
      <QuizPilotResultsPanel
        recommendations={result.recommendations}
        answers={result.answers}
        preference_analytics={result.preference_analytics}
        scent_profile={result.scent_profile}
        onRetakeQuiz={handleRetake}
        shareDisplayName={sessionDisplayName}
      />
    );
  }

  return (
    <WaitlistGate featureName="the Quiz" verifiedHasSession>
      {/*
        Bounded column height so step 2 (anchor grid) gets flex-1 + min-h-0 scroll on iOS Safari.
        Slightly taller column on small screens (6.75rem offset) for more picker viewport; sm+ uses 8rem.
      */}
      <div className="box-border flex h-[calc(100dvh-5.5rem)] min-h-0 flex-col overscroll-none pt-2 max-sm:h-[calc(100dvh-5rem)] max-sm:pt-1.5 sm:h-[calc(100dvh-7.5rem)] sm:min-h-[20rem] sm:pt-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ForYouWizard
            waitlistMode
            pilotSurveyAfterSubmit
            onWaitlistSubmitSuccess={handleSuccess}
          />
        </div>
      </div>
    </WaitlistGate>
  );
}
