"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

const CATEGORIES = ["Price & risk", "Trust", "Knowledge", "Culture", "Discovery"] as const;
type Category = (typeof CATEGORIES)[number];

const PROBLEMS: {
  category: Exclude<Category, "All problems">;
  problem: { label: string; headline: string; body: string };
  fix: { headline: string; body: string };
}[] = [
  {
    category: "Price & risk",
    problem: {
      label: "The money problem",
      headline: "The money problem",
      body: "A decent perfume starts at ₹2,000. Good ones ₹6,000–₹15,000. Niche bottles hit ₹40,000. One wrong purchase stings enough to put people off entirely.",
    },
    fix: {
      headline: "Try from ₹300. Buy the full bottle when you know.",
      body: "Real decants in 3ml, 5ml, 8ml, same juice, same formula. Spend ₹499/month to discover instead of ₹6,000 to guess.",
    },
  },
  {
    category: "Price & risk",
    problem: {
      label: "No entry point for the curious",
      headline: "No entry point for the curious",
      body: "There's no affordable, low-risk way to start. The first step is a ₹4,000 bottle or nothing. Hundreds of millions stay on the outside.",
    },
    fix: {
      headline: "₹499/month subscription, less than a dinner out",
      body: "A monthly 8ml sample builds your fragrance knowledge and wardrobe slowly, affordably, with zero commitment to a full bottle.",
    },
  },
  {
    category: "Trust",
    problem: {
      label: "Counterfeiting destroys trust",
      headline: "Counterfeiting destroys trust",
      body: "The grey market is enormous. People buy what they think is Sauvage and get a knock-off. They conclude \u201cperfumes are overhyped\u201d \u2014 when they never smelled the real thing.",
    },
    fix: {
      headline: "Every decant is poured from an authentic original bottle",
      body: "We source directly. No grey market, no imitations. Every sample includes the batch code of the original bottle so you can verify exactly what you're smelling. When you buy the full bottle later, the experience matches exactly.",
    },
  },
  {
    category: "Trust",
    problem: {
      label: "Information is noisy and paid",
      headline: "Information is noisy and paid",
      body: "YouTube reviews, Instagram reels, most of it is paid promotion. New buyers can't separate genuine from marketing, so they stay on the sidelines.",
    },
    fix: {
      headline: "Blind Buy Score: data, not marketing",
      body: "Every fragrance gets a score built from longevity, projection, skin chemistry variance, and real user feedback. Not ad spend. Not PR budgets.",
    },
  },
  {
    category: "Knowledge",
    problem: {
      label: "The blind buying experience",
      headline: "The blind buying experience",
      body: "30 seconds at a mall counter, 4 sprays on your wrist, a salesperson hovering. That experience has nothing to do with how it'll smell on your skin over 8 hours.",
    },
    fix: {
      headline: "8ml = 15–25 real wears before you decide",
      body: "First you get the top notes, then the heart opens up, and finally the base reveals the real depth. Morning, evening, long day, night out. Live with it long enough to know if it's actually you.",
    },
  },
  {
    category: "Knowledge",
    problem: {
      label: "Climate & sweat anxiety",
      headline: "Climate & sweat anxiety",
      body: "India is hot and humid. Many believe perfume doesn't work on them. It fades, reacts with sweat, smells different. A knowledge gap, not a real barrier.",
    },
    fix: {
      headline: "Education on skin chemistry, projection & longevity",
      body: "Recommendations account for climate, skin type, and fragrance family behaviour. The platform teaches you what works for you, not just what's popular.",
    },
  },
  {
    category: "Culture",
    problem: {
      label: "Deodorant culture is deeply embedded",
      headline: "Deodorant culture is deeply embedded",
      body: "For most of India, body odour management = deodorant. Functional, cheap, familiar. Perfume is seen as extra, a luxury on top of something you already have.",
    },
    fix: {
      headline: "Fragrance as identity, not luxury",
      body: "Discovery-first framing makes fragrance feel personal, not aspirational. You're not upgrading, you're expressing. That's a different conversation entirely.",
    },
  },
  {
    category: "Culture",
    problem: {
      label: "Social norms around scent",
      headline: "Social norms around scent",
      body: "In many Indian workplaces and homes, strong fragrance is seen as inappropriate, too much, attention-seeking. This suppresses casual daily wear where habit is built.",
    },
    fix: {
      headline: "Occasion-aware recommendations built in",
      body: "Office-appropriate, date-night, casual weekend. The platform recommends by context, not just by scent family. The right fragrance for every room.",
    },
  },
  {
    category: "Discovery",
    problem: {
      label: "No discovery infrastructure",
      headline: "No discovery infrastructure",
      body: "Nykaa and Amazon sell perfumes but offer zero guidance. No try-before-you-buy, no personalization, no education. The online shelf = the mall shelf.",
    },
    fix: {
      headline: "Quiz → Layering Lab → Gift Finder → Blind Buy Score",
      body: "Every tool is designed to narrow 120,000 fragrances to the handful that are right for you specifically. Discovery before the transaction, always.",
    },
  },
  {
    category: "Discovery",
    problem: {
      label: "Gifting doesn't equal using",
      headline: "Gifting doesn't equal using",
      body: "A huge share of perfume sales are gifts, bought by someone who doesn't wear it, for someone whose taste they don't know. The wrong bottle joins the shelf.",
    },
    fix: {
      headline: "Gift Finder removes the guesswork entirely",
      body: "A few questions about the recipient: personality, what they currently wear, occasion, and we recommend a sample set that actually fits them.",
    },
  },
];

export default function WaitlistProblemsAndFixes() {
  const [active, setActive] = useState<Category>("Price & risk");

  const filtered = PROBLEMS.filter((p) => p.category === active);

  return (
    <section
      id="problems-we-solve"
      className="border-t border-[#E0D8CC] bg-[#F4F0E8] py-16 md:py-24"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">

        {/* Header */}
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B85A3A]">Why scentRev exists</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-[#14120F] md:text-4xl">
            Every barrier to fragrance in India.<br />
            <span className="text-[#3A342E]">And what we do about it.</span>
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="mb-10 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active === cat
                  ? "border-[#14120F] bg-[#14120F] text-white"
                  : "border-[#D9D0C4] bg-white text-[#3A3530] hover:border-[#B85A3A]/50 hover:text-[#B85A3A]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Problem/fix pairs */}
        <div className="space-y-3">
          {filtered.map(({ problem, fix }) => (
            <div
              key={problem.label}
              className="grid gap-3 md:grid-cols-[1fr_auto_1fr]"
            >
              {/* Problem card */}
              <div className="rounded-2xl border border-[#E0D8CC] bg-white p-5 shadow-[0_2px_12px_rgba(20,18,15,0.05)]">
                <span className="mb-2 inline-block rounded-full bg-[#FFF0EC] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B85A3A]">
                  Problem
                </span>
                <p className="mb-2 text-sm font-semibold leading-snug text-[#14120F]">{problem.headline}</p>
                <p className="text-sm leading-relaxed text-[#3A342E]">{problem.body}</p>
              </div>

              {/* Arrow */}
              <div className="hidden items-center justify-center md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D0C4] bg-white shadow-sm">
                  <ArrowRight className="h-3.5 w-3.5 text-[#B85A3A]" aria-hidden />
                </div>
              </div>

              {/* Fix card */}
              <div className="rounded-2xl border border-[#C5D9C6] bg-white p-5 shadow-[0_2px_12px_rgba(20,18,15,0.05)]">
                <span className="mb-2 inline-block rounded-full bg-[#EEF4EE] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3D6B3E]">
                  scentRev fix
                </span>
                <p className="mb-2 text-sm font-semibold leading-snug text-[#14120F]">{fix.headline}</p>
                <p className="text-sm leading-relaxed text-[#3A342E]">{fix.body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
