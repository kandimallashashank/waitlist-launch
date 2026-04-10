"use client";

import { useState } from "react";

import { getPreviewAuthHeaders } from "@/lib/waitlist/previewSessionClient";

/**
 * One-time post-quiz pilot feedback (length / relevance). Parent controls mount timing
 * (e.g. 5s after results) so the modal survives ``ForYouWizard`` unmount.
 */
export function QuizPilotSurveyModal({ onFinished }: { onFinished: () => void }) {
  const [tooLong, setTooLong] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const finish = async (mode: "skip" | "submit") => {
    setSaving(true);
    try {
      await fetch("/api/waitlist-preview/quiz/survey", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getPreviewAuthHeaders(),
        },
        body: JSON.stringify(
          mode === "skip"
            ? { skipped: true }
            : {
                too_long_rating: tooLong,
                irrelevant_tags: tags,
                free_text: freeText.slice(0, 2000),
              },
        ),
      });
    } catch {
      /* non-blocking: still advance so the user is not stuck */
    } finally {
      setSaving(false);
      onFinished();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E8DFD8] bg-[#FDFBF8] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B85A3A]">
          Quick pilot check-in
        </p>
        <h2 className="mt-2 font-display text-xl text-[#1A1A1A]">
          How did the quiz feel?
        </h2>
        <p className="mt-2 text-sm text-[#5F5C57]">
          About 10 seconds. We only ask this once per account; it helps us fix length and pacing before launch.
        </p>

        <p className="mt-5 text-xs font-semibold text-[#1A1A1A]">
          Felt too long? (1 = not at all, 5 = very)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTooLong(n)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                tooLong === n
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-white text-[#5F5C57] ring-1 ring-[#E5DED4]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold text-[#1A1A1A]">
          Anything feel off?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { id: "too_many_questions", label: "Too many questions" },
            { id: "too_many_steps", label: "Too many steps" },
            { id: "irrelevant_questions", label: "Irrelevant questions" },
            { id: "unclear_options", label: "Unclear answer options" },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleTag(o.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tags.includes(o.id)
                  ? "bg-[#B85A3A] text-white"
                  : "bg-white text-[#5F5C57] ring-1 ring-[#E5DED4]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-semibold text-[#1A1A1A]">
          Anything else? (optional)
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-[#E5DED4] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none ring-0 focus:border-[#B85A3A]"
            placeholder="One line is enough…"
          />
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish("skip")}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-[#8A7A72] hover:bg-white/80"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish("submit")}
            className="rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-bold tracking-wide text-white hover:bg-[#B85A3A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
