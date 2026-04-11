import Link from "next/link";
import { Building2, Package, Palette, Sparkles, Users } from "lucide-react";

import {
  CorporateProgramInquiryProvider,
  CorporateProgramInquiryTrigger,
} from "@/components/corporate/CorporateProgramInquiry";

const OFFERINGS = [
  {
    icon: Palette,
    title: "Custom curation",
    body: "We align picks with your occasion - Diwali, year-end thanks, client milestones, or team rewards - so boxes feel intentional, not generic.",
  },
  {
    icon: Package,
    title: "Formats that scale",
    body: "Micro decants, discovery sets, and tiered bundles sized for interns to leadership. Volume-friendly for all-hands or segmented cohorts.",
  },
  {
    icon: Sparkles,
    title: "Brand-forward delivery",
    body: "Co-branded inserts, message cards, and packaging notes - we work with your brand guidelines so the unboxing matches your company story.",
  },
  {
    icon: Users,
    title: "Dedicated coordination",
    body: "One point of contact for timelines, shipping across India, and last-mile tweaks. Built for procurement and people teams, not one-off retail checkout.",
  },
] as const;

/**
 * Corporate gifting landing: customized B2B fragrance programs (waitlist pilot).
 */
export default function CorporateGiftingPage() {
  return (
    <CorporateProgramInquiryProvider>
    <main className="min-h-screen bg-[#F4F0E8] text-[#14120F]">
      <section className="bg-[#14120F] px-5 py-16 text-center sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D4A574]">
            For teams &amp; clients
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Customized corporate gifting
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">
            ScentRev offers tailored fragrance gifting for Indian companies - thoughtful decants and
            discovery experiences your recipients will actually use, with room for your brand and
            your message.
          </p>
          <CorporateProgramInquiryTrigger variant="hero" />
        </div>
      </section>

      <section className="px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 flex items-start gap-4 rounded-2xl border border-[#E0D8CC] bg-white/90 p-6 sm:p-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FDF6F3]">
              <Building2 className="h-6 w-6 text-[#B85A3A]" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#14120F] sm:text-xl">
                Why fragrance works for corporate gifting
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#3A3530]">
                Unlike swag that sits in a drawer, scent is personal yet shareable in conversation.
                We keep programs approachable - fresh, easy-wearing profiles for mixed audiences - and
                can steer bolder only when your brief calls for it.
              </p>
            </div>
          </div>

          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">
            What we customize
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {OFFERINGS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-[#E0D8CC] bg-white/80 p-6 transition-shadow hover:shadow-[0_8px_28px_rgba(26,26,26,0.06)]"
              >
                <Icon className="h-5 w-5 text-[#B85A3A]" aria-hidden />
                <h3 className="mt-3 font-display text-base font-semibold text-[#14120F]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3A3530]">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[#E0D8CC] px-5 py-12 text-center sm:px-6">
        <h2 className="font-display text-xl font-semibold text-[#14120F]">Pilot &amp; launch programs</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[#5F5C57]">
          We&apos;re onboarding select corporate partners alongside our waitlist. Share headcount,
          occasion, and budget band - we&apos;ll reply with a tailored outline.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <CorporateProgramInquiryTrigger variant="inline">
            Talk to us about your program
          </CorporateProgramInquiryTrigger>
          <a
            href="mailto:support@scentrev.com?subject=Corporate%20gifting%20inquiry"
            className="text-sm font-medium text-[#B85A3A] underline-offset-2 hover:underline"
          >
            Or email support@scentrev.com
          </a>
          <Link
            href="/#waitlist-form"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E0D8CC] bg-white px-7 text-sm font-semibold text-[#14120F] transition-colors hover:border-[#B85A3A]/40"
          >
            Join the waitlist
          </Link>
        </div>
      </section>
    </main>
    </CorporateProgramInquiryProvider>
  );
}
