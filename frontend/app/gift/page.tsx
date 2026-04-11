"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WaitlistQuizSuccessPayload } from "@/components/for-you/ForYouWizard";
import { QuizBrandSpinner } from "@/components/quiz/QuizBrandSpinner";
import { QuizPilotSurveyModal } from "@/components/quiz/QuizPilotSurveyModal";
import { WaitlistGate } from "@/components/waitlist/WaitlistGate";
import { WAITLIST_GIFT_FLOW_SESSION_KEY } from "@/lib/waitlist/giftFlowStorage";
import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";
import { useAnalytics } from "@/hooks/useAnalytics";

const GIFT_SURVEY_API = "/api/waitlist-preview/gift/survey";

const WaitlistGiftWizard = dynamic(
  () =>
    import("@/components/gift/WaitlistGiftWizard").then((m) => ({
      default: m.WaitlistGiftWizard,
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
 * Returns true when this waitlist session already completed or skipped the gift pilot survey.
 */
async function fetchGiftPilotSurveyCompleted(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  try {
    const res = await fetch(GIFT_SURVEY_API, {
      method: "GET",
      credentials: "include",
      headers: { ...getPreviewAuthHeaders() },
    });
    if (!res.ok) return true;
    const data = (await res.json()) as { completed?: boolean };
    return data.completed === true;
  } catch {
    return true;
  }
}

/**
 * Waitlist gift finder: same access rules as ``/quiz`` (verified waitlist session via
 * ``/api/waitlist-preview/session``). Results and wizard are shown only when the email
 * is on the waitlist; APIs already enforce this on submit.
 */
export default function WaitlistGiftPage() {
  const analytics = useAnalytics();
  const [result, setResult] = useState<WaitlistQuizSuccessPayload | null>(null);
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [verifiedHasSession, setVerifiedHasSession] = useState(false);
  const [giftSurveyOpen, setGiftSurveyOpen] = useState(false);
  const giftSurveyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSession = useCallback(async (options?: { showBootstrapping?: boolean }) => {
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
        gift_result?: WaitlistQuizSuccessPayload | null;
        display_name?: string;
      };
      setResult(data.gift_result ?? null);
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refreshSession({ showBootstrapping: true });
    };
    void run();

    const onFocus = () => {
      void refreshSession();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!verifiedHasSession) {
      setResult(null);
      setSessionDisplayName(null);
      setGiftSurveyOpen(false);
      if (giftSurveyTimerRef.current) {
        clearTimeout(giftSurveyTimerRef.current);
        giftSurveyTimerRef.current = null;
      }
    }
  }, [verifiedHasSession]);

  useEffect(() => {
    return () => {
      if (giftSurveyTimerRef.current) {
        clearTimeout(giftSurveyTimerRef.current);
      }
    };
  }, []);

  const handleSuccess = useCallback((payload: WaitlistQuizSuccessPayload) => {
    if (giftSurveyTimerRef.current) {
      clearTimeout(giftSurveyTimerRef.current);
      giftSurveyTimerRef.current = null;
    }
    setResult(payload);
    void (async () => {
      const done = await fetchGiftPilotSurveyCompleted();
      if (done) return;
      giftSurveyTimerRef.current = setTimeout(() => {
        setGiftSurveyOpen(true);
        giftSurveyTimerRef.current = null;
      }, 10_000);
    })();
  }, []);

  const finalizeGiftSurvey = useCallback(() => {
    setGiftSurveyOpen(false);
  }, []);

  const handleRetake = useCallback(() => {
    analytics.waitlistGiftQuizRetaken();
    if (giftSurveyTimerRef.current) {
      clearTimeout(giftSurveyTimerRef.current);
      giftSurveyTimerRef.current = null;
    }
    setGiftSurveyOpen(false);
    setResult(null);
    try {
      sessionStorage.removeItem(WAITLIST_GIFT_FLOW_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [analytics]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#FAF7F4] to-[#F0E9E2] px-6">
        <QuizBrandSpinner size="lg" label="Loading" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-[#1A1A1A]">Loading gift finder</p>
          <p className="text-xs text-[#8A6A5D]">Checking your preview session…</p>
        </div>
      </div>
    );
  }

  if (!verifiedHasSession) {
    return (
      <WaitlistGate featureName="the Gift finder" verifiedHasSession={false}>
        <span className="sr-only">Join the waitlist to use the gift finder.</span>
      </WaitlistGate>
    );
  }

  if (result) {
    return (
      <>
        <QuizPilotResultsPanel
          recommendations={result.recommendations}
          answers={result.answers}
          preference_analytics={result.preference_analytics}
          scent_profile={result.scent_profile}
          onRetakeQuiz={handleRetake}
          resultsVariant="gift"
          shareDisplayName={sessionDisplayName}
        />
        {giftSurveyOpen ? (
          <QuizPilotSurveyModal
            onFinished={finalizeGiftSurvey}
            surveyApiPath={GIFT_SURVEY_API}
            pilotSurveyKind="gift_finder"
            headline="How did the gift finder feel?"
            intro="About 10 seconds. We only ask this once per account; it helps us tune gifting questions before launch."
          />
        ) : null}
      </>
    );
  }

  return (
    <WaitlistGate featureName="the Gift finder" verifiedHasSession>
      <div className="box-border flex min-h-0 flex-1 basis-0 flex-col overscroll-none pt-2 max-sm:max-h-[calc(100dvh-9rem-env(safe-area-inset-top,0px))] max-sm:pt-1.5 sm:min-h-[20rem] sm:max-h-none sm:pt-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <WaitlistGiftWizard onSuccess={handleSuccess} />
        </div>
      </div>
    </WaitlistGate>
  );
}
