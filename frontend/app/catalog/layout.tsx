import type { Metadata } from "next";
import Script from "next/script";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonLdBuilders";
import { getWaitlistSiteUrl } from "@/lib/waitlist/siteUrl";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/catalog",
  "Perfume Decants & Samples India (3ml-10ml) | ScentRev Catalog",
  "Browse authentic perfume decants in India across 3ml, 5ml, 8ml, and 10ml sizes. Compare weather-fit picks, then buy full bottles with lower blind-buy risk.",
);

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = getWaitlistSiteUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Catalog", url: `${siteUrl}/catalog` },
  ]);

  return (
    <>
      <Script id="catalog-breadcrumb-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      {children}
    </>
  );
}
