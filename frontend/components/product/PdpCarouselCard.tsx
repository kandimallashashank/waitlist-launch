'use client';

/**
 * Shared PDP horizontal carousel + compact product card (image well, price, Add to cart).
 * Used by Smells Similar / You May Also Like and Recently Viewed for consistent layout.
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Star, ChevronLeft, ChevronRight, ShoppingBag, Loader2, PackageX } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProxiedImageUrl, isProductPerfumeUrl } from '@/lib/imageProxy';
import {
  PRODUCT_CARD_LISTING_IMAGE_ASPECT_CLASS,
  PRODUCT_CARD_BRAND_CLASS,
  PRODUCT_CARD_TITLE_COMPACT_CLASS,
  PRODUCT_CARD_PRICE_COMPACT_CLASS,
} from '@/lib/productCardVisual';
import { cn } from '@/lib/utils';
import { PDP_SIMILAR_CARD_WIDTH_STYLE } from '@/lib/sectionCardSizes';
import { useAppContext } from '@/contexts/AppContext';
import { isFragranceInStock } from '@/lib/fragranceStock';

/** Minimal fragrance row for carousel cards (API similar, vector, or localStorage recently viewed). */
export interface PdpCarouselFragrance {
  id: string;
  name: string;
  brand_name?: string;
  brand?: string;
  primary_image_url?: string;
  image_url?: string;
  price_3ml?: number;
  original_price_3ml?: number;
  blind_buy_score?: number;
  average_rating?: number;
  review_count?: number;
  in_stock?: boolean;
  gender?: string;
}

/** Horizontal scroll carousel with arrow controls (matches PDP similar-section UX). */
export function PdpScrollCarousel({ children, label }: { children: React.ReactNode; label: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
  }, [children]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <div className="group/carousel relative overflow-x-clip">
      {canLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E5] bg-white opacity-0 shadow-md transition-colors hover:bg-[#FDF6F3] group-hover/carousel:opacity-100 sm:left-2 md:flex"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeft className="h-4 w-4 text-[#1A1A1A]" />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto scroll-smooth px-0.5 pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E5] bg-white opacity-0 shadow-md transition-colors hover:bg-[#FDF6F3] group-hover/carousel:opacity-100 sm:right-2 md:flex"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRight className="h-4 w-4 text-[#1A1A1A]" />
        </button>
      )}
    </div>
  );
}

interface PdpCompactCardProps {
  frag: PdpCarouselFragrance;
  badge?: React.ReactNode;
  /** Optional query string (no leading `?`), e.g. `source=similar`. */
  hrefSearch?: string;
  /** Use full grid cell width instead of fixed carousel track width. */
  fillWidth?: boolean;
}

/**
 * Compact product tile: image well, brand/name/price, Add to cart (3ml) when price + stock allow.
 */
export function PdpCompactCard({ frag, badge, hrefSearch, fillWidth }: PdpCompactCardProps) {
  const { user, addToCart } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const img = frag.primary_image_url || frag.image_url;
  const displayImg =
    img &&
    (getProxiedImageUrl(img, { knockOutWhiteMat: isProductPerfumeUrl(img) }) || img);
  const compactMatKnockout = Boolean(displayImg?.includes('mat=1'));
  const brand = frag.brand_name || frag.brand || '';
  const score = frag.blind_buy_score ?? frag.average_rating;
  const href = hrefSearch ? `/product/${frag.id}?${hrefSearch}` : `/product/${frag.id}`;
  const inStock = isFragranceInStock(frag);
  const hasPrice = frag.price_3ml != null && Number.isFinite(frag.price_3ml);
  const canQuickAdd = hasPrice && inStock;

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canQuickAdd) return;
    if (!user?.id) {
      window.dispatchEvent(new CustomEvent('openSignIn'));
      return;
    }
    setIsAdding(true);
    try {
      await addToCart({
        item_id: frag.id,
        item_type: 'fragrance',
        item_name: frag.name,
        item_brand: brand,
        price: frag.price_3ml as number,
        size: '3ml',
        quantity: 1,
        image_url: img || undefined,
      });
    } catch {
      /* Error toast from AppContext */
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'flex h-full snap-start flex-col rounded-2xl border border-[#E8E4DF] bg-white p-2 shadow-[0_4px_24px_-10px_rgba(26,26,26,0.12)] transition-all duration-200 hover:border-[#DDD8D2] hover:shadow-[0_14px_40px_-18px_rgba(26,26,26,0.2)]',
        fillWidth ? 'min-w-0 w-full' : 'flex-shrink-0',
      )}
      style={fillWidth ? undefined : PDP_SIMILAR_CARD_WIDTH_STYLE}
    >
      <Link href={href} className="group flex min-h-0 flex-1 flex-col">
        <div
          className={`relative mb-2 flex flex-col overflow-hidden rounded-xl bg-[#EFEAE4] p-2.5 pb-1.5 ${PRODUCT_CARD_LISTING_IMAGE_ASPECT_CLASS}`}
        >
          {badge && <div className="absolute left-1.5 top-1.5 z-10">{badge}</div>}
          {displayImg ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-1 pt-1">
              <img
                src={displayImg}
                alt={frag.name}
                loading="lazy"
                className="h-auto w-auto max-h-[86%] max-w-full shrink object-contain transition-transform group-hover:scale-105"
                style={compactMatKnockout ? undefined : { mixBlendMode: 'multiply' }}
              />
              <div
                className="mx-auto mt-0.5 shrink-0"
                style={{
                  width: '55%',
                  height: '8px',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, transparent 70%)',
                  filter: 'blur(3px)',
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-14 w-10 rounded bg-gradient-to-b from-[#E5E5E5] to-[#D5D5D5]" />
            </div>
          )}
        </div>
        <div className="min-w-0 shrink-0">
          <p
            className={cn(
              PRODUCT_CARD_BRAND_CLASS,
              'transition-colors hover:text-terracotta-600',
            )}
          >
            {brand}
          </p>
          <div className="flex h-9 min-w-0 items-center sm:h-10">
            <p
              className={cn(
                PRODUCT_CARD_TITLE_COMPACT_CLASS,
                'block min-w-0 truncate transition-colors hover:text-terracotta-600',
              )}
              title={frag.name}
            >
              {frag.name}
            </p>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {frag.price_3ml != null && (
                <p className={PRODUCT_CARD_PRICE_COMPACT_CLASS}>₹{Math.round(frag.price_3ml)}</p>
              )}
              {frag.original_price_3ml != null && frag.original_price_3ml > (frag.price_3ml || 0) && (
                <span className="text-[10px] text-neutral-400 line-through">
                  ₹{Math.round(frag.original_price_3ml)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {score != null && score > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-neutral-600">
                  <Star className="h-3 w-3 fill-[#D4A574] text-[#D4A574]" />
                  <span className="font-semibold">{score.toFixed(1)}</span>
                  {frag.review_count != null && frag.review_count > 0 && (
                    <span className="text-neutral-500">({frag.review_count})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 shrink-0" aria-hidden />
      </Link>

      <div className="mt-auto w-full shrink-0 pt-2">
        {!inStock ? (
          <div
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 py-2 text-[10px] font-medium text-neutral-500"
            role="status"
          >
            <PackageX className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Out of stock
          </div>
        ) : !hasPrice ? (
          <p className="text-center text-[10px] text-neutral-500">Open product for pricing</p>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#A65D3F] py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#954E34] disabled:opacity-70"
            aria-label={`Add ${frag.name} to cart`}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            Add to cart
          </button>
        )}
      </div>
    </motion.div>
  );
}
