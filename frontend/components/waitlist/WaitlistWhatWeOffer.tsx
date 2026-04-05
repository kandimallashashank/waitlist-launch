"use client";

import React from "react";
import Link from "next/link";

import { storeUrl } from "@/lib/storeUrl";

/**
 * Waitlist: three MVP pillar cards (quiz, layering, micro-samples).
 * Blind Buy Score story lives in `WaitlistBlindBuyPipeline` on the same page.
 *
 * Returns:
 *   Section with pillar CTAs.
 */
export default function WaitlistWhatWeOffer(): React.ReactElement {
  return (
    <section
      id="what-we-provide"
      className="relative bg-gradient-to-b from-white via-[#FBF8F5] to-white py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#B85A3A]">
            What makes us different
          </span>
          <h2 className="font-display mt-3 text-3xl text-[#1A1A1A] md:text-4xl">
            Discovery, layering, and a monthly rhythm
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#6B645C] md:text-base">
            After you start with micro-samples, these three{" "}
            <span className="font-medium text-[#B85A3A]">MVP</span> pillars keep picks honest: quiz fit,
            combo architecture, and trying scents at your pace before you commit to a full bottle.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <article className="flex flex-col rounded-2xl border border-[#E8E0D8] bg-white p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(26,26,26,0.09)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B85A3A]">
              For the quiz
            </p>
            <h3 className="font-display mt-3 text-xl leading-snug text-[#1A1A1A] md:text-2xl">
              Your ex forgot your preferences.
              <br />
              We never will.
            </h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5F5C57]">
              The internet has opinions. Your skin has answers. Tell us how you live, and we match you to
              a fragrance that belongs on you, not just on a shelf. No influencer. No guesswork. Just
              data from people who actually wear it.
            </p>
            <Link
              href={storeUrl("/quiz")}
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
            >
              Take the quiz <span aria-hidden>↗</span>
            </Link>
          </article>

          <article className="flex flex-col rounded-2xl border border-[#E8E0D8] bg-white p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(26,26,26,0.09)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B85A3A]">
              For layering combos
            </p>
            <h3 className="font-display mt-3 text-xl leading-snug text-[#1A1A1A] md:text-2xl">
              One scent is a voice.
              <br />
              Two is a signature.
            </h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5F5C57]">
              Layering is not an accident; it is architecture. We pair fragrances the way they were
              meant to meet: base with base, skin with season, mood with moment. Every combo here has
              been worn, tested, and verified on real skin, not imagined in a lab.
            </p>
            <Link
              href={storeUrl("/layering-lab")}
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
            >
              Explore combos <span aria-hidden>↗</span>
            </Link>
          </article>

          <article className="flex flex-col rounded-2xl border border-[#E8E0D8] bg-white p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(26,26,26,0.09)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B85A3A]">
              How it works: microsamples
            </p>
            <h3 className="font-display mt-3 text-xl leading-snug text-[#1A1A1A] md:text-2xl">
              A ₹200 decision beats
              <br />a ₹12,000 regret.
            </h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5F5C57]">
              A bottle is a commitment. Your skin is the final judge, not the bottle, not the review,
              not the person who called it &quot;nice.&quot; Wear it for two days. Let it move through
              dry-down, sleep, and sunlight. Only then do you know. We send you the truth in 2ml. You
              commit when your skin says yes.
            </p>
            <Link
              href={storeUrl("/#how-it-works")}
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
            >
              See how it works <span aria-hidden>↗</span>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
