'use client';

import React from 'react';
import Image from 'next/image';

const EXPLORE = [
  {
    label: 'Scent Quiz',
    image: '/images/home/precision-decoding.png',
  },
  {
    label: 'Subscribe',
    image: '/images/home/monday-standup.png',
  },
  {
    label: 'Catalog',
    image: '/images/home/data-led-performance.png',
  },
  {
    label: 'Layering Lab',
    image: '/images/home/party-performance.png',
  },
] as const;

/**
 * Discovery tiles for the home page: quiz, subscribe, catalog, layering lab.
 * Image-only cards (no overlay copy); destination is exposed via ``aria-label``.
 */
export default function HomeExploreShowcase() {
  return (
    <section
      aria-labelledby="explore-scentrev-heading"
      className="border-t border-[#E0D8CC] bg-[#EDE8E0]/60 py-12 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mb-8 text-center md:mb-10">
          <h2
            id="explore-scentrev-heading"
            className="font-display text-2xl font-semibold tracking-tight text-[#14120F] sm:text-3xl"
          >
            Your nose deserves options.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#5F5C57]">
            Quiz, subscribe, browse, or blend. Pick your path into the world of fragrance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-[#D9D0C4] bg-[#1a1512] shadow-[0_8px_28px_-12px_rgba(20,18,15,0.18)]"
            >
              <div className="relative aspect-[9/14] w-full">
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
