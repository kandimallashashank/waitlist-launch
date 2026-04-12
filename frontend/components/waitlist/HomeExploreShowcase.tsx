'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useHydrationSafeReducedMotion } from '@/hooks/useHydrationSafeReducedMotion';

/** Filenames contain spaces; encode so static `/public` URLs resolve in production. */
const POMELLI_PHOTOSHOOT_0409 =
  '/images/home/pomelli_photoshoot_image_9_16_0409%20(1).png';
const POMELLI_CREATIVE_0409 =
  '/images/home/pomelli_creative_image_9_16_0409%20(2).png';

const EXPLORE = [
  {
    title: 'Master the Monday stand-up.',
    image: '/images/home/monday-standup.png',
    href: '/catalog',
    ariaLabel: 'Browse catalog for a professional office scent',
  },
  {
    title: 'Precision Scent Decoding',
    image: '/images/home/precision-decoding.png',
    href: '/quiz',
    ariaLabel: 'Take the scent quiz for a precision scent match',
  },
  {
    title: 'The ultimate party performance.',
    image: '/images/home/party-performance.png',
    href: '/layering-lab',
    ariaLabel: 'Open Layering Lab to build party-ready blends',
  },
  {
    title: 'Data-Led Performance',
    image: '/images/home/data-led-performance.png',
    href: '/subscribe',
    ariaLabel: 'Subscribe for data-led fragrance picks for India',
  },
  {
    title: 'Gifts that land the first time.',
    image: '/images/home/first-impression.png',
    href: '/gift',
    ariaLabel: 'Open the gift finder for presents that fit them',
  },
  {
    title: 'Warm light, real life.',
    image: '/images/home/lifestyle-copper.png',
    href: '/about',
    ariaLabel: 'Read our story on the About page',
  },
  {
    title: 'ScentRev bottle, natural light.',
    image: POMELLI_PHOTOSHOOT_0409,
    href: '/catalog',
    ariaLabel: 'Browse the catalog - ScentRev bottle lifestyle',
  },
  {
    title: 'Test for weeks, not seconds.',
    image: POMELLI_CREATIVE_0409,
    href: '/#waitlist-form',
    ariaLabel: 'Join the waitlist to try curated samples and experience the dry-down',
  },
] as const;

/** Fixed card width so duplicated marquee halves match for translate3d(-50%) loop. */
const MARQUEE_CARD_CLASS =
  'w-[min(42vw,200px)] shrink-0 sm:w-[min(32vw,220px)] md:w-[min(20vw,200px)]';

/**
 * Infinite horizontal marquee of home explore images (same CSS pattern as catalog
 * marquee: duplicated row + ``waitlist-marquee-track`` in globals.css).
 */
export default function HomeExploreShowcase(): React.ReactElement {
  const reduceMotion = useHydrationSafeReducedMotion();
  const loop = useMemo(() => [...EXPLORE, ...EXPLORE], []);

  return (
    <section
      aria-label="Explore ScentRev: catalog, quiz, layering, subscribe, gift, story, and brand photography"
      className="w-full"
    >
      <div className="mx-auto max-w-6xl">
        {reduceMotion ? (
          <div className="flex flex-wrap justify-center gap-3 px-4 py-1 sm:px-6">
            {EXPLORE.map((item, index) => (
              <Link
                key={`${item.href}-${item.image}-${index}`}
                href={item.href}
                aria-label={item.ariaLabel}
                className={`group relative block overflow-hidden rounded-2xl border border-[#E0D8CC]/80 bg-[#1a1512] shadow-sm ${MARQUEE_CARD_CLASS}`}
              >
                <div className="relative aspect-[9/14] w-full">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 42vw, (max-width: 768px) 32vw, 20vw"
                    quality={72}
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden py-1">
            <div
              className="waitlist-marquee-track gap-3"
              style={{ ['--waitlist-marquee-duration' as string]: '55s' }}
            >
              {loop.map((item, index) => (
                <Link
                  key={`${item.image}-${index}`}
                  href={item.href}
                  aria-label={item.ariaLabel}
                  className={`group relative block overflow-hidden rounded-2xl border border-[#E0D8CC]/80 bg-[#1a1512] shadow-sm ${MARQUEE_CARD_CLASS}`}
                >
                  <div className="relative aspect-[9/14] w-full">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 640px) 42vw, (max-width: 768px) 32vw, 20vw"
                      quality={72}
                      loading={index < 2 ? 'eager' : 'lazy'}
                      priority={index === 0}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
