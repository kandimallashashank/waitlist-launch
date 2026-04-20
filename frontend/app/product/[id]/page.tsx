import type { Metadata } from 'next';
import Script from 'next/script';
import { isCanonicalFragranceProductId } from '@/lib/productRouteAliases';
import {
  clampWaitlistDescription,
  waitlistHreflangLanguages,
} from '@/lib/seo/waitlistRouteMetadata';
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
} from '@/lib/seo/jsonLdBuilders';
import { fetchNoStore } from '@/lib/waitlist/httpNoStore';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { getWaitlistSiteUrl } from '@/lib/waitlist/siteUrl';
import { fetchPdpDetailFromSupabase } from '@/lib/waitlist/supabasePdpDetail';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';
import ProductDetailPage from './ProductDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

interface ProductSeoData {
  productId: string;
  name: string;
  brand: string;
  description: string;
  imageUrl: string | null;
  price3ml: number | null;
  inStock: boolean;
  blindBuyScore: number | null;
  reviewCount: number | null;
}

/**
 * Resolve incoming route params to canonical product UUID.
 *
 * Args:
 *   routeId: Route param segment from `/product/[id]`.
 *
 * Returns:
 *   Canonical UUID when valid, otherwise null.
 */
function resolveProductId(routeId: string): string | null {
  const uuidMatch = routeId?.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  const productId = uuidMatch ? uuidMatch[1] : routeId;
  if (!productId) return null;
  if (!uuidMatch && !isCanonicalFragranceProductId(productId)) {
    return null;
  }
  return productId;
}

/**
 * Load PDP fields needed for metadata and structured data.
 *
 * Args:
 *   productId: Canonical product UUID.
 *
 * Returns:
 *   Normalized SEO payload or null when unavailable.
 */
async function fetchProductSeoData(productId: string): Promise<ProductSeoData | null> {
  let data: Record<string, unknown>;

  if (isWaitlistOnlyCatalog()) {
    const supabase = getSupabaseAdmin();
    const row = await fetchPdpDetailFromSupabase(supabase, productId);
    if (!row) return null;
    data = row;
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/v1/fragrances/${productId}`, {
        headers: { Accept: 'application/json' },
        ...fetchNoStore,
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      const supabase = getSupabaseAdmin();
      const row = await fetchPdpDetailFromSupabase(supabase, productId);
      if (!row) return null;
      data = row;
    }
  }

  const rawName = data.name;
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return null;
  }

  const rawBrand = data.brand_name ?? data.brand;
  const brand = typeof rawBrand === 'string' ? rawBrand : '';
  const rawImage = data.primary_image_url ?? data.image_url;
  const imageUrl = typeof rawImage === 'string' && rawImage.trim() ? rawImage : null;
  const rawPrice = Number(data.price_3ml);
  const price3ml =
    Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : null;
  const inStock = data.in_stock !== false;
  const rawBlindBuyScore = Number(data.blind_buy_score);
  const blindBuyScore =
    Number.isFinite(rawBlindBuyScore) && rawBlindBuyScore > 0
      ? Number(rawBlindBuyScore.toFixed(1))
      : null;
  const rawReviewCount = Number(data.review_count ?? data.rating_count ?? data.votes_count);
  const reviewCount =
    Number.isFinite(rawReviewCount) && rawReviewCount > 0
      ? Math.floor(rawReviewCount)
      : null;

  const priceDisplay = price3ml ? `₹${price3ml}` : '';
  const scoreDisplay = blindBuyScore ? `${blindBuyScore}/5` : '';
  const description = clampWaitlistDescription(
    [
      brand ? `${rawName} by ${brand}` : rawName,
      priceDisplay ? `from ${priceDisplay}` : '',
      scoreDisplay ? `Blind buy score: ${scoreDisplay}` : '',
      'Authentic micro-fragrance samples tested for Indian weather.',
    ]
      .filter(Boolean)
      .join(' · '),
  );

  return {
    productId,
    name: rawName,
    brand,
    description,
    imageUrl,
    price3ml,
    inStock,
    blindBuyScore,
    reviewCount,
  };
}

/**
 * Server-side metadata for product pages critical for SEO and social sharing.
 * Fetches minimal product data (name, brand, image, price) from the API.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const productId = resolveProductId(id);

  const fallback: Metadata = {
    title: 'Fragrance | ScentRev',
    description: 'Discover authentic fragrances tested for Indian weather.',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };

  if (!productId) return fallback;

  try {
    const seoData = await fetchProductSeoData(productId);
    if (!seoData) return fallback;

    return {
      title: `${seoData.name}${seoData.brand ? ` by ${seoData.brand}` : ''} | ScentRev`,
      description: seoData.description,
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      },
      alternates: {
        canonical: `/product/${productId}`,
        languages: waitlistHreflangLanguages(`/product/${productId}`),
      },
      openGraph: {
        title: `${seoData.name}${seoData.brand ? ` by ${seoData.brand}` : ''}`,
        description: seoData.description,
        url: `/product/${productId}`,
        ...(seoData.imageUrl
          ? {
              images: [
                {
                  url: seoData.imageUrl,
                  width: 600,
                  height: 600,
                  alt: seoData.name,
                },
              ],
            }
          : {}),
        type: 'website',
        siteName: 'ScentRev',
        locale: 'en_IN',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${seoData.name}${seoData.brand ? ` by ${seoData.brand}` : ''}`,
        description: seoData.description,
        site: '@scentrev',
        creator: '@scentrev',
        ...(seoData.imageUrl ? { images: [seoData.imageUrl] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default async function Page({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = resolveProductId(id);
  const siteUrl = getWaitlistSiteUrl();
  const productUrl = `${siteUrl}/product/${productId ?? id}`;
  const seoData = productId ? await fetchProductSeoData(productId) : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: `${siteUrl}/` },
    { name: 'Catalog', url: `${siteUrl}/catalog` },
    {
      name: seoData?.name ?? 'Fragrance',
      url: productUrl,
    },
  ]);

  const productJsonLd =
    seoData != null
      ? buildProductJsonLd({
          productUrl,
          name: seoData.name,
          description: seoData.description,
          imageUrl: seoData.imageUrl,
          brandName: seoData.brand || null,
          sku: seoData.productId,
          currency: 'INR',
          price: seoData.price3ml,
          inStock: seoData.inStock,
          ratingValue: seoData.blindBuyScore,
          ratingCount: seoData.reviewCount,
        })
      : null;

  return (
    <>
      <Script id="product-breadcrumb-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      {productJsonLd ? (
        <Script id="product-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(productJsonLd)}
        </Script>
      ) : null}
      <ProductDetailPage />
    </>
  );
}
