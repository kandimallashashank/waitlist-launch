"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, FlaskConical, Star, Database } from "lucide-react";

const FEATURES = [
  {
    n: "01",
    icon: Sparkles,
    tag: "Scent Quiz",
    headline: "New to this?\nWe've got you.",
    body: "Answer 11 quick questions about where you go and how you like to smell. Takes under 3 minutes. We'll show you perfumes that actually fit your life. No expertise needed.",
    href: "/quiz",
    cta: "Take the quiz",
  },
  {
    n: "02",
    icon: FlaskConical,
    tag: "Layering Lab",
    headline: "One scent is good.\nTwo can be something else entirely.",
    body: "Pick two perfumes and see how they work together before buying. We'll tell you if they're a great pair or if one will overpower the other. Love the combo? Add it to your cart as a set.",
    href: "/layering-lab",
    cta: "Open Layering Lab",
  },
  {
    n: "03",
    icon: Star,
    tag: "Blind Buy Score",
    headline: "Scared to buy without smelling it?\nWe did the research for you.",
    body: "Every perfume gets a score from 0 to 5. Higher means safer to buy without smelling first. We pull from thousands of real reviews so you don't have to spend two hours on Reddit. (Scores are test placeholders on this pilot, real ones come at launch.)",
    href: "/catalog",
    cta: "See scores",
  },
  {
    n: "04",
    icon: Database,
    tag: "Perfume Data",
    headline: "The brand says it lasts 12 hours.\nYour skin says otherwise.",
    body: "We track real longevity, how far the scent travels, whether it works in summer or winter, and how it holds up in Indian heat. What real wearers say, not what the brand claims.",
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
            Try first.<br />
            <span className="text-[#B85A3A]">Buy only what you love.</span>
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
              {/* Icon */}
              <div className="mb-4">
                <Icon className="h-6 w-6 text-[#B85A3A]" aria-hidden />
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
              Pick a tier. Get a new 8ml sample every month. Your quiz picks it, or you do. Cancel whenever.
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
