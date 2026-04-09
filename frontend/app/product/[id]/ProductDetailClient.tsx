'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, PackageX, ChevronLeft, ChevronRight, Zap, Loader2, Clock3, Wind, Truck, RotateCcw, Mail, ShieldCheck, SlidersHorizontal, Flower2, Users, MapPin, ShieldQuestion, X } from 'lucide-react';
import { base44, type Fragrance, type DecantInventoryItem } from '@/api/base44Client';
import { mockFragrances } from '@/lib/mockData';
import { toast } from 'sonner';
import WishlistButton from '@/components/wishlist/WishlistButton';
import { PdpCompactCard, PdpScrollCarousel, type PdpCarouselFragrance } from '@/components/product/PdpCarouselCard';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { ProductDetailLoadingSkeleton } from '@/components/product/ProductDetailLoadingSkeleton';
import { useAppContext } from '@/contexts/AppContext';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getProxiedImageUrl, isProductPerfumeUrl } from '@/lib/imageProxy';
import { getRecentlyViewed, trackRecentlyViewed, type RecentlyViewedItem } from '@/lib/storage/recentlyViewedStorage';
import { isFragranceInStock } from '@/lib/fragranceStock';
import { getAccessToken } from '@/lib/supabase';
import { formatInrDisplay, rupeesUntilFreeShipping } from '@/lib/utils';
import RazorpayAffordabilityWidget from '@/components/payments/RazorpayAffordabilityWidget';
import { loadRazorpay, createQuickBuyOrder, verifyRazorpayPayment, abandonCheckout, type RazorpayResponse } from '@/utils/razorpay';
import DecantCaseSelector, { type SelectedCase } from '@/components/product/DecantCaseSelector';
import { uiListedDecantLabel } from '@/lib/fragranceCardPricing';
import LayeringLabBanner from '@/components/layering/LayeringLabBanner';

/**
 * Waitlist pilot: skip below-fold modules that pull large dependency trees; hero matches storefront.
 */
const ReviewSection = (_p: {
  fragranceId: string;
  fragranceName: string;
}): null => null;
const YouMayAlsoLike = (_p: Record<string, unknown>): null => null;
const BlindBuySection = (_p: Record<string, unknown>): null => null;
const HandFilledSection = (): null => null;
const ProductFAQ = (): null => null;
const FragranceDNA = dynamic(() => import('@/components/product/FragranceDNA'), {
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-neutral-50" />,
});
const SubscriptionBanner = (_p: Record<string, unknown>): null => null;
const PdpScorePills = (_p: { fragranceId: string }): null => null;

/** Set true to re-enable product-page Buy Now (Razorpay quick checkout). */
const QUICK_BUY_ENABLED = false;

const IS_WAITLIST_PREVIEW =
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === 'true' ||
  process.env.NEXT_PUBLIC_WAITLIST_ONLY === '1';
const PDP_CACHE_PREFIX = 'scentrev:pdp:fragrance:';
const PDP_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

interface FragranceAiInsights {
  who_is_it_for: string | null;
  blind_buy_report: string | null;
  wear_when: string | null;
}

interface ReviewSummary {
  summary: string | null;
  themes: string[] | null;
}

type ProductLivePatch = Partial<
  Pick<
    Fragrance,
    | 'price_3ml'
    | 'price_8ml'
    | 'price_12ml'
    | 'original_price_3ml'
    | 'original_price_8ml'
    | 'original_price_12ml'
    | 'in_stock'
    | 'blind_buy_score'
    | 'average_rating'
    | 'review_count'
    | 'compliment_factor'
    | 'gift_confidence_score'
  >
> & {
  available_sizes?: unknown;
};

/**
 * Read a recent product snapshot from sessionStorage for instant PDP paint.
 *
 * Args:
 *   productId: Product UUID.
 *
 * Returns:
 *   Cached fragrance object or null when missing/stale/invalid.
 */
function readCachedProduct(productId: string): Fragrance | null {
  if (typeof window === 'undefined' || !productId) return null;
  try {
    const raw = window.sessionStorage.getItem(`${PDP_CACHE_PREFIX}${productId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; product?: Fragrance };
    if (!parsed?.product || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > PDP_CACHE_MAX_AGE_MS) return null;
    return parsed.product;
  } catch {
    return null;
  }
}

/**
 * Persist a short-lived product snapshot for faster repeat PDP loads.
 *
 * Args:
 *   product: Fragrance payload from API.
 */
function writeCachedProduct(product: Fragrance): void {
  if (typeof window === 'undefined' || !product?.id) return;
  try {
    window.sessionStorage.setItem(
      `${PDP_CACHE_PREFIX}${product.id}`,
      JSON.stringify({ ts: Date.now(), product })
    );
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

/**
 * Merge volatile PDP fields from the live endpoint over static product payload.
 *
 * Args:
 *   product: Base product payload.
 *   live: Volatile fields (pricing/stock/review summary).
 *
 * Returns:
 *   Product enriched with fresher volatile fields.
 */
function mergeLivePatchIntoProduct(product: Fragrance, live: ProductLivePatch | null): Fragrance {
  if (!live) return product;
  const merged = { ...product };

  if (typeof live.price_3ml === 'number') merged.price_3ml = live.price_3ml;
  if (typeof live.price_8ml === 'number') merged.price_8ml = live.price_8ml;
  if (typeof live.price_12ml === 'number') merged.price_12ml = live.price_12ml;

  if (typeof live.original_price_3ml === 'number') merged.original_price_3ml = live.original_price_3ml;
  if (typeof live.original_price_8ml === 'number') merged.original_price_8ml = live.original_price_8ml;
  if (typeof live.original_price_12ml === 'number') merged.original_price_12ml = live.original_price_12ml;

  if (typeof live.in_stock === 'boolean') merged.in_stock = live.in_stock;
  if (typeof live.blind_buy_score === 'number') merged.blind_buy_score = live.blind_buy_score;
  if (typeof live.average_rating === 'number') merged.average_rating = live.average_rating;
  if (typeof live.review_count === 'number') merged.review_count = live.review_count;
  if (typeof live.compliment_factor === 'number') merged.compliment_factor = live.compliment_factor;

  if (live.available_sizes != null) {
    (merged as Fragrance & { available_sizes?: unknown }).available_sizes = live.available_sizes;
  }
  return merged;
}

/**
 * Maps backend gender_score (0–10) to a short label and hint for shoppers.
 *
 * Args:
 *   score: Gender lean score from the API.
 *
 * Returns:
 *   title: Primary label (e.g. "Unisex").
 *   hint: One line explaining the scale.
 *   markerPct: Position 0–100 for the visual slider marker.
 */
function getGenderLeanPresentation(score: number): { title: string; hint: string; markerPct: number } {
  const s = Math.max(0, Math.min(10, score));
  const markerPct = (s / 10) * 100;
  if (s <= 2) {
    return { title: 'Feminine', hint: 'This scent leans feminine on our scale.', markerPct };
  }
  if (s <= 4) {
    return { title: 'Feminine-leaning', hint: 'Slightly feminine; still widely wearable.', markerPct };
  }
  if (s <= 6) {
    return { title: 'Unisex', hint: 'Balanced not strongly coded either way.', markerPct };
  }
  if (s <= 8) {
    return { title: 'Masculine-leaning', hint: 'Slightly masculine; still widely wearable.', markerPct };
  }
  return { title: 'Masculine', hint: 'This scent leans masculine on our scale.', markerPct };
}

/**
 * Short label for the hero-image pill when the shopper arrived via a tagged link (`?source=` / `?from=`).
 *
 * Args:
 *   raw: Raw query value, or null when absent.
 *
 * Returns:
 *   Uppercase pill text (e.g. "SIMILAR"), or null when no badge should show.
 */
function getEntrySourceBadgeLabel(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'direct') return null;
  const labels: Record<string, string> = {
    similar: 'SIMILAR',
    search: 'SEARCH',
    plp: 'SHOP',
    quiz: 'QUIZ',
    home: 'HOME',
    recent: 'RECENT',
  };
  return labels[key] ?? null;
}

// ---------------------------------------------------------------------------
// Description with See More
// ---------------------------------------------------------------------------
function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 300;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-xl border border-[#E9DBD2] bg-white/80 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">About this fragrance</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Fragrance story</span>
      </div>
      <p className={`text-sm leading-relaxed text-[#525252] ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-[#B85A3A] transition-colors hover:text-[#A04D2F]"
        >
          {expanded ? 'Show less' : 'Read full description'}
        </button>
      )}
    </motion.div>
  );
}

/**
 * Maps localStorage recently viewed row to the shared PDP carousel card shape.
 */
function recentlyViewedToCarouselFrag(item: RecentlyViewedItem): PdpCarouselFragrance {
  return {
    id: item.id,
    name: item.name,
    brand_name: item.brand,
    brand: item.brand,
    image_url: item.image_url,
    price_3ml: item.price_3ml,
    blind_buy_score: item.blind_buy_score,
  };
}

// ---------------------------------------------------------------------------
// Product Detail Page
// ---------------------------------------------------------------------------
function ProductDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = params?.id as string;
  const uuidMatch = rawId?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const productId = uuidMatch ? uuidMatch[1] : rawId;

  /** SSR + first client frame must match: sessionStorage is client-only, so never seed from cache in useState. */
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const { user, addToCart: contextAddToCart, cartItems, removeFromCart, refreshCart } = useAppContext();
  const analytics = useAnalytics();
  const [selectedSize, setSelectedSize] = useState<string>('3ml');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'network' | 'not_found' | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({
    xPct: 50,
    yPct: 50,
    xPx: 0,
    yPx: 0,
  });
  const [decantInventory, setDecantInventory] = useState<DecantInventoryItem[]>([]);
  const [selectedDecantCases, setSelectedDecantCases] = useState<SelectedCase[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [aiInsights, setAiInsights] = useState<FragranceAiInsights | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const heroImageStageRef = useRef<HTMLDivElement | null>(null);
  const MAGNIFIER_LENS_SIZE_PX = 130;
  const MAGNIFIER_ZOOM_SCALE = 2.35;

  useScrollRestoration();

  useLayoutEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    const cached = readCachedProduct(productId);
    if (cached) {
      setFragrance(cached);
      setLoading(false);
      void loadProduct(false);
      return;
    }
    void loadProduct(true);
    // Intentionally depend on productId + searchParams only; loadProduct reads them each run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, searchParams]);

  useEffect(() => {
    if (!productId || !user?.email) return;
    base44.entities.RecentViews.track(productId, 'product_page').catch(() => {});
  }, [productId, user?.email]);

  useEffect(() => {
    if (!fragrance?.id) return;
    const items = getRecentlyViewed().filter((item) => item.id !== fragrance.id).slice(0, 8);
    setRecentlyViewed(items);
  }, [fragrance?.id]);

  useEffect(() => {
    if (!fragrance?.id || !fragrance.review_count || fragrance.review_count < 3) return;
    fetch(`/api/fragrances/${fragrance.id}/review-summary?review_count=${fragrance.review_count}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ReviewSummary | null) => {
        if (data && (data.summary || data.themes?.length)) {
          setReviewSummary(data);
        }
      })
      .catch(() => {});
  }, [fragrance?.id, fragrance?.review_count]);

  useEffect(() => {
    setIsMagnifierActive(false);
  }, [selectedImageIndex]);

  const updateMagnifierPosition = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    const stage = heroImageStageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const lensHalf = MAGNIFIER_LENS_SIZE_PX / 2;
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const clampedX = Math.max(lensHalf, Math.min(rect.width - lensHalf, rawX));
    const clampedY = Math.max(lensHalf, Math.min(rect.height - lensHalf, rawY));

    setMagnifierPosition({
      xPx: clampedX,
      yPx: clampedY,
      xPct: (clampedX / rect.width) * 100,
      yPct: (clampedY / rect.height) * 100,
    });
    setIsMagnifierActive(true);
  };

  useEffect(() => {
    if (!fragrance?.id) return;
    fetch(`/api/fragrances/${fragrance.id}/ai-insights`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FragranceAiInsights | null) => {
        if (data && (data.who_is_it_for || data.blind_buy_report || data.wear_when)) {
          setAiInsights(data);
        }
      })
      .catch(() => {});
  }, [fragrance?.id]);

  const loadProduct = async (showSkeleton: boolean = true) => {
    if (!productId) { setLoading(false); return; }
    if (showSkeleton) setLoading(true);
    setLoadError(null);
    try {
      let product: Fragrance | null = null;
      let apiFailed = false;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      try {
        const [staticRes, liveRes] = await Promise.allSettled([
          fetch(`/api/fragrances/${productId}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
          }),
          fetch(`/api/fragrances/${productId}/live`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
          }),
        ]);
        const res = staticRes.status === 'fulfilled' ? staticRes.value : null;
        const live = liveRes.status === 'fulfilled' ? liveRes.value : null;

        let livePatch: ProductLivePatch | null = null;
        if (live?.ok) {
          livePatch = (await live.json()) as ProductLivePatch;
        }

        if (res?.ok) {
          const data = await res.json();
          if (data?.id) {
            const baseProduct = { ...data, image_url: data.primary_image_url || data.image_url, brand: data.brand_name || data.brand } as Fragrance;
            product = mergeLivePatchIntoProduct(baseProduct, livePatch);
          }
        } else if (res && res.status !== 404) {
          apiFailed = true;
        } else if (!res) {
          apiFailed = true;
        }
      } catch {
        apiFailed = true;
      }

      if (!product && apiFailed) {
        try { product = await base44.entities.Fragrance.get(productId); if (product) apiFailed = false; } catch {}
      }
      if (!product) product = mockFragrances.find(f => f.id === productId) || null;

      if (!product) {
        if (apiFailed) { setLoadError('network'); setFragrance(null); } else { notFound(); }
        return;
      }

      setFragrance(product);
      writeCachedProduct(product);
      const viewSource =
        searchParams.get('source') || searchParams.get('from') || 'direct';
      analytics.productViewed(
        {
          id: product.id || '',
          name: product.name || '',
          brand: product.brand,
          price: product.price_3ml,
        },
        viewSource
      );
      trackRecentlyViewed({
        id: product.id || '', name: product.name || '', brand: product.brand || '',
        brand_slug: (product.brand || '').toLowerCase().replace(/\s+/g, '-'),
        image_url: product.image_url,
        price_3ml: product.price_3ml || 0,
        price_8ml: typeof product.price_8ml === 'number' ? product.price_8ml : undefined,
        price_12ml: typeof product.price_12ml === 'number' ? product.price_12ml : undefined,
        blind_buy_score: product.blind_buy_score,
      });

      // Fetch global decant inventory (shared pool across all perfumes)
      try {
        const invRes = await fetch(`${API_URL}/api/v1/decant-inventory/global`);
        if (invRes.ok) setDecantInventory(await invRes.json());
      } catch {}
    } catch (error: unknown) {
      if (error && typeof (error as { digest?: string }).digest === 'string' && (error as { digest: string }).digest === 'NEXT_NOT_FOUND') throw error;
      setLoadError('network');
      setFragrance(null);
      toast.error('Failed to load product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (size: string): number => {
    if (!fragrance) return 0;
    if (size === '3ml') return fragrance.price_3ml;
    if (size === '8ml') return fragrance.price_8ml || fragrance.price_3ml;
    if (size === '12ml') return fragrance.price_12ml || fragrance.price_3ml;
    return fragrance.price_3ml;
  };

  const getOriginalPrice = (size: string): number | undefined => {
    if (!fragrance) return undefined;
    if (size === '3ml') return fragrance.original_price_3ml;
    if (size === '8ml') return fragrance.original_price_8ml;
    if (size === '12ml') return fragrance.original_price_12ml;
    return undefined;
  };

  const addToCart = async () => {
    if (!fragrance) return;
    if (!isFragranceInStock(fragrance)) { toast.error('This product is out of stock'); return; }
    if (!user?.id) { window.dispatchEvent(new CustomEvent('openSignIn')); return; }

    const casesToAdd = [...selectedDecantCases];

    // 1. Add fragrance via context (handles optimistic UI + toast)
    try {
      const existing = cartItems.find(c => c.item_id === fragrance.id);
      if (existing?.id) await removeFromCart(existing.id);
      await contextAddToCart({
        item_id: fragrance.id || '', item_type: 'fragrance', item_name: fragrance.name,
        item_brand: fragrance.brand, price: getPrice(selectedSize), size: selectedSize,
        quantity: 1, image_url: fragrance.image_url,
      });
    } catch (error) { console.error('Error adding fragrance to cart:', error); }

    // 2. Add cases directly via API to avoid stale closure issues in contextAddToCart
    if (casesToAdd.length > 0) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = await getAccessToken();
      for (const dc of casesToAdd) {
        try {
          const res = await fetch(`${API_URL}/api/v1/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              item_id: crypto.randomUUID(),
              item_type: 'accessory',
              item_name: `${dc.label} ${dc.color_name}`,
              item_brand: 'ScentRev Accessories',
              price: dc.price,
              size: `${dc.size_ml}ml`,
              quantity: dc.quantity,
            }),
          });
          if (!res.ok) console.error('Failed to add case:', await res.text());
        } catch (error) { console.error('Error adding decant case:', error); }
      }
      // 3. Refresh cart from server so UI reflects all items.
      // Clear the throttle key so refreshCart actually fires (it is throttled to 60s by default,
      // but we just added items to the backend and need the UI to reflect them immediately).
      if (typeof window !== 'undefined') {
        localStorage.removeItem('scentrev_cart_last_fetch');
      }
      try { await refreshCart(); } catch {}
    }
  };

  const [quickBuyProcessing, setQuickBuyProcessing] = useState(false);

  const handleQuickBuy = async () => {
    if (!QUICK_BUY_ENABLED) return;
    if (!fragrance || !isFragranceInStock(fragrance)) return;
    if (!user?.id) {
      window.dispatchEvent(new CustomEvent('openSignIn'));
      return;
    }

    setQuickBuyProcessing(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in to continue');

      const price = sizeOptions.find(s => s.id === selectedSize)?.price || getPrice(selectedSize);
      const casesTotal = selectedDecantCases.reduce((sum, c) => sum + c.price * c.quantity, 0);
      const subtotal = price + casesTotal;
      const shippingAmount = subtotal >= 500 ? 0 : 50;

      // Build accessory items for decant cases
      const accessories = selectedDecantCases.map(c => ({
        item_type: 'accessory' as const,
        item_name: `${(c as any).size} Decant Case - ${(c as any).color}`,
        unit_price: c.price,
        quantity: c.quantity,
        size_code: (c as any).size,
      }));

      const data = await createQuickBuyOrder({
        perfume_id: fragrance.id || '',
        size_code: selectedSize,
        quantity: 1,
        unit_price: price,
        total_amount: subtotal + shippingAmount,
        shipping_amount: shippingAmount,
        accessories,
      }, token!);

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Failed to load payment gateway');

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'ScentRev',
        description: `${fragrance.name} - ${uiListedDecantLabel(selectedSize)}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: user.full_name || '',
          email: user.email || '',
          contact: (user as any).phone || '',
        },
        theme: { color: '#B85A3A' },
        handler: async (rzResponse: RazorpayResponse) => {
          try {
            const verifyToken = await getAccessToken();
            await verifyRazorpayPayment(
              { ...rzResponse, order_id: data.order_id },
              verifyToken || undefined,
            );
            toast.success('Payment successful!');
            router.push(`/order-success?order=${data.order_number}&pm=razorpay`);
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.');
          } finally {
            setQuickBuyProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setQuickBuyProcessing(false);
            getAccessToken().then((t) => {
              if (!t) return;
              abandonCheckout(
                { order_id: data.order_id, razorpay_order_id: data.razorpay_order_id },
                t,
              ).catch(() => {
                /* best-effort; order may already be finalized */
              });
            });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setQuickBuyProcessing(false);
        toast.error(response?.error?.description || 'Payment failed');
        getAccessToken().then(t => {
          if (t) fetch(`${API_URL}/api/v1/payments/mark-failed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({
              razorpay_order_id: data.razorpay_order_id,
              error_code: response?.error?.code,
              error_description: response?.error?.description,
            }),
          }).catch(() => {});
        });
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setQuickBuyProcessing(false);
    }
  };

  // Build size options
  const sizeOptions = (() => {
    const availSizes = (fragrance as any)?.available_sizes as Array<{
      size_code: string; price: number | null; original_price: number | null;
      label: string; display_order: number;
    }> | undefined;

    if (availSizes && availSizes.length > 0) {
      const items = availSizes
        .filter(s => s.price != null && s.price > 0)
        .map(s => {
          const numericMl = parseFloat(s.size_code);
          let autoLabel =
            numericMl > 20
              ? `Partial (${s.size_code})`
              : s.label && s.label !== s.size_code
                ? s.label
                : s.size_code;
          if (numericMl === 12) {
            autoLabel = String(autoLabel).replace(/\b12\s*ml\b/gi, '10ml');
          }
          const sprays = numericMl <= 2 ? `${Math.round(numericMl * 10)}-${Math.round(numericMl * 15)} sprays`
            : numericMl <= 5 ? `${Math.round(numericMl * 10)}-${Math.round(numericMl * 12)} sprays`
            : numericMl <= 15 ? `${Math.round(numericMl * 10)}-${Math.round(numericMl * 12)} sprays`
            : `${Math.round(numericMl * 8)}-${Math.round(numericMl * 10)} sprays`;
          const duration = numericMl <= 2 ? '3-7 days' : numericMl <= 5 ? '1-3 weeks' : numericMl <= 10 ? '1-2 months' : numericMl <= 15 ? '2-4 months' : '3-6+ months';
          return {
            id: s.size_code, label: autoLabel, price: s.price!, sprays,
            originalPrice: s.original_price && s.original_price > s.price! ? s.original_price : undefined,
            badge: (s as any).badge || undefined, duration, _ml: numericMl,
          };
        })
        .sort((a, b) => a._ml - b._ml);

      const hasBadges = items.some(i => i.badge);
      if (!hasBadges && items.length >= 2) {
        items[0].badge = 'Most Popular';
        let bestIdx = 0, bestRatio = Infinity;
        items.forEach((item, idx) => { const r = item.price / item._ml; if (r < bestRatio) { bestRatio = r; bestIdx = idx; } });
        if (bestIdx !== 0) items[bestIdx].badge = 'Best Value';
      }
      return items;
    }

    return [
      { id: '3ml', label: '3ml Decant', price: fragrance ? getPrice('3ml') : 0, originalPrice: fragrance ? getOriginalPrice('3ml') : undefined, badge: 'Most Popular', sprays: '~30-40 sprays', duration: '1-2 weeks', _ml: 3 },
      { id: '8ml', label: '8ml Travel Spray', price: fragrance ? getPrice('8ml') : 0, originalPrice: fragrance ? getOriginalPrice('8ml') : undefined, badge: 'Best Value', sprays: '~80-100 sprays', duration: '1-2 months', _ml: 8 },
      {
        id: '12ml',
        label: '10ml Gift Size',
        price: fragrance ? getPrice('12ml') : 0,
        originalPrice: fragrance ? getOriginalPrice('12ml') : undefined,
        sprays: '~100–120 sprays',
        duration: '2–3 months',
        _ml: 12,
      },
    ].filter(s => s.price > 0);
  })();

  const selectedFragrancePrice =
    sizeOptions.find((s) => s.id === selectedSize)?.price ?? (fragrance ? getPrice(selectedSize) : 0);
  const decantCasesTotalInr = useMemo(
    () => selectedDecantCases.reduce((sum, c) => sum + c.price * c.quantity, 0),
    [selectedDecantCases],
  );
  const decantCasePieceCount = useMemo(
    () => selectedDecantCases.reduce((sum, c) => sum + c.quantity, 0),
    [selectedDecantCases],
  );
  const bundleTotalInr = selectedFragrancePrice + decantCasesTotalInr;

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < fullStars ? 'fill-primary text-primary' : i === fullStars && hasHalf ? 'fill-primary/50 text-primary' : 'fill-neutral-200 text-neutral-200'}`} />
        ))}
        <span className="ml-2 text-base font-semibold text-neutral-900">{score}</span>
      </div>
    );
  };

  // ── Loading / Error states ──
  if (loading) {
    return <ProductDetailLoadingSkeleton />;
  }

  if (!fragrance) {
    return (
      <div className={`min-h-screen store-main-scroll-offset bg-white`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 text-center">
          <h1 className="text-2xl font-display text-neutral-900 mb-4">
            {loadError === 'network' ? "Couldn't load product" : 'Product not found'}
          </h1>
          <p className="text-neutral-600 mb-6">
            {loadError === 'network' ? 'Check your connection and try again.' : "This product doesn't exist or has been removed."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {loadError === 'network' && (
              <button onClick={() => loadProduct()} className="px-6 py-3 bg-[#B85A3A] text-white rounded-lg hover:bg-[#A04D2F] transition-colors">Retry</button>
            )}
            <Link href="/shop-all?category=best_seller" className="inline-flex px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">Browse products</Link>
          </div>
        </div>
      </div>
    );
  }

  const productInStock = isFragranceInStock(fragrance);
  const entryBadgeLabel = getEntrySourceBadgeLabel(
    searchParams.get('source') || searchParams.get('from')
  );

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#F5F2EE]">

      {/* ── Page hero strip matches catalog/quiz style ── */}
      <div className="relative overflow-hidden border-b border-[#E8DDD5] bg-[#F5F2EE] px-4 py-5 sm:px-6">
        <div className="pointer-events-none absolute -right-20 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.08)_0%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B85A3A]/20 bg-[#B85A3A]/8 px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B85A3A]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B85A3A]">
                    {fragrance.type || 'Fragrance'}
                  </span>
                </div>
                {fragrance.brand && (
                  <Link
                    href={`/collections/${fragrance.brand.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-xs text-[#8A7A72] transition-colors hover:text-[#B85A3A]"
                  >
                    {fragrance.brand}
                  </Link>
                )}
              </div>
            </div>
            {/* Quick stat pills */}
            <div className="hidden sm:flex items-center gap-2">
              {fragrance.sillage != null && (
                <div className="rounded-xl border border-[#E4D9D0] bg-white/70 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] text-[#8A7A72]">Sillage</p>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{fragrance.sillage}/10</p>
                </div>
              )}
              {fragrance.longevity_hours != null && (
                <div className="rounded-xl border border-[#E4D9D0] bg-white/70 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] text-[#8A7A72]">Longevity</p>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{Math.round(fragrance.longevity_hours)}h</p>
                </div>
              )}
              {fragrance.blind_buy_score != null && (
                <div className="rounded-xl border border-[#E4D9D0] bg-white/70 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] text-[#8A7A72]">Blind Buy</p>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{Number(fragrance.blind_buy_score).toFixed(1)}/5</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl min-w-0 px-4 pt-6 pb-6 md:px-6 lg:px-10">

        {/* ===== HERO 2-COL GRID ===== */}
        <div className="grid gap-6 md:grid-cols-2 md:items-stretch lg:gap-8">

          {/* ── LEFT COLUMN ── */}
          <motion.div
            className="flex h-full min-h-0 flex-col space-y-4"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {(() => {
              // Build combined image gallery: primary image first, then any additional from image_urls
              const allImages: string[] = [];
              if (fragrance.image_url) allImages.push(fragrance.image_url);
              const extras = (fragrance as any).image_urls || fragrance.images || [];
              for (const img of extras) {
                if (img && !allImages.includes(img)) allImages.push(img);
              }

              const catalogAssetVersion =
                (fragrance as { catalog_updated_at?: string | number | null }).catalog_updated_at ??
                null;

              const pdpProxiedSrc = (raw: string) =>
                getProxiedImageUrl(raw, {
                  knockOutWhiteMat: isProductPerfumeUrl(raw),
                  catalogAssetVersion,
                }) || raw;

              const heroRaw = allImages[selectedImageIndex] || allImages[0];
              const heroSrc = pdpProxiedSrc(heroRaw);
              const heroUsesMatKnockout = heroSrc.includes('mat=1');
              // Proxy URLs are already server-fetched skip Next.js /_next/image re-optimization
              // to avoid double-encoding and 500s on mobile.
              const isProxied = (src: string) => src.startsWith('/api/proxy-image');

              return (
                <>
                  {/* Main Image */}
                  <div
                    className="relative group isolate flex aspect-[4/5] max-h-[440px] sm:aspect-[16/11] sm:max-h-none flex-col items-center justify-end overflow-hidden rounded-3xl border border-[#E4D9D2]/90 pb-5 shadow-[0_24px_56px_-24px_rgba(24,16,12,0.22),inset_0_1px_0_rgba(255,255,255,0.55)]"
                  >
                    {/*
                      Studio cyclorama. Catalog shots use /api/proxy-image?mat=1 (knockout) when
                      allowlisted; otherwise multiply still blends flat white mats on the well.
                    */}
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        background:
                          'linear-gradient(165deg, #F3EAE2 0%, #EADFD6 45%, #E0D3C9 100%)',
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        background:
                          'radial-gradient(ellipse 100% 72% at 50% -8%, rgba(255,255,255,0.35) 0%, transparent 55%)',
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        background:
                          'radial-gradient(ellipse 85% 50% at 50% 108%, rgba(184,90,58,0.12) 0%, transparent 55%)',
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-0 opacity-[0.14]"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(92,72,62,0.04) 3px, rgba(92,72,62,0.04) 4px)',
                      }}
                      aria-hidden
                    />
                    {!productInStock && (
                      <div className="absolute top-0 left-0 right-0 z-10 bg-[#1A1A1A]/90 text-white text-center text-[11px] font-bold py-2 tracking-[0.14em] uppercase">Out of stock</div>
                    )}
                    {entryBadgeLabel && (
                      <div
                        className={`absolute left-3 z-20 ${productInStock ? 'top-3' : 'top-11'}`}
                        aria-hidden
                      >
                        <span className="inline-block text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#B85A3A] text-white">
                          {entryBadgeLabel}
                        </span>
                      </div>
                    )}
                    {allImages.length > 0 ? (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-end pb-0 pt-10 sm:pt-12"
                        >
                          {/*
                            Mat knockout: same single contact shadow as PLP / carousel cards (no
                            drop-shadow avoids double-shadow with the floor). JPEG mats: multiply
                            + deeper multi-layer floor (no drop-shadow; traces the white box).
                          */}
                          <div
                            ref={heroImageStageRef}
                            className="relative flex min-h-0 w-full flex-1 items-end justify-center px-4 sm:px-8"
                          >
                            <Image
                              src={heroSrc}
                              alt={fragrance.name}
                              width={520}
                              height={520}
                              className="h-full w-full max-h-[min(82vw,420px)] sm:max-h-[min(62vw,500px)] object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                              priority
                              loading="eager"
                              unoptimized={isProxied(heroSrc)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
                              style={heroUsesMatKnockout ? undefined : { mixBlendMode: 'multiply' }}
                              onError={(e) => {
                                const img = e.currentTarget;
                                // If mat knockout failed, retry without mat
                                const rawFallback = getProxiedImageUrl(heroRaw, { knockOutWhiteMat: false }) || heroRaw;
                                if (img.src !== rawFallback) {
                                  img.src = rawFallback;
                                } else {
                                  (img.parentElement as HTMLElement)?.classList.add('image-load-failed');
                                }
                              }}
                            />
                          </div>
                          {heroUsesMatKnockout ? (
                            <div
                              className="relative z-0 -mt-0.5 flex w-full flex-col items-center"
                              aria-hidden
                            >
                              {/* Aligned with ForYouStyleProductCard / PdpCarouselCard */}
                              <div
                                className="shrink-0"
                                style={{
                                  width: '55%',
                                  maxWidth: '240px',
                                  height: '10px',
                                  background:
                                    'radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, transparent 70%)',
                                  filter: 'blur(4px)',
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="relative z-0 -mt-1 flex w-full flex-col items-center"
                              aria-hidden
                            >
                              <div
                                className="h-[8px] w-[min(36%,180px)] rounded-[100%] bg-neutral-950/[0.32]"
                                style={{ filter: 'blur(6px)' }}
                              />
                              <div
                                className="-mt-0.5 h-[18px] w-[min(68%,300px)] rounded-[100%] bg-neutral-950/[0.22]"
                                style={{ filter: 'blur(14px)' }}
                              />
                              <div
                                className="-mt-1.5 h-[40px] w-[min(92%,440px)] rounded-[100%]"
                                style={{
                                  background:
                                    'radial-gradient(ellipse at center, rgba(18,12,10,0.38) 0%, rgba(30,22,18,0.16) 42%, rgba(48,36,28,0.06) 68%, transparent 82%)',
                                  filter: 'blur(20px)',
                                }}
                              />
                            </div>
                          )}
                        </motion.div>
                      </>
                    ) : (
                      <div className="w-40 h-60 bg-gradient-to-b from-neutral-200 to-neutral-100 rounded-xl shadow-xl" />
                    )}

                    {/* Navigation arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex(i => i === 0 ? allImages.length - 1 : i - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-5 h-5 text-neutral-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageIndex(i => i === allImages.length - 1 ? 0 : i + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-5 h-5 text-neutral-700" />
                        </button>

                        {/* Dot indicators */}
                        <div className="absolute bottom-5 left-1/2 z-[2] -translate-x-1/2 flex gap-1.5">
                          {allImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedImageIndex(i)}
                              className={`rounded-full transition-all ${selectedImageIndex === i ? 'w-5 h-2 bg-[#B85A3A]' : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'}`}
                              aria-label={`View image ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails show when 2+ images */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index ? 'border-[#B85A3A]' : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                          <Image
                            src={pdpProxiedSrc(image)}
                            alt={`view ${index + 1}`}
                            width={64}
                            height={64}
                            sizes="64px"
                            loading="eager"
                            unoptimized={isProxied(pdpProxiedSrc(image))}
                            className="h-full w-full bg-[#EFEAE4] object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fullscreen image zoom lightbox */}
                  {isImageZoomed && heroRaw && (
                    <div
                      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm"
                      onClick={() => setIsImageZoomed(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setIsImageZoomed(false)}
                        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                        aria-label="Close zoom"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <div
                        className="relative flex h-full w-full items-center justify-center p-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Image
                          src={pdpProxiedSrc(heroRaw)}
                          alt={fragrance?.name || 'Product image'}
                          width={800}
                          height={800}
                          sizes="100vw"
                          unoptimized={isProxied(pdpProxiedSrc(heroRaw))}
                          className="max-h-full max-w-full object-contain"
                          priority
                        />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Quick Highlights Card */}
            <motion.div
              className="space-y-2.5 rounded-xl bg-[#FDF6F3] p-3 shadow-[0_10px_24px_-16px_rgba(184,90,58,0.35)] ring-1 ring-[#B85A3A]/10"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">At a Glance</h3>
              </div>
              <div className="space-y-3">
                {/* 1) Gender lean full width first */}
                {fragrance.gender_score != null && (() => {
                  const gender = getGenderLeanPresentation(fragrance.gender_score);
                  return (
                    <motion.div whileHover={{ y: -1 }} className="rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Gender lean</p>
                        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">{gender.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">{gender.hint}</p>
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-neutral-400">
                          <span>Feminine</span>
                          <span>Unisex</span>
                          <span>Masculine</span>
                        </div>
                        <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-100 via-neutral-200 to-sky-100">
                          <div
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B85A3A] shadow-sm"
                            style={{ left: `${gender.markerPct}%` }}
                            aria-hidden
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-neutral-500">Marker shows where this scent sits from feminine to masculine (for reference only).</p>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* 2) Scent family, Sillage, Longevity one row */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(fragrance as any).scent_family && (
                    <motion.div whileHover={{ y: -1 }} className="min-w-0 rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Scent family</p>
                        <Flower2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-800">{(fragrance as any).scent_family}</p>
                    </motion.div>
                  )}
                  {fragrance.sillage != null && (
                    <motion.div whileHover={{ y: -1 }} className="min-w-0 rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Sillage</p>
                        <Wind className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-800">{fragrance.sillage}/10</p>
                    </motion.div>
                  )}
                  {fragrance.longevity_hours != null && (
                    <motion.div whileHover={{ y: -1 }} className="min-w-0 rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Longevity</p>
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-800">{Math.round(fragrance.longevity_hours)} hrs</p>
                    </motion.div>
                  )}
                </div>

                {fragrance.type && (
                  <motion.div whileHover={{ y: -1 }} className="rounded-lg border border-[#E9DBD2] bg-white/80 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500">Concentration</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-800">{fragrance.type}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Description truncated with See more */}
            {fragrance.description && (
              <DescriptionBlock text={fragrance.description} />
            )}

            {/* AI Who Is It For shown only after LLM responds */}
            {aiInsights?.who_is_it_for && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-xl border border-[#B85A3A]/25 bg-[#FFF5EF] p-3 shadow-[inset_0_0_0_1.5px_rgba(184,90,58,0.12)]"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0 text-[#B85A3A]" aria-hidden />
                  <span className="text-xs font-semibold text-[#B85A3A]">Who is this for?</span>
                  <span className="ml-auto rounded-full bg-[#B85A3A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI</span>
                </div>
                <p className="text-sm leading-relaxed text-[#3D2B1F]">{aiInsights.who_is_it_for}</p>
              </motion.div>
            )}

            {/* Fill remaining hero space with Layering CTA on desktop */}
            <div className="md:mt-auto">
              <LayeringLabBanner
                variant="compact"
                source="pdp"
                prefillFragranceId={fragrance.id}
              />
            </div>

          </motion.div>

          {/* ── RIGHT COLUMN ── */}
          <motion.div
            className="relative flex h-full min-h-0 flex-col justify-between gap-4 rounded-2xl border border-[#E4D9D0] bg-white p-4 shadow-[0_4px_24px_-8px_rgba(50,30,20,0.12)] md:p-5"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#B85A3A]/[0.07] blur-2xl" />
            <div className="flex min-h-0 flex-col gap-4">
            {/* Brand */}
            {fragrance.brand && (
              <Link
                href={`/collections/${fragrance.brand.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:text-primary"
              >
                {fragrance.brand}
              </Link>
            )}

            {/* Name */}
            <h1 className="font-display -mt-1 text-2xl leading-tight text-neutral-900 sm:text-3xl md:text-4xl">
              {fragrance.name}
            </h1>

            {/* Concentration */}
            {fragrance.type && (
              <p className="text-sm text-neutral-500 -mt-2">{fragrance.type}</p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-3">
              {renderStars(fragrance.blind_buy_score || 4.5)}
              <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600">
                Blind Buy Score&trade;
              </span>
            </div>

            {/* Compliment + compatibility pills fetched async, renders nothing until ready */}
            {fragrance.id && <PdpScorePills fragranceId={fragrance.id} />}

            {/* AI Blind Buy Report appears right under the score once LLM responds */}
            {aiInsights?.blind_buy_report && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-xl border border-[#B85A3A]/25 bg-[#FFF5EF] p-3 shadow-[inset_0_0_0_1.5px_rgba(184,90,58,0.12)]"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <ShieldQuestion className="h-3.5 w-3.5 shrink-0 text-[#B85A3A]" aria-hidden />
                  <span className="text-xs font-semibold text-[#B85A3A]">Should you blind buy?</span>
                  <span className="ml-auto rounded-full bg-[#B85A3A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI</span>
                </div>
                <p className="text-xs leading-relaxed text-[#3D2B1F]">{aiInsights.blind_buy_report}</p>
              </motion.div>
            )}

            {/* Price shows bundle total when decant cases are selected */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-3xl font-bold tabular-nums text-neutral-900">
                  ₹{formatInrDisplay(bundleTotalInr)}
                </span>
                {decantCasePieceCount > 0 ? (
                  <span className="rounded-full border border-[#EADFD7] bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                    {uiListedDecantLabel(selectedSize)} × 1 · ₹{formatInrDisplay(selectedFragrancePrice)} ·{' '}
                    {decantCasePieceCount} case{decantCasePieceCount === 1 ? '' : 's'} · ₹
                    {formatInrDisplay(decantCasesTotalInr)}
                  </span>
                ) : null}
                {(() => {
                  const op = sizeOptions.find((s) => s.id === selectedSize)?.originalPrice;
                  if (!op) return null;
                  const cp = selectedFragrancePrice;
                  const discountPercent = Math.max(0, Math.round(((op - cp) / op) * 100));
                  return (
                    <>
                      <span className="text-sm text-neutral-400 line-through">
                        ₹{formatInrDisplay(op)}
                      </span>
                      {discountPercent > 0 && (
                        <span className="rounded-full bg-[#EAF7EF] px-2 py-0.5 text-[11px] font-semibold text-[#3E7A57]">
                          Save {discountPercent}%
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              {decantCasePieceCount === 0 ? (
                <p className="text-xs text-neutral-500">
                  {uiListedDecantLabel(selectedSize)} decant · qty 1 · ₹{formatInrDisplay(selectedFragrancePrice)}
                </p>
              ) : null}
            </div>

            {fragrance && !IS_WAITLIST_PREVIEW && (
              <div className="rounded-xl border border-[#EADFD7] bg-[#FAF6F3]/90 p-2 shadow-[0_8px_24px_-20px_rgba(122,65,40,0.2)]">
                <RazorpayAffordabilityWidget
                  amountRupees={Math.round(selectedFragrancePrice)}
                  className="w-full min-h-[48px] [&_*]:max-w-full"
                />
              </div>
            )}

            {/* Size Selection card style with spray counts */}
            <div className="space-y-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Choose size</p>
                <p className="text-[11px] text-neutral-500">Includes spray estimate</p>
              </div>
              <div className="flex gap-3">
                {sizeOptions.map((size) => (
                  <motion.button
                    key={size.id}
                    type="button"
                    disabled={!productInStock}
                    onClick={() => setSelectedSize(size.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative flex-1 p-3 rounded-xl border-2 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSize === size.id
                        ? 'border-[#B85A3A] bg-[#FFF5EF] shadow-[0_10px_20px_-18px_rgba(184,90,58,0.7)]'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    {size.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#B85A3A] text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap">{size.badge}</span>
                    )}
                    {/* Vial icon */}
                    <div className="mx-auto mb-1.5 w-5 h-8 rounded-sm bg-neutral-200" style={{ background: selectedSize === size.id ? 'linear-gradient(180deg, #e8d5c4 0%, #B85A3A 100%)' : 'linear-gradient(180deg, #e5e5e5 0%, #c0c0c0 100%)' }} />
                    <p className="text-xs font-semibold text-neutral-800">{size.label}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{size.sprays}</p>
                  </motion.button>
                ))}
              </div>

              {/* Free shipping nudge storefront checkout only */}
              {!IS_WAITLIST_PREVIEW
                ? (() => {
                    const threshold = 999;
                    const remaining = rupeesUntilFreeShipping(threshold, bundleTotalInr);
                    if (remaining === 0) return null;
                    return (
                      <p className="rounded-lg border border-[#ECDDD3] bg-[#FFF7F1] py-1.5 text-center text-xs text-neutral-600">
                        Spend ₹{remaining} more for{' '}
                        <span className="font-semibold text-neutral-700">Free Shipping</span>{' '}
                        <Truck className="w-3.5 h-3.5 inline-block align-middle" />
                      </p>
                    );
                  })()
                : null}
            </div>

            {/* Decant Case Selector storefront only */}
            {!IS_WAITLIST_PREVIEW ? (
              <DecantCaseSelector inventory={decantInventory} onSelectionChange={setSelectedDecantCases} />
            ) : null}

            {/* Add to Cart + Buy Now */}
            {(() => {
              const fragrancePrice = selectedFragrancePrice;
              const casesTotal = decantCasesTotalInr;
              const totalCaseCount = decantCasePieceCount;
              const cartTotal = bundleTotalInr;
              return (
                <div className="space-y-2">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    {IS_WAITLIST_PREVIEW && productInStock ? (
                      <div className="flex min-h-[3.25rem] w-full flex-1 flex-col justify-center gap-2 rounded-xl border border-[#EADFD7] bg-[#FFF9F5] px-4 py-3 text-center text-sm text-neutral-700">
                        <p className="font-semibold text-[#1A1A1A]">Pilot preview</p>
                        <p className="text-xs leading-relaxed text-neutral-600">
                          Cart and checkout are on the full ScentRev site at launch. Join the waitlist from
                          the home page for early access.
                        </p>
                        <Link
                          href="/"
                          className="text-xs font-semibold text-[#B85A3A] underline underline-offset-2"
                        >
                          Back to home
                        </Link>
                      </div>
                    ) : productInStock ? (
                      <>
                        <motion.button
                          type="button"
                          onClick={addToCart}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.99 }}
                          className="flex min-h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2 overflow-visible rounded-xl bg-[#B85A3A] px-3.5 py-3 text-[11px] font-semibold text-white shadow-md transition-all hover:bg-[#A04D2F] hover:shadow-lg sm:px-4 sm:py-3.5 sm:text-sm"
                        >
                          <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="min-w-0 whitespace-nowrap text-center leading-tight">
                            Add to Cart
                          </span>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={handleQuickBuy}
                          disabled={!QUICK_BUY_ENABLED || quickBuyProcessing}
                          title={
                            !QUICK_BUY_ENABLED
                              ? 'Quick checkout is off add to cart and checkout from there'
                              : undefined
                          }
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.99 }}
                          aria-label={
                            !quickBuyProcessing && !QUICK_BUY_ENABLED
                              ? 'Buy now use Add to cart to checkout'
                              : undefined
                          }
                          className="flex min-h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2 overflow-visible rounded-xl bg-[#1A1A1A] px-3.5 py-3 text-[11px] font-semibold text-white shadow-md transition-all hover:bg-[#333] hover:shadow-lg disabled:opacity-50 sm:px-4 sm:py-3.5 sm:text-sm"
                        >
                          {quickBuyProcessing ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Zap className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          <span className="min-w-0 text-center leading-tight">
                            {quickBuyProcessing ? (
                              'Processing...'
                            ) : !QUICK_BUY_ENABLED ? (
                              <>
                                <span className="block sm:hidden">Buy now</span>
                                <span className="hidden sm:inline">Buy Now use cart</span>
                              </>
                            ) : (
                              <span className="whitespace-nowrap">{`Buy Now · ₹${formatInrDisplay(cartTotal)}`}</span>
                            )}
                          </span>
                        </motion.button>
                      </>
                    ) : (
                      <div
                        className="flex min-h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 py-3.5 text-sm font-semibold text-neutral-500"
                        role="status"
                        aria-live="polite"
                      >
                        <PackageX className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Out of stock
                      </div>
                    )}
                    <span className="shrink-0 self-center">
                      <WishlistButton item={{ id: fragrance.id || '', type: 'fragrance', name: fragrance.name }} size="lg" />
                    </span>
                  </div>
                </div>
              );
            })()}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#EADFD7]/80 pt-3">
            {/* Payment methods */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}
              className="rounded-xl border border-neutral-200/80 bg-white/85 p-2.5 shadow-[0_10px_20px_-20px_rgba(20,20,20,0.45)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Accepted payments</p>
                <span className="text-[10px] text-neutral-500">Secure checkout</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400">
                {['Visa', 'Mastercard', 'RuPay', 'UPI', 'GPay'].map(m => (
                  <motion.span
                    key={m}
                    whileHover={{ y: -1 }}
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 font-medium text-neutral-500"
                  >
                    {m}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Shipping + contact support cards (below accepted payments) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.16 }}
              className="grid gap-2 sm:grid-cols-2"
            >
              <div className="rounded-xl border border-[#F0EDE9] bg-[#FDF6F3] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">Free shipping above ₹599</p>
                </div>
                <p className="text-xs text-[#5C5A52]">Pan-India delivery via trusted courier partners. Standard delivery in 3-7 business days.</p>
              </div>
              <div className="rounded-xl border border-[#F0EDE9] bg-[#FDF6F3] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">7-day easy returns</p>
                </div>
                <p className="text-xs text-[#5C5A52]">Unopened items can be returned within 7 days. Refunds are processed in 3-5 business days.</p>
              </div>
              <div className="rounded-xl border border-[#F0EDE9] bg-[#FDF6F3] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">Same-day dispatch</p>
                </div>
                <p className="text-xs text-[#5C5A52]">Orders placed before 2 PM IST are dispatched the same day for faster delivery.</p>
              </div>
              <div className="rounded-xl border border-[#F0EDE9] bg-[#FDF6F3] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">Track every order</p>
                </div>
                <p className="text-xs text-[#5C5A52]">Get tracking updates end-to-end from dispatch to doorstep delivery.</p>
              </div>
              <div className="rounded-xl border border-[#F0EDE9] bg-[#FDF6F3] p-3 sm:col-span-2">
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#B85A3A]" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">Need help?</p>
                </div>
                <p className="text-xs text-[#5C5A52]">support@scentrev.com · +91 98765 43210 · Mon-Sat, 10am - 7pm IST.</p>
              </div>
            </motion.div>
            </div>

          </motion.div>
        </div>

        {/* ===== FULL-WIDTH SECTIONS ===== */}

        {/* Fragrance DNA full width, right after hero */}
        <motion.div
          className="mt-8"
          id="fragrance-dna"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <FragranceDNA
            notes={fragrance.notes}
            notes_top={fragrance.notes_top}
            notes_middle={fragrance.notes_middle}
            notes_base={fragrance.notes_base}
            seasons={fragrance.seasons}
            occasions={fragrance.occasions}
            main_accords={fragrance.main_accords}
            sillage={fragrance.sillage}
            longevity_hours={fragrance.longevity_hours}
            price_value={fragrance.price_value}
            gender_score={fragrance.gender_score}
            info_card={fragrance.info_card}
            pros={fragrance.pros}
            cons={fragrance.cons}
          />
        </motion.div>

        {/* AI Wear It When shown only after LLM responds */}
        {aiInsights?.wear_when && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-xl border border-[#B85A3A]/25 bg-[#FFF5EF] p-4 shadow-[inset_0_0_0_1.5px_rgba(184,90,58,0.12)]">
              <div className="mb-1.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#B85A3A]" aria-hidden />
                <span className="text-sm font-semibold text-[#B85A3A]">When to wear it</span>
                <span className="ml-auto rounded-full bg-[#B85A3A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI</span>
              </div>
              <p className="text-sm leading-relaxed text-[#3D2B1F]">{aiInsights.wear_when}</p>
            </div>
          </motion.div>
        )}

        {/* You May Also Like */}
        {fragrance?.id && (
          <div className="mt-16 mb-8">
            <YouMayAlsoLike fragranceId={fragrance.id} fragranceName={fragrance.name} />
          </div>
        )}

        {/* Subscribe CTA right after smells similar, when user is in discovery mode */}
        <div className="mb-16">
          <SubscriptionBanner variant="slim" />
        </div>

        {/* Blind Buy Section */}
        <div className="mb-16">
          <BlindBuySection score={fragrance?.blind_buy_score} />
        </div>

        {/* Hand Filled Section */}
        <div className="mb-16">
          <HandFilledSection />
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <ProductFAQ />
        </div>

        {/* Recently Viewed horizontal carousel (same card as Smells Similar / You May Also Like) */}
        {recentlyViewed.length > 0 && (
          <div className="mb-16">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-[#B85A3A]" />
              <h2 className="text-lg font-bold text-[#1A1A1A]">Recently Viewed</h2>
            </div>
            <PdpScrollCarousel label="recently-viewed">
              {recentlyViewed.map((item) => (
                <PdpCompactCard
                  key={item.id}
                  frag={recentlyViewedToCarouselFrag(item)}
                  hrefSearch="source=recent"
                />
              ))}
            </PdpScrollCarousel>
          </div>
        )}

        {/* AI Review Summary shown only after LLM responds, requires ≥3 reviews */}
        {reviewSummary?.summary && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-xl border border-[#B85A3A]/25 bg-[#FFF5EF] p-4 shadow-[inset_0_0_0_1.5px_rgba(184,90,58,0.12)]">
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 shrink-0 fill-[#B85A3A] text-[#B85A3A]" aria-hidden />
                <span className="text-sm font-semibold text-[#B85A3A]">What reviewers say</span>
                <span className="ml-auto rounded-full bg-[#B85A3A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI</span>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-[#3D2B1F]">{reviewSummary.summary}</p>
              {reviewSummary.themes && reviewSummary.themes.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {reviewSummary.themes.map((theme, i) => (
                    <li
                      key={i}
                      className="rounded-full border border-[#B85A3A]/20 bg-white px-3 py-1 text-xs font-medium text-[#3D2B1F]"
                    >
                      {theme}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}

        {/* Reviews */}
        <div className="mb-16">
          <ReviewSection fragranceId={fragrance.id || ''} fragranceName={fragrance.name} />
        </div>

        {/* Subscribe CTA shown after reviews when user has engaged with the product */}
        <div className="mb-16">
          <SubscriptionBanner variant="slim" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailLoadingSkeleton />}>
      <ProductDetailPageContent />
    </Suspense>
  );
}
