"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHydrationSafeReducedMotion } from '@/hooks/useHydrationSafeReducedMotion';

import { cn } from '@/lib/utils';
import { storeUrl } from '@/lib/storeUrl';

/**
 * Brand data with logo images
 * Images are stored in public/brands/ folder
 */
const brands = [
  { name: 'Creed', slug: 'creed', logo: '/brands/Creed_Fragrances_logo.svg.png' },
  { name: 'Gucci', slug: 'gucci', logo: '/brands/gucci-1-logo-png-transparent.png' },
  { name: 'Louis Vuitton', slug: 'louis-vuitton', logo: '/brands/Louis-Vuitton-logo.png' },
  { name: 'Prada', slug: 'prada', logo: '/brands/Prada-Logo.png' },
  { name: 'Azzaro', slug: 'azzaro', logo: '/brands/Logo_Azzaro.png' },
  { name: 'MFK', slug: 'maison-francis-kurkdjian', logo: '/brands/MACAU-MFK-LOGO-1284x124-Fiona-Ip_480x480.webp' },
  { name: 'Amouage', slug: 'amouage', logo: '/brands/Amouage_logo.png' },
];

/** Soft horizontal fades so the marquee never looks “cut off” at the edges. */
const MARQUEE_MASK =
  '[mask-image:linear-gradient(90deg,transparent_0%,black_10%,black_90%,transparent_100%)] [mask-size:100%_100%] [mask-repeat:no-repeat] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,black_10%,black_90%,transparent_100%)] [-webkit-mask-size:100%_100%]';

const brandLinkClass =
  'flex-shrink-0 opacity-[0.88] transition-opacity duration-300 hover:opacity-100';

function BrandLogoLink({
  brand,
  priority = false,
}: {
  brand: (typeof brands)[0];
  /** First visible logos in hero: preload for LCP. */
  priority?: boolean;
}) {
  return (
    <Link
      href={storeUrl(`/collections/${brand.slug}`)}
      className={cn(brandLinkClass, 'grayscale-[0.35] hover:grayscale-0')}
    >
      <Image
        src={brand.logo}
        alt={`${brand.name} logo`}
        width={100}
        height={50}
        className="h-7 w-auto object-contain md:h-9"
        style={{ maxWidth: '112px' }}
        priority={priority}
        sizes="(max-width: 768px) 96px, 112px"
      />
    </Link>
  );
}

/**
 * Infinite horizontal marquee using the same CSS transform loop as other waitlist strips
 * (`waitlist-marquee-track` in globals.css). Duplicated row + translate3d(-50%) is seamless.
 */
function BrandMarqueeStrip({
  durationSec,
  gapClass,
  reduceMotion,
}: {
  durationSec: number;
  gapClass: string;
  reduceMotion: boolean;
}) {
  if (reduceMotion) {
    return (
      <div
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          gapClass,
        )}
      >
        {brands.map((brand, index) => (
          <div key={`static-${brand.slug}-${index}`} className="snap-start shrink-0">
            <BrandLogoLink brand={brand} priority={index < 3} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('waitlist-marquee-track items-center', gapClass)}
      style={{ ['--waitlist-marquee-duration' as string]: `${durationSec}s` }}
    >
      {brands.map((brand, index) => (
        <BrandLogoLink key={`a-${index}`} brand={brand} priority={index < 3} />
      ))}
      {brands.map((brand, index) => (
        <BrandLogoLink key={`b-${index}`} brand={brand} />
      ))}
    </div>
  );
}

export interface BrandLogosSectionProps {
  /**
   * `section`: full-width strip (homepage). `inline`: compact block for embedding (e.g. waitlist hero).
   */
  variant?: 'section' | 'inline';
  /** When false, hides the “Choose From Over 500 Scents!” line (section variant only). */
  showTagline?: boolean;
  /** Optional eyebrow above the marquee (inline variant only). */
  eyebrow?: string;
  /** Extra classes on the root element. */
  className?: string;
}

/**
 * Animated marquee of perfume brand logos (same houses as the homepage strip).
 */
export default function BrandLogosSection({
  variant = 'section',
  showTagline = true,
  eyebrow = 'Featured houses',
  className,
}: BrandLogosSectionProps) {
  const reduceMotion = useHydrationSafeReducedMotion();

  if (variant === 'inline') {
    return (
      <div className={cn('relative', className)}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B85A3A]">
          {eyebrow}
        </p>
        <div className="overflow-hidden rounded-2xl border border-[#E0D8CC] bg-gradient-to-b from-white/90 to-[#FAF8F5]/95 py-3.5 shadow-[0_10px_40px_-18px_rgba(20,18,15,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm md:py-4">
          <div className={cn('px-1', MARQUEE_MASK)}>
            <BrandMarqueeStrip
              durationSec={42}
              gapClass="gap-10 md:gap-14"
              reduceMotion={reduceMotion ?? false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'relative border-y border-[#E5E5E5] bg-white py-6 md:py-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#FDF6F3]/20 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        <div className={cn('overflow-hidden', MARQUEE_MASK)}>
          <BrandMarqueeStrip
            durationSec={32}
            gapClass="gap-12 md:gap-16"
            reduceMotion={reduceMotion ?? false}
          />
        </div>

        {showTagline ? (
          <p className="mt-6 text-center text-sm text-[#404040] md:text-base">
            Choose From Over 500 Scents!
          </p>
        ) : null}
      </div>
    </section>
  );
}
