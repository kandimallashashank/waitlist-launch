"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { WaitlistMarqueePick } from '@/types/waitlistCatalog';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { storeUrl } from '@/lib/storeUrl';

/**
 * Image area: shared aspect ratio so every card uses the same geometry (not mixed px heights).
 * Bottle img: %-sized like shop cards, overflow hidden + slight bottom scale so tight crops look even
 * despite PNGs with different internal padding around the bottle.
 */
const CATALOG_IMAGE_AREA_CLASS =
  'relative w-full aspect-[4/3] overflow-hidden flex flex-col items-center justify-end bg-gradient-to-br from-[#FDF6F3] to-[#E8E0D8]/80 pb-2 pt-2';
const CATALOG_BOTTLE_IMG_CLASS =
  'w-[64%] max-h-[86%] min-h-0 object-contain object-bottom scale-110 origin-bottom [@media(prefers-reduced-motion:reduce)]:scale-100';

function pickShowcase<T extends { primary_image_url?: string }>(all: T[], n: number): T[] {
  const withImg = all.filter((p) => (p.primary_image_url ?? '').trim().length > 0);
  const pool = withImg.length >= Math.min(n, 3) ? withImg : all;
  return pool.slice(0, n);
}

/**
 * Builds the visible marquee slice from the shared pool (sync on SSR + client).
 */
function showcaseFromPool(pool: WaitlistMarqueePick[] | undefined): WaitlistMarqueePick[] {
  const list = pool ?? [];
  return list.length > 0 ? pickShowcase(list, 20) : [];
}

/**
 * Full-width dark marquee of real catalog bottles.
 * Infinite scroll uses CSS animation on `transform` (GPU-friendly, linear easing).
 * Card lift uses `.waitlist-catalog-card` (hover gated to fine pointer; see globals.css).
 *
 * Returns:
 *   Section with horizontally scrolling product cards.
 */
interface WaitlistCatalogMarqueeProps {
  /**
   * When set, use this pool instead of fetching (same shared set as waitlist hero/showcase).
   */
  sharedCatalog?: WaitlistMarqueePick[];
}

export default function WaitlistCatalogMarquee(
  { sharedCatalog }: WaitlistCatalogMarqueeProps = {}
): React.ReactElement {
  const [products, setProducts] = useState<WaitlistMarqueePick[]>(() =>
    showcaseFromPool(sharedCatalog),
  );
  const waitlistOnly = process.env.NEXT_PUBLIC_WAITLIST_ONLY === 'true';
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setProducts(showcaseFromPool(sharedCatalog));
  }, [sharedCatalog]);

  const loop = useMemo(() => [...products, ...products], [products]);

  return (
    <section className="relative overflow-hidden bg-[#141210] py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(212,165,116,0.5),transparent_50%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4A574] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            aria-hidden
          >
            <Sparkles className="h-3.5 w-3.5 text-[#141210]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4A574]">
              From the catalog
            </p>
            <h2 className="font-display text-2xl text-white md:text-3xl">Real bottles. Real data.</h2>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex gap-4 overflow-hidden pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[176px] w-[160px] shrink-0 animate-pulse rounded-xl bg-white/10"
              />
            ))}
          </div>
        ) : reduceMotion ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {products.slice(0, 12).map((p) => {
              const card = (
                <div className="w-[176px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white shadow-xl">
                  <div className={CATALOG_IMAGE_AREA_CLASS}>
                    {p.primary_image_url ? (
                      <img
                        src={getProxiedImageUrl(p.primary_image_url) || p.primary_image_url}
                        alt={p.name}
                        loading="lazy"
                        className={CATALOG_BOTTLE_IMG_CLASS}
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    ) : (
                      <div className="mb-1 aspect-[3/5] w-[32%] max-w-[72px] rounded-lg bg-gradient-to-b from-[#D4A574]/30 to-[#1A1A1A]/20" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#5C5A52]">{p.brand_name}</p>
                    <p className="font-display text-sm text-[#1A1A1A] line-clamp-2">{p.name}</p>
                    <p className="mt-1 text-xs text-[#B85A3A]">
                      Blind-buy score {p.blind_buy_score.toFixed(1)}
                    </p>
                  </div>
                </div>
              );
              if (waitlistOnly) {
                return (
                  <div key={p.id} className="pointer-events-none shrink-0">
                    {card}
                  </div>
                );
              }
              return (
                <Link key={p.id} href={storeUrl(`/product/${p.id}`)} className="shrink-0">
                  {card}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden">
            <div
              className="waitlist-marquee-track gap-5"
              style={{ ['--waitlist-marquee-duration' as string]: '52s' }}
            >
              {loop.map((p, index) => {
                const inner = (
                  <div className="waitlist-catalog-card w-[176px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white shadow-xl">
                    <div className={CATALOG_IMAGE_AREA_CLASS}>
                      {p.primary_image_url ? (
                        <img
                          src={getProxiedImageUrl(p.primary_image_url) || p.primary_image_url}
                          alt={p.name}
                          loading="lazy"
                          className={CATALOG_BOTTLE_IMG_CLASS}
                          style={{ mixBlendMode: 'multiply' }}
                        />
                      ) : (
                        <div className="mb-1 aspect-[3/5] w-[32%] max-w-[72px] rounded-lg bg-gradient-to-b from-[#D4A574]/30 to-[#1A1A1A]/20" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#5C5A52]">
                        {p.brand_name}
                      </p>
                      <p className="font-display text-sm text-[#1A1A1A] line-clamp-2">{p.name}</p>
                      <p className="mt-1 text-xs text-[#B85A3A]">
                        Blind-buy score {p.blind_buy_score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                );

                if (waitlistOnly) {
                  return (
                    <div key={`${p.id}-${index}`} className="pointer-events-none">
                      {inner}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${p.id}-${index}`}
                    href={storeUrl(`/product/${p.id}`)}
                    className="shrink-0"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/50">
          A living slice of our inventory; recommendations use the same signals you see here.
        </p>
      </div>
    </section>
  );
}
