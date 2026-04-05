"use client";

import React from "react";

/**
 * Waitlist: pillar cards (quiz, Layering Lab, micro-samples) plus Club subscription (Essential /
 * Signature / Prestige). Blind Buy Score lives in `WaitlistBlindBuyPipeline` on the same page.
 *
 * Returns:
 *   Section with pillar copy and subscription summary (no outbound store links).
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
            After you start with micro-samples, these{" "}
            <span className="font-medium text-[#B85A3A]">MVP</span> pillars keep picks honest: quiz fit,
            AI- and machine-learning-ranked layering combos you can judge on real metrics, honest try
            sizes before a full bottle, and an optional monthly{" "}
            <span className="font-medium text-[#4A4540]">Club</span> so you can keep discovering without
            full-bottle spend.
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
          </article>

          <article className="flex flex-col rounded-2xl border border-[#E8E0D8] bg-white p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(26,26,26,0.09)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B85A3A]">
              Layering Lab
            </p>
            <h3 className="font-display mt-3 text-xl leading-snug text-[#1A1A1A] md:text-2xl">
              One scent is a voice.
              <br />
              Two is a signature.
            </h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5F5C57]">
              <span className="font-medium text-[#4A4540]">Layering Lab</span> uses AI and machine
              learning on large, real-world signals (not hand-wavy taste tests) to surface which pairs tend
              to work best together. You get rich metrics and transparency so you can compare combos and
              decide what deserves a wear on your own skin.
            </p>
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
              dry-down, sleep, and sunlight. Only then do you know. We send you the truth in{' '}
              <span className="font-medium text-[#4A4540]">2ml</span> so the answer lives on your skin.
              You commit when your skin says yes.
            </p>
          </article>
        </div>

        <article className="mt-10 rounded-2xl border border-[#E8E0D8] bg-gradient-to-br from-[#FAF7F2] via-white to-[#FBF8F5] p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] md:mt-12 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#B85A3A]">
            Club · monthly subscription
          </p>
          <h3 className="font-display mt-3 text-xl leading-snug text-[#1A1A1A] md:text-2xl">
            Essential, Signature, or Prestige.
            <br />
            One new 8ml every month.
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-[#5F5C57] md:text-[0.9375rem]">
            Choose a tier, then each month you either{" "}
            <span className="font-medium text-[#4A4540]">pick the 8ml yourself</span> or, when you enable{" "}
            <span className="font-medium text-[#4A4540]">auto-select</span>, we choose for you from the
            preferences you gave in the quiz. You keep smelling something different every month and build
            a real collection at a fraction of full-bottle cost.
          </p>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Subscription plan tiers">
            {(['Essential', 'Signature', 'Prestige'] as const).map((tier) => (
              <span
                key={tier}
                className="rounded-full border border-[#E0D8CC] bg-white/95 px-3.5 py-1.5 text-xs font-semibold tracking-tight text-[#3D3A36] shadow-sm"
              >
                {tier}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
