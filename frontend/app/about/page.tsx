'use client';

import React from 'react';
import Link from 'next/link';
import { Linkedin, Mail } from 'lucide-react';

const founders = [
  {
    name: 'Shashank Kandimalla',
    bio: 'Perfume collector and data scientist. Building data-backed discovery so people spend less time researching and more time wearing what fits.',
    linkedin: 'https://www.linkedin.com/in/shashankkandimalla/',
    email: 'shashank@scentrev.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SK&backgroundColor=B85A3A&fontFamily=Arial&fontSize=40&fontWeight=700&textColor=ffffff',
  },
  {
    name: 'Soumith Matta',
    bio: 'Building ScentRev.',
    linkedin: 'https://linkedin.com',
    email: 'soumith@scentrev.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SO&backgroundColor=6D7D63&fontFamily=Arial&fontSize=40&fontWeight=700&textColor=ffffff',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#14120F]">
      <section className="bg-[#14120F] px-5 py-14 sm:px-6 text-center">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D4A574]">Our story</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Most people never find a perfume that truly fits.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            Not because they don&apos;t care how they smell. Because good fragrance is expensive to get wrong, and the internet is noise, ads, and guesswork.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 py-12 sm:px-6">
        <div className="space-y-4 text-sm leading-relaxed text-[#3A3530]">
          <p>
            Across India, many people never move past everyday deodorant because the next step feels risky and unclear. The market is full of noise: promoted picks, sponsored content, and the same few names on repeat, so real discovery gets drowned out. Those who do buy fragrance often still decide blind: a hurried moment at a counter, then a bottle that sits unused. Even collectors use a fraction of what they own. That waste isn&apos;t a personal failure. It&apos;s what happens when discovery is broken for everyone.
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B85A3A] pt-1">Why we started</p>
          <p>
            We started ScentRev because we lived that friction ourselves: loving fragrance but still guessing after hours of research, and wanting layering to work without trial-and-error on expensive bottles. We mix perfume obsession with data and product craft because we think India deserves one honest place to try real juice, get guidance that fits how people actually live here, and buy a full bottle only when it is truly right.
          </p>
          <p>
            <span className="font-semibold text-[#14120F]">What we&apos;re building</span> is the fix: real perfume in small vials so you can try before you commit, plus tools that cut through the noise (recommendations tuned to you, a Blind Buy Score, layering experiments, and a gift flow that doesn&apos;t guess wrong).
          </p>
          <p className="text-xs text-[#8A8279]">scentRev, Hyderabad, India</p>
        </div>
      </section>

      <section className="border-t border-[#E0D8CC] px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A] text-center mb-8">The team</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {founders.map((f) => (
              <div key={f.name} className="flex items-start gap-4 rounded-2xl border border-[#E0D8CC] bg-white/80 p-5">
                <img
                  src={f.avatar}
                  alt={f.name}
                  className="h-14 w-14 rounded-full shrink-0 object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#14120F]">{f.name}</p>
                  <p className="mt-1.5 text-xs text-[#5F5C57] leading-relaxed">{f.bio}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B85A3A] hover:text-[#A04D2F] transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                    <a
                      href={`mailto:${f.email}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B85A3A] hover:text-[#A04D2F] transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {f.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#E0D8CC] px-5 py-12 sm:px-6 text-center">
        <h2 className="font-display text-xl font-semibold text-[#14120F]">Find your personalised scent.</h2>
        <p className="mt-2 text-sm text-[#5F5C57]">Join the waitlist and your launch discount is waiting.</p>
        <Link
          href="/#waitlist-form"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#B85A3A] px-7 text-sm font-semibold text-white shadow-lg shadow-[#B85A3A]/20 transition-colors hover:bg-[#A04D2F]"
        >
          Join the waitlist
        </Link>
      </section>
    </main>
  );
}
