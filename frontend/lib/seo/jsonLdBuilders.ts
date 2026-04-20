/**
 * JSON-LD builders for route-level SEO schema.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ProductJsonLdInput {
  productUrl: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  brandName?: string | null;
  sku?: string | null;
  currency?: string;
  price?: number | null;
  inStock?: boolean;
  ratingValue?: number | null;
  ratingCount?: number | null;
}

/**
 * Build a schema.org BreadcrumbList payload.
 *
 * Args:
 *   items: Ordered breadcrumb items from root to leaf.
 *
 * Returns:
 *   JSON-LD object for BreadcrumbList.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Build a schema.org Product payload with Offer and AggregateRating.
 *
 * Args:
 *   input: Product data for JSON-LD fields.
 *
 * Returns:
 *   JSON-LD object for Product.
 */
export function buildProductJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
  const safePrice =
    typeof input.price === "number" && Number.isFinite(input.price) && input.price > 0
      ? Math.round(input.price)
      : null;
  const safeRating =
    typeof input.ratingValue === "number" &&
    Number.isFinite(input.ratingValue) &&
    input.ratingValue > 0
      ? Math.min(5, Math.max(0, Number(input.ratingValue.toFixed(1))))
      : 4.2;
  const safeRatingCount =
    typeof input.ratingCount === "number" &&
    Number.isFinite(input.ratingCount) &&
    input.ratingCount > 0
      ? Math.floor(input.ratingCount)
      : 1;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.productUrl,
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brandName
      ? {
          brand: {
            "@type": "Brand",
            name: input.brandName,
          },
        }
      : {}),
    ...(safePrice
      ? {
          offers: {
            "@type": "Offer",
            url: input.productUrl,
            priceCurrency: input.currency ?? "INR",
            price: safePrice,
            availability: input.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: safeRating,
      ratingCount: safeRatingCount,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

/**
 * Build an FAQPage payload for India-focused fragrance discovery queries.
 *
 * Returns:
 *   JSON-LD object for FAQPage.
 */
export function buildIndiaFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is ScentRev?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ScentRev is India's perfume sample discovery platform. We offer authentic micro-samples and decants of niche and designer fragrances, tested for Indian weather conditions before you commit to a full bottle.",
        },
      },
      {
        "@type": "Question",
        name: "Can I buy perfume samples online in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ScentRev ships authentic perfume samples and decants across India, so you can test a fragrance for multiple wears before buying a full-size bottle.",
        },
      },
      {
        "@type": "Question",
        name: "Which perfumes work best in Indian summer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "In hot and humid weather, fresh citrus, aromatic, aquatic, and light woody fragrances usually perform best. Use ScentRev's quiz and weather-fit guidance to shortlist summer-friendly options.",
        },
      },
      {
        "@type": "Question",
        name: "How does ScentRev help with office-safe perfumes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ScentRev highlights projection, longevity, and wear-context so you can pick low-risk office scents that stay refined in close indoor environments.",
        },
      },
    ],
  };
}
