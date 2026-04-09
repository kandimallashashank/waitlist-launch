"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, FlaskConical, Star, Database } from "lucide-react";

const FEATURES = [
  {
    n: "01",
    icon: Sparkles,
    tag: "Scent Quiz",
    headline: "Your ex forgot your preferences.\nWe never will.",
    body: "90 seconds. Tell us how you live, what you wear, where you go. We map your answers against 120,000 perfumes and surface what actually belongs on your skin. No influencer. No guesswork.",
    href: "/quiz",
    cta: "Take the quiz",
  },
  {
    n: "02",
    icon: FlaskConical,
    tag: "Layering Lab",
    headline: "One scent is a vibe.\nTwo is a whole personality.",
    body: "Pick two or three fragrances. We score accord harmony, concentration balance, how the blend evolves through dry-down, personalised to your quiz profile. Try combinations before you buy a single bottle.",
    href: "/layering-lab",
    cta: "Open Layering Lab",
  },
  {
    n: "03",
    icon: Star,
    tag: "Blind Buy Score",
    headline: "Hours of Reddit, Facebook, YouTube research.\nCondensed into one number.",
    body: "On this pilot, blind buy scores are testing placeholders. At launch we aggregate what real people say across Reddit, Facebook, and the open web, fuse it with perfume metrics, and surface a 0–5 score tuned for Indian weather.",
    href: "/catalog",
    cta: "See scores",
  },
  {
    n: "04",
    icon: Database,
    tag: "Perfume Data",
    headline: "The brand says it lasts 12 hours.\nYour skin says otherwise.",
    body: "Sillage, longevity, gender lean, season fit, occasion fit, note pyramid, accord breakdown, climate performance. Real data from 120k+ perfumes, built for Indian weather and Indian buyers. Not a copy-paste from the brand.",
    href: "/catalog",
    cta: "Browse catalog",
  },
] as const;

export default function WaitlistWhatWeOffer(): React.ReactElement {
  return (
    <section
      id="what-we-provide"
      className="border-t border-[#E0D8CC] bg-[#F4F0E8] py-16 md:py-24"
    >
      <div className="mx-auto max-w-5xl px-6">

        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B85A3A]">What ScentRev does</p>
          <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-[#14120F] md:text-4xl">
            Perfume buying in India is broken.<br />
            <span className="text-[#B85A3A]">We fixed it.</span>
          </h2>
          
        </div>

        {/* Feature grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map(({ n, icon: Icon, tag, headline, body, href, cta }) => (
            <Link
              key={n}
              href={href}
              className="group relative flex flex-col rounded-2xl border border-[#E0D8CC] bg-white p-7 transition-all duration-200 hover:border-[#B85A3A]/40 hover:shadow-[0_8px_32px_rgba(26,26,26,0.08)]"
            >
              {/* Top row */}
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF6F3] border border-[#F0D8CC]">
                  <Icon className="h-5 w-5 text-[#B85A3A]" aria-hidden />
                </div>
                <span className="font-mono text-xs text-[#B85A3A]/50">{n}</span>
              </div>

              {/* Tag */}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#B85A3A]">{tag}</p>

              {/* Headline */}
              <h3 className="font-display text-lg font-semibold leading-snug text-[#14120F] mb-3 whitespace-pre-line">
                {headline}
              </h3>

              {/* Body */}
              <p className="flex-1 text-sm leading-relaxed text-[#3A3530]">{body}</p>

              {/* CTA */}
              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#B85A3A]">
                <span className="group-hover:underline underline-offset-2">{cta}</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Subscription strip */}
        <Link
          href="/subscribe"
          className="group mt-4 flex flex-col gap-4 rounded-2xl border border-[#E0D8CC] bg-white p-7 transition-all duration-200 hover:border-[#B85A3A]/40 hover:shadow-[0_8px_32px_rgba(26,26,26,0.08)] md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B85A3A] mb-2">Scent Box · Monthly</p>
            <h3 className="font-display text-lg font-semibold text-[#14120F] mb-1.5">
              Keep discovering. One new 8ml every month.
            </h3>
            <p className="text-sm leading-relaxed text-[#3A3530] max-w-lg">
              Pick a tier, choose your fragrance each month. Or let your quiz profile choose for you.
              Cancel anytime.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2.5 md:items-end">
            <div className="flex flex-wrap gap-2">
              {(["Essential", "Signature", "Prestige"] as const).map((tier) => (
                <span key={tier} className="rounded-full border border-[#E0D8CC] bg-[#F4F0E8] px-3 py-1 text-xs font-semibold text-[#3D3A36]">
                  {tier}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B85A3A]">
              <span className="group-hover:underline underline-offset-2">See plans</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </div>
        </Link>

      </div>
    </section>
  );
}
