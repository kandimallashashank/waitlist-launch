'use client';

import React, { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, PackageX, ShoppingBag, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { getProxiedImageUrl, isProductPerfumeUrl } from '@/lib/imageProxy';
import {
  getListingFromOriginalPriceInr,
  getListingFromPriceInr,
  getOriginalPriceForListedSizeInr,
  getPriceForListedSizeInr,
  type ListedDecantSize,
} from '@/lib/fragranceCardPricing';
import { isFragranceInStock } from '@/lib/fragranceStock';

export interface ForYouStyleProductCardFragrance {
  id: string;
  name: string;
  brand: string;
  brand_slug?: string;
  price_3ml: number;
  price_8ml?: number;
  price_12ml?: number;
  original_price_3ml?: number;
  original_price_8ml?: number;
  original_price_12ml?: number;
  image_url?: string;
  primary_image_url?: string;
  /** From ``v_perfumes_card.catalog_updated_at`` for image URL cache-busting. */
  catalog_updated_at?: string;
  blind_buy_score: number;
  match_reasons?: string[];
  is_on_sale?: boolean;
  compliment_factor?: number;
  gift_confidence_score?: number | null;
  match_score?: number;
  occasions?: string[];
  in_stock?: boolean;
}

export interface ForYouStyleProductCardProps {
  fragrance: ForYouStyleProductCardFragrance;
  index: number;
  addingToCartId: string | null;
  onAddToCart: (fragrance: ForYouStyleProductCardFragrance) => void | Promise<void>;
  giftLine?: string;
  highlightOccasion?: string | null;
  onNavigateToProduct?: (id: string) => void;
  scoreLabel?: string;
  scoreValue?: number;
  showOccasionTags?: boolean;
  showTrialSizeHint?: boolean;
  /** When set, card price matches Men&apos;s Best Sellers PLP (selected decant). */
  listedDecantSize?: ListedDecantSize;
  /**
   * `gift`: same footprint as default; reserved for Gift Finder context (copy/analytics).
   */
  variant?: 'default' | 'gift';
  /** PLP / homepage: corner pill when there is no match-% badge (For You keeps this unset). */
  plpCornerBadge?: 'best_seller' | 'new' | 'similar' | 'for_you' | null;
  /** Waitlist pilot catalog: terracotta “SHOP” pill when no other corner badge. */
  pilotShopCorner?: boolean;
  /** When set, shown after blind-buy score like legacy PLP tiles. */
  reviewCount?: number | null;
  /**
   * When false, hides match-reason chips (PLP / men&apos;s cologne parity shorter tiles).
   * For You passes false so the grid matches category listing density.
   */
  showMatchReasonChips?: boolean;
  /** Extra classes on the outer animated wrapper (e.g. carousel width). */
  className?: string;
  /** When set, used for product navigation instead of `/product/{id}` (e.g. SEO slug + query). */
  detailHref?: string;
  /**
   * First visible listing tile (e.g. homepage best-sellers): eager image + fetch priority for LCP.
   */
  priorityImage?: boolean;
}

function normaliseOccasionLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Product tile aligned with category PLPs (e.g. men&apos;s cologne): compact border, image well, terracotta CTA.
 * Used on For You, Gift Finder, PerfumeListingCard, and shop grids.
 */
export const ForYouStyleProductCard = React.memo(function ForYouStyleProductCard({
  fragrance,
  index,
  addingToCartId,
  onAddToCart,
  giftLine,
  highlightOccasion,
  onNavigateToProduct,
  scoreLabel,
  scoreValue,
  showOccasionTags = false,
  showTrialSizeHint = false,
  listedDecantSize,
  variant = 'default',
  plpCornerBadge = null,
  pilotShopCorner = false,
  reviewCount,
  showMatchReasonChips = true,
  className,
  detailHref,
  priorityImage = false,
}: ForYouStyleProductCardProps) {
  const router = useRouter();
  const { cartAddFlash } = useAppContext();
  const [imageFailed, setImageFailed] = useState(false);

  const cartFlashActive = Boolean(
    cartAddFlash &&
      cartAddFlash.itemId === fragrance.id &&
      (!listedDecantSize || listedDecantSize === cartAddFlash.size),
  );
  const isAddingToCart = addingToCartId === fragrance.id;

  const displayScoreValue =
    scoreValue ??
    (typeof fragrance.gift_confidence_score === 'number'
      ? fragrance.gift_confidence_score
      : typeof fragrance.match_score === 'number'
        ? fragrance.match_score
        : undefined);

  const showMatchBadge =
    typeof displayScoreValue === 'number' &&
    Number.isFinite(displayScoreValue) &&
    displayScoreValue > 0 &&
    displayScoreValue <= 100;

  const primaryPlpBadge = !showMatchBadge ? plpCornerBadge : null;
  const saleOnlyCorner = !showMatchBadge && !primaryPlpBadge && Boolean(fragrance.is_on_sale);
  const saleStackedCorner =
    Boolean(fragrance.is_on_sale) && (showMatchBadge || Boolean(primaryPlpBadge));

  const matchChips = !giftLine ? (fragrance.match_reasons ?? []).slice(0, 2) : [];

  const visibleOccasions = useMemo(() => {
    const rawOccasions = fragrance.occasions ?? [];
    if (!rawOccasions.length || (!showOccasionTags && !highlightOccasion)) {
      return [];
    }

    if (!highlightOccasion) {
      return rawOccasions.slice(0, 2);
    }

    const lowered = highlightOccasion.toLowerCase();
    const matching = rawOccasions.filter((occasion) =>
      occasion.toLowerCase().replace(/_/g, ' ').includes(lowered),
    );

    return (matching.length > 0 ? matching : rawOccasions).slice(0, 2);
  }, [fragrance.occasions, highlightOccasion, showOccasionTags]);

  const fromPrice = getListingFromPriceInr(fragrance);
  const fromOriginal = getListingFromOriginalPriceInr(fragrance);

  const listedPrice = listedDecantSize
    ? getPriceForListedSizeInr(fragrance, listedDecantSize)
    : 0;
  const listedOriginal = listedDecantSize
    ? getOriginalPriceForListedSizeInr(fragrance, listedDecantSize)
    : undefined;

  const cardPrice =
    listedDecantSize && listedPrice > 0 ? listedPrice : fromPrice;
  const cardOriginal =
    listedDecantSize && listedPrice > 0 ? listedOriginal : fromOriginal;

  const inStock = isFragranceInStock(fragrance);

  const imgSrc =
    fragrance.image_url ||
    (fragrance as { primary_image_url?: string }).primary_image_url;

  const displayImageSrc = imgSrc
    ? getProxiedImageUrl(imgSrc, {
        catalogAssetVersion: fragrance.catalog_updated_at ?? null,
        knockOutWhiteMat: isProductPerfumeUrl(imgSrc),
      }) || imgSrc
    : undefined;
  const heroMatKnockout = Boolean(displayImageSrc?.includes('mat=1'));

  // If mat knockout fails, fall back to raw proxy without mat
  const fallbackImageSrc = imgSrc
    ? getProxiedImageUrl(imgSrc, { catalogAssetVersion: fragrance.catalog_updated_at ?? null, knockOutWhiteMat: false }) || imgSrc
    : undefined;

  const goToProduct = () => {
    onNavigateToProduct?.(fragrance.id);
    router.push(detailHref ?? `/product/${fragrance.id}`);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onMouseEnter={() => router.prefetch(detailHref ?? `/product/${fragrance.id}`)}
      className={cn(
        'group flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-[#EDE5DC] bg-white shadow-[0_2px_8px_rgba(26,26,26,0.06)] transition-all duration-200 hover:border-[#D4C4B4] hover:shadow-[0_8px_28px_-8px_rgba(184,90,58,0.18)]',
        className,
      )}
    >
      {/* ── Image area ── */}
      <div
        className="relative cursor-pointer overflow-hidden bg-white"
        style={{ aspectRatio: '1/1' }}
        onClick={goToProduct}
      >
        {/* Badges */}
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
          {showMatchBadge ? null : primaryPlpBadge === 'best_seller' ? (
            <span className="rounded-full bg-[#B85A3A] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              BEST SELLER
            </span>
          ) : primaryPlpBadge === 'new' ? (
            <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              NEW
            </span>
          ) : (pilotShopCorner && !fragrance.is_on_sale) ? (
            <span className="rounded-full bg-[#5C534C] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              SHOP
            </span>
          ) : null}
          {(saleOnlyCorner || saleStackedCorner) ? (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              SALE
            </span>
          ) : null}
        </div>

        {!inStock && (
          <div className="absolute inset-x-0 top-0 z-20 bg-[#1A1A1A]/85 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-white">
            Out of stock
          </div>
        )}

        {inStock && cartFlashActive && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-[18] flex items-center justify-center bg-[#1A1A1A]/55 backdrop-blur-[2px]"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-1 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              <span className="text-[11px] font-semibold">Added</span>
            </div>
          </m.div>
        )}

        {/* Product image */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {displayImageSrc && !imageFailed ? (
            <>
              <img
                src={displayImageSrc}
                alt={fragrance.name}
                loading={priorityImage ? 'eager' : 'lazy'}
                decoding="async"
                {...(priorityImage ? { fetchPriority: 'high' as const } : {})}
                className="h-full w-full object-contain transition-transform duration-400 group-hover:scale-[1.04]"
                style={{ mixBlendMode: 'multiply' }}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  // If mat knockout failed, try raw proxy without mat
                  if (fallbackImageSrc && el.src !== fallbackImageSrc) {
                    el.src = fallbackImageSrc;
                  } else {
                    setImageFailed(true);
                  }
                }}
              />
              {/* Ground shadow */}
              <div
                className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 h-3 w-3/5"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                }}
                aria-hidden
              />
            </>
          ) : (
            <div className="flex h-16 w-10 flex-col items-center justify-center rounded-lg bg-gradient-to-b from-[#E0D8D0] to-[#CEC4BA] shadow-md">
              <div className="h-2 w-7 rounded-full bg-[#5C5A52]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Info section ── */}
      <div className="flex flex-1 flex-col px-2 pb-2 pt-1.5">
        {/* Brand */}
        <Link
          href={`/collections/${fragrance.brand_slug || fragrance.brand.toLowerCase().replace(/\s+/g, '-')}`}
          className="mb-0.5 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A09088] transition-colors hover:text-[#B85A3A]"
          onClick={(e) => e.stopPropagation()}
        >
          {fragrance.brand}
        </Link>

        {/* Name */}
        <button
          type="button"
          onClick={goToProduct}
          className="mb-2 w-full text-left"
          title={fragrance.name}
          aria-label={`View ${fragrance.name}`}
        >
          <h3 className="line-clamp-2 text-xs font-bold leading-snug text-[#1A1A1A] transition-colors hover:text-[#B85A3A] sm:text-[13px]">
            {fragrance.name}
          </h3>
        </button>

        {/* Rating + price row */}
        <div className="mt-auto flex items-center justify-between gap-1 border-t border-[#F0EAE4] pt-2">
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 shrink-0 fill-[#D4A574] text-[#D4A574]" aria-hidden />
            <span className="text-[11px] font-semibold tabular-nums text-[#5C534C]">
              {Number(fragrance.blind_buy_score).toFixed(1)}
            </span>
          </div>
          <div className="flex items-baseline gap-1 text-right">
            <span className="text-xs font-bold tabular-nums text-[#1A1A1A] sm:text-sm">
              {listedDecantSize ? '' : 'From '}₹{cardPrice.toLocaleString('en-IN')}
            </span>
            {cardOriginal != null && (
              <span className="text-[10px] tabular-nums text-[#B0A898] line-through">
                ₹{cardOriginal.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {inStock ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onAddToCart(fragrance);
            }}
            disabled={isAddingToCart}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200',
              cartFlashActive
                ? 'bg-green-600 text-white'
                : isAddingToCart
                  ? 'bg-[#B85A3A] text-white'
                  : 'bg-[#B85A3A] text-white hover:bg-[#A04D2F]',
            )}
          >
            {cartFlashActive ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : isAddingToCart ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {cartFlashActive ? 'Added' : isAddingToCart ? 'Adding…' : 'Add to Cart'}
          </button>
        ) : (
          <div className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E8E0D8] bg-[#F5F2EE] py-2 text-xs text-[#A09088]">
            <PackageX className="h-3.5 w-3.5 shrink-0" />
            Out of stock
          </div>
        )}
      </div>
    </m.div>
  );
});
