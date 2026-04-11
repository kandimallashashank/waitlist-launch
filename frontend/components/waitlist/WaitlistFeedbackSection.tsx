"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getWaitlistEmailValidationError,
  WAITLIST_EMAIL_MAX_LENGTH,
} from "@/lib/waitlist/emailValidation";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "idea", label: "Feature idea" },
  { value: "bug", label: "Something broke" },
  { value: "other", label: "Other" },
] as const;

/**
 * Compact CTA on the landing page; opens a modal with the feedback form (POST ``/api/waitlist-feedback``).
 */
export default function WaitlistFeedbackSection(): JSX.Element {
  const dialogTitleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<string>("general");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Footer link ``#waitlist-feedback`` opens the modal after scroll. */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const checkHash = () => {
      if (window.location.hash === "#waitlist-feedback") {
        setOpen(true);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open || typeof window === "undefined") {
      return;
    }
    if (window.location.hash === "#waitlist-feedback") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp.trim() !== "") {
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error("Please add a bit more detail.");
      return;
    }
    if (email.trim()) {
      const err = getWaitlistEmailValidationError(email);
      if (err) {
        toast.error(err);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmed,
          email: email.trim() || undefined,
          page_url: typeof window !== "undefined" ? window.location.pathname : undefined,
          website: hp,
          source: "waitlist_landing",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        toast.error(data.detail ?? "Could not send feedback.");
        return;
      }
      toast.success("Thanks — we read every note.");
      setMessage("");
      setEmail("");
      setCategory("general");
      setOpen(false);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal =
    open &&
    mounted &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-[#1A1A1A]/55 p-4 pb-8 backdrop-blur-md sm:items-center sm:pb-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) {
            setOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1A1A1A] shadow-md transition hover:bg-white sm:right-6 sm:top-6"
          onClick={() => setOpen(false)}
          aria-label="Close feedback form"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className="relative max-h-[min(85vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E8D4C4] bg-[#FAF7F4] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B85A3A]/12 text-[#B85A3A]">
              <MessageSquarePlus className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <h2
                id={dialogTitleId}
                className="font-display text-lg font-bold tracking-tight text-[#14120F] sm:text-xl"
              >
                Tell us what you think
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#3A342E] sm:text-sm">
                Pilot feedback helps us fix rough edges and prioritize what to build next.
              </p>
            </div>
          </div>

          <form onSubmit={(ev) => void onSubmit(ev)} className="mt-5 space-y-4">
            <input
              type="text"
              name="website"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
              aria-hidden
            />

            <div>
              <label
                htmlFor="waitlist-feedback-category"
                className="mb-1.5 block text-xs font-semibold text-[#3D3A36]"
              >
                Topic
              </label>
              <select
                id="waitlist-feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E8D4C4] bg-white px-3 py-2.5 text-sm text-[#14120F] shadow-sm focus:border-[#B85A3A] focus:outline-none focus:ring-2 focus:ring-[#B85A3A]/25"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="waitlist-feedback-email"
                className="mb-1.5 block text-xs font-semibold text-[#3D3A36]"
              >
                Email{" "}
                <span className="font-normal text-[#8A8580]">(optional — if you want a reply)</span>
              </label>
              <input
                id="waitlist-feedback-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={WAITLIST_EMAIL_MAX_LENGTH}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E8D4C4] bg-white px-3 py-2.5 text-sm text-[#14120F] shadow-sm placeholder:text-[#A8A29E] focus:border-[#B85A3A] focus:outline-none focus:ring-2 focus:ring-[#B85A3A]/25"
              />
            </div>

            <div>
              <label
                htmlFor="waitlist-feedback-message"
                className="mb-1.5 block text-xs font-semibold text-[#3D3A36]"
              >
                Your feedback
              </label>
              <textarea
                id="waitlist-feedback-message"
                required
                rows={4}
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What worked, what didn’t, what you wish we had…"
                className="w-full resize-y rounded-xl border border-[#E8D4C4] bg-white px-3 py-2.5 text-sm text-[#14120F] shadow-sm placeholder:text-[#A8A29E] focus:border-[#B85A3A] focus:outline-none focus:ring-2 focus:ring-[#B85A3A]/25"
              />
              <p className="mt-1 text-right text-[10px] text-[#9A9590]">{message.length} / 5000</p>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#E8D4C4] bg-white text-[#14120F] hover:bg-[#F5F0EB]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#B85A3A] px-6 text-sm font-semibold text-white shadow-md hover:bg-[#A04D2F] disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </form>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <section
        id="waitlist-feedback"
        className="border-t border-[#E0D8CC] bg-[#FAF7F4] py-8 sm:py-10"
        aria-label="Feedback"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-5 text-center sm:px-6">
          <p className="max-w-md text-sm text-[#3A342E]">
            Spotted a bug or have an idea? We read every message.
          </p>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#B85A3A]/35 bg-white px-5 py-2.5 text-sm font-semibold text-[#B85A3A] shadow-sm transition hover:bg-[#B85A3A]/10 hover:border-[#B85A3A]/50"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Give us feedback
          </Button>
        </div>
      </section>
      {modal}
    </>
  );
}
