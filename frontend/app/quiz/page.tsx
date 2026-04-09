"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ForYouWizard,
  type WaitlistQuizSuccessPayload,
} from "@/components/for-you/ForYouWizard";
import { QuizPilotResultsPanel } from "@/components/quiz/QuizPilotResultsPanel";
import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";
import { WaitlistGate } from "@/components/waitlist/WaitlistGate";

/**
 * Waitlist pilot scent quiz: restore saved results from session API, or run wizard.
 * Submit uses ``/api/waitlist-preview/quiz/submit``; results show matches, KPIs, and DNA.
 */
export default function WaitlistQuizPage() {
  const [result, setResult] = useState<WaitlistQuizSuccessPayload | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/waitlist-preview/session", {
          credentials: "include",
          headers: { ...getPreviewAuthHeaders() },
        });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as {
          quiz_result?: WaitlistQuizSuccessPayload | null;
        };
        if (data.quiz_result && !cancelled) {
          setResult(data.quiz_result);
        }
      } catch {
        /* no session or network */
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = useCallback((payload: WaitlistQuizSuccessPayload) => {
    setResult(payload);
  }, []);

  const handleRetake = useCallback(() => {
    setResult(null);
  }, []);

  if (bootstrapping) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#FAF7F4] to-[#F0E9E2] px-6">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#EDE0D8] border-t-[#B85A3A]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-[#B85A3A]/30 animate-pulse" />
          </div>
        </div>
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
    <WaitlistGate featureName="the Quiz">
      <div className="pt-4">
        <ForYouWizard waitlistMode onWaitlistSubmitSuccess={handleSuccess} />
      </div>
    </WaitlistGate>
  );
}
