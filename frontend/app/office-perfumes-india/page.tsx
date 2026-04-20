import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonLdBuilders";
import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";
import { getWaitlistSiteUrl } from "@/lib/waitlist/siteUrl";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/office-perfumes-india",
  "Best Office Perfumes in India (Daily Wear) | ScentRev",
  "Find office-safe perfumes in India with balanced projection and all-day comfort. Try decants first, then buy full bottles with confidence.",
);

export default function OfficePerfumesIndiaPage() {
  const siteUrl = getWaitlistSiteUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Office Perfumes India", url: `${siteUrl}/office-perfumes-india` },
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 text-[#14120F] sm:px-6">
      <Script id="office-perfumes-breadcrumb-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">
          Workday fragrance fit
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Office Perfumes in India
        </h1>
        <p className="text-base leading-relaxed text-[#4A4540]">
          Office scents should stay refined in shared spaces. Choose smooth profiles,
          controlled projection, and weather-adapted performance for Indian cities.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[#E8DDD5] bg-white p-6">
        <h2 className="text-xl font-semibold">How to shortlist office-safe options</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#4A4540]">
          <li>Focus on versatile clean, aromatic, tea, and light woody profiles.</li>
          <li>Avoid over-sweet or high-projection styles for enclosed office setups.</li>
          <li>Use decants to test commute + desk + evening transition performance.</li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E8DDD5] bg-white p-6">
        <h2 className="text-xl font-semibold">Related pages</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/quiz">
            Perfume Finder Quiz India
          </Link>
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/catalog?occasion=office">
            Office-oriented catalog view
          </Link>
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/summer-perfumes-india">
            Summer Perfumes India
          </Link>
        </div>
      </section>
    </main>
  );
}
