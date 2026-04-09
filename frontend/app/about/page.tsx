'use client';

import React from 'react';
import Link from 'next/link';
import { Linkedin, Mail } from 'lucide-react';

const founders = [
  {
    name: 'Shashank Kandimalla',
    role: 'Founder & CEO',
    bio: 'Perfume collector and data scientist. Started mixing data with perfume in Feb 2026 to make discovery personal for everyone.',
    linkedin: 'https://www.linkedin.com/in/shashankkandimalla/',
    email: 'shashank@scentrev.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SK&backgroundColor=B85A3A&fontFamily=Arial&fontSize=40&fontWeight=700&textColor=ffffff',
  },
  {
    name: 'Soumith Matta',
    role: 'Co-founder',
    bio: 'Building ScentRev.',
    linkedin: 'https://linkedin.com',
    email: 'soumith@scentrev.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SO&backgroundColor=6D7D63&fontFamily=Arial&fontSize=40&fontWeight=700&textColor=ffffff',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#14120F]">

      {/* Hero */}
      <section className="bg-[#14120F] px-5 py-16 sm:px-6 text-center">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D4A574]">Our Story</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Built by collectors who got tired of guessing.
          </h1>
        </div>
      </section>

      {/* Problem + Solution */}
      <section className="px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl grid gap-5 sm:grid-cols-2">

          <div className="rounded-2xl border border-[#E0D8CC] bg-white/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A] mb-4">The Problem</p>
            <div className="space-y-3 text-sm text-[#3A3530] leading-relaxed">
              <p>I started collecting perfumes and the number of bottles kept increasing. But I couldn&apos;t afford to buy a full bottle every month, so I switched to decants.</p>
              <p>But even picking a decant took 7 to 8 days of research. YouTube, Reddit, fragrance forums. And after all that, I still was not sure if it would work for me. There was no personalised source, no data, just guessing.</p>
              <p>I believe in layering. It creates a scent that is entirely yours. But there was no way to know which combinations would actually work without just trying them.</p>
            </div>
            <p className="mt-4 text-xs text-[#8A8279]">Shashank Kandimalla, Founder</p>
          </div>

          <div className="rounded-2xl border border-[#D4A574]/40 bg-[#FDF6F3] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A] mb-4">How We Solve It</p>
            <div className="space-y-3 text-sm text-[#3A3530] leading-relaxed">
              <p>We built a quiz that maps your preferences against 120K+ perfumes and finds what actually fits you, not just what is trending.</p>
              <p>The Layering Lab lets you try combinations before committing to anything.</p>
              <p>The Blind Buy Score tells you how likely a perfume is to work for you, so you stop spending hours researching and start wearing.</p>
            </div>
          </div>

        </div>

      </section>

      {/* Founders */}
      <section className="border-t border-[#E0D8CC] px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B85A3A] text-center mb-8">The Team</p>
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
                  <p className="text-xs text-[#6B645C]">{f.role}</p>
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

      {/* CTA */}
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
