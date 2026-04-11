import type { Metadata } from 'next';
import { isCanonicalFragranceProductId } from '@/lib/productRouteAliases';
import { clampWaitlistDescription } from '@/lib/seo/waitlistRouteMetadata';
import { fetchNoStore } from '@/lib/waitlist/httpNoStore';
import { getSupabaseAdmin } from '@/lib/waitlist/serverActions';
import { fetchPdpDetailFromSupabase } from '@/lib/waitlist/supabasePdpDetail';
import { isWaitlistOnlyCatalog } from '@/lib/waitlist/waitlistOnlyCatalog';
import ProductDetailPage from './ProductDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server-side metadata for product pages critical for SEO and social sharing.
 * Fetches minimal product data (name, brand, image, price) from the API.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  // Extract UUID from slug-style URLs (e.g. "dior-sauvage-abc123-def456...")
  const uuidMatch = id?.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  const productId = uuidMatch ? uuidMatch[1] : id;

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
  if (!uuidMatch && !isCanonicalFragranceProductId(productId)) {
    return fallback;
  }

  try {
    let data: Record<string, unknown>;

    if (isWaitlistOnlyCatalog()) {
      const supabase = getSupabaseAdmin();
      const row = await fetchPdpDetailFromSupabase(supabase, productId);
      if (!row) return fallback;
      data = row;
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/v1/fragrances/${productId}`, {
          headers: { Accept: 'application/json' },
          ...fetchNoStore,
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return fallback;
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        const supabase = getSupabaseAdmin();
        const row = await fetchPdpDetailFromSupabase(supabase, productId);
        if (!row) return fallback;
        data = row;
      }
    }
    if (!data?.name) return fallback;

    const name = data.name as string;
    const brand = (data.brand_name || data.brand || '') as string;
    const price3mlNum = Number(data.price_3ml);
    const price3ml =
      Number.isFinite(price3mlNum) && price3mlNum > 0
        ? `₹${Math.round(price3mlNum)}`
        : '';
    const image = (data.primary_image_url || data.image_url || '') as string;
    const score = data.blind_buy_score
      ? `${Number(data.blind_buy_score).toFixed(1)}/5`
      : '';
    const description = clampWaitlistDescription(
      [
        brand ? `${name} by ${brand}` : name,
        price3ml ? `from ${price3ml}` : '',
        score ? `Blind buy score: ${score}` : '',
        'Authentic micro-fragrance samples tested for Indian weather.',
      ]
        .filter(Boolean)
        .join(' · '),
    );

    return {
      title: `${name}${brand ? ` by ${brand}` : ''} | ScentRev`,
      description,
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
      },
      openGraph: {
        title: `${name}${brand ? ` by ${brand}` : ''}`,
        description,
        url: `/product/${productId}`,
        ...(image ? { images: [{ url: image, width: 600, height: 600, alt: name }] } : {}),
        type: 'website',
        siteName: 'ScentRev',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${name}${brand ? ` by ${brand}` : ''}`,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return fallback;
  }
}

export default function Page() {
  return <ProductDetailPage />;
}
