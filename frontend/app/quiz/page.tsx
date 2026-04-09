"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import type { WaitlistQuizSuccessPayload } from "@/components/for-you/ForYouWizard";
import { QuizBrandSpinner } from "@/components/quiz/QuizBrandSpinner";
import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";
import { WaitlistGate } from "@/components/waitlist/WaitlistGate";

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
 * Submit uses ``/api/waitlist-preview/quiz/submit``; results show matches, KPIs, and DNA.
 */
export default function WaitlistQuizPage() {
  const [result, setResult] = useState<WaitlistQuizSuccessPayload | null>(null);
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
          return;
        }
        const data = (await res.json()) as {
          quiz_result?: WaitlistQuizSuccessPayload | null;
        };
        setResult(data.quiz_result ?? null);
      } catch {
        setVerifiedHasSession(false);
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

  const handleSuccess = useCallback((payload: WaitlistQuizSuccessPayload) => {
    setResult(payload);
  }, []);

  const handleRetake = useCallback(() => {
    setResult(null);
  }, []);

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

  if (result) {
    return (
      <QuizPilotResultsPanel
        recommendations={result.recommendations}
        answers={result.answers}
        preference_analytics={result.preference_analytics}
        scent_profile={result.scent_profile}
        onRetakeQuiz={handleRetake}
      />
    );
  }

  return (
    <WaitlistGate featureName="the Quiz" verifiedHasSession={verifiedHasSession}>
      {/*
        Bounded column height so step 2 (anchor grid) gets flex-1 + min-h-0 scroll on iOS Safari.
        Slightly taller column on small screens (6.75rem offset) for more picker viewport; sm+ uses 8rem.
      */}
      <div className="box-border flex h-[calc(100dvh-6.75rem)] min-h-[18rem] flex-col overscroll-none pt-3 max-sm:pt-2 sm:h-[calc(100dvh-8rem)] sm:min-h-[22rem] sm:pt-4">
        <div className="flex min-h-0 flex-1 flex-col">
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
