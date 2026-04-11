"use client";

/**
 * Corporate gifting lead form: modal + triggers. Submits to /api/corporate-program-inquiry → Supabase.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Mail } from "lucide-react";

import { cn } from "@/lib/utils";

interface InquiryContextValue {
  open: () => void;
}

const InquiryContext = createContext<InquiryContextValue | null>(null);

function useInquiry(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) {
    throw new Error("Use CorporateProgramInquiryTrigger inside CorporateProgramInquiryProvider");
  }
  return ctx;
}

const HEADCOUNT_OPTIONS = [
  { value: "under_25", label: "Under 25 people" },
  { value: "25_100", label: "25–100" },
  { value: "100_500", label: "100–500" },
  { value: "500_plus", label: "500+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

const OCCASION_OPTIONS = [
  { value: "diwali_festive", label: "Diwali / festive" },
  { value: "year_end_thanks", label: "Year-end / thanks" },
  { value: "client_partner", label: "Client or partner gifts" },
  { value: "team_rewards", label: "Team rewards / milestones" },
  { value: "other", label: "Other / exploring" },
] as const;

const BUDGET_OPTIONS = [
  { value: "exploring", label: "Still exploring" },
  { value: "under_2l", label: "Under ₹2 lakh" },
  { value: "2l_10l", label: "₹2 lakh – ₹10 lakh" },
  { value: "10l_plus", label: "₹10 lakh+" },
] as const;

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E0D8CC] bg-white px-3 py-2.5 text-sm text-[#14120F] placeholder:text-[#9A9590] outline-none transition-colors focus:border-[#B85A3A]/60 focus:ring-2 focus:ring-[#B85A3A]/20";

const labelClass = "block text-xs font-semibold uppercase tracking-wide text-[#5F5C57]";

function CorporateProgramInquiryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setError(null);
    setDone(false);
    onClose();
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_name: fd.get("company_name"),
      contact_name: fd.get("contact_name"),
      contact_email: fd.get("contact_email"),
      phone: fd.get("phone"),
      headcount_band: fd.get("headcount_band"),
      occasion: fd.get("occasion"),
      budget_band: fd.get("budget_band"),
      message: fd.get("message"),
      website: fd.get("website"),
    };
    try {
      const res = await fetch("/api/corporate-program-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Could not send. Try again.");
        return;
      }
      setDone(true);
      e.currentTarget.reset();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,26rem)] max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border border-[#E0D8CC] bg-[#FDFCFA] p-0 text-[#14120F] shadow-2xl backdrop:bg-black/50"
      onClose={handleClose}
      onCancel={(ev) => {
        ev.preventDefault();
        handleClose();
      }}
    >
      <div className="border-b border-[#E0D8CC] px-5 py-4">
        <h2 id={`${formId}-title`} className="font-display text-lg font-semibold">
          Talk to us about your program
        </h2>
        <p className="mt-1 text-sm text-[#5F5C57]">
          Tell us about your team and occasion, and we&apos;ll follow up by email.
        </p>
      </div>

      {done ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium text-[#14120F]">Thanks, we received your details.</p>
          <p className="mt-2 text-sm text-[#5F5C57]">
            We&apos;ll reply at the work email you shared.
          </p>
          <button
            type="button"
            className="mt-6 h-10 w-full rounded-xl bg-[#B85A3A] text-sm font-semibold text-white hover:bg-[#A04D2F]"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      ) : (
        <form className="space-y-4 px-5 py-5" onSubmit={onSubmit} aria-labelledby={`${formId}-title`}>
          {/* Honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

          <div>
            <label className={labelClass} htmlFor={`${formId}-company`}>
              Company <span className="text-[#B85A3A]">*</span>
            </label>
            <input
              id={`${formId}-company`}
              name="company_name"
              required
              maxLength={200}
              className={inputClass}
              placeholder="Company or brand name"
              autoComplete="organization"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-name`}>
              Your name
            </label>
            <input
              id={`${formId}-name`}
              name="contact_name"
              maxLength={120}
              className={inputClass}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-email`}>
              Work email <span className="text-[#B85A3A]">*</span>
            </label>
            <input
              id={`${formId}-email`}
              name="contact_email"
              type="email"
              required
              maxLength={254}
              className={inputClass}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-phone`}>
              Phone (optional)
            </label>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              maxLength={32}
              className={inputClass}
              placeholder="+91 …"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-headcount`}>
              Approx. recipients <span className="text-[#B85A3A]">*</span>
            </label>
            <select
              id={`${formId}-headcount`}
              name="headcount_band"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {HEADCOUNT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-occasion`}>
              Occasion <span className="text-[#B85A3A]">*</span>
            </label>
            <select
              id={`${formId}-occasion`}
              name="occasion"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {OCCASION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-budget`}>
              Budget band <span className="text-[#B85A3A]">*</span>
            </label>
            <select
              id={`${formId}-budget`}
              name="budget_band"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor={`${formId}-message`}>
              Anything else?
            </label>
            <textarea
              id={`${formId}-message`}
              name="message"
              rows={3}
              maxLength={4000}
              className={cn(inputClass, "resize-y min-h-[5rem]")}
              placeholder="Timeline, cities, branding needs…"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="h-10 rounded-xl border border-[#E0D8CC] bg-white px-4 text-sm font-semibold text-[#14120F] hover:bg-[#F4F0E8]"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#B85A3A] px-5 text-sm font-semibold text-white hover:bg-[#A04D2F] disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

/**
 * Wraps the corporate page (or section) so triggers can open the shared modal.
 */
export function CorporateProgramInquiryProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <InquiryContext.Provider value={{ open: openModal }}>
      <CorporateProgramInquiryModal open={open} onClose={closeModal} />
      {children}
    </InquiryContext.Provider>
  );
}

type TriggerVariant = "hero" | "inline";

/**
 * Opens the corporate inquiry modal. Use inside {@link CorporateProgramInquiryProvider}.
 */
export function CorporateProgramInquiryTrigger({
  variant = "hero",
  className,
  children,
}: {
  variant?: TriggerVariant;
  className?: string;
  children?: React.ReactNode;
}) {
  const { open } = useInquiry();
  const isHero = variant === "hero";
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        isHero
          ? "mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B85A3A] px-7 text-sm font-semibold text-white shadow-lg shadow-[#B85A3A]/25 transition-colors hover:bg-[#A04D2F]"
          : "inline-flex h-11 items-center justify-center rounded-xl bg-[#B85A3A] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#A04D2F]",
        className,
      )}
    >
      {isHero ? <Mail className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children ?? "Talk to us about your program"}
    </button>
  );
}
