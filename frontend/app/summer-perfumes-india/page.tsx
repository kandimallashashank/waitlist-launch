import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonLdBuilders";
import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";
import { getWaitlistSiteUrl } from "@/lib/waitlist/siteUrl";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/summer-perfumes-india",
  "Best Summer Perfumes for India (Heat-Proof Picks) | ScentRev",
  "Discover summer perfumes for Indian heat and humidity. Compare fresh, citrus, aquatic, and aromatic decants before full-bottle purchase.",
);

export default function SummerPerfumesIndiaPage() {
  const siteUrl = getWaitlistSiteUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Summer Perfumes India", url: `${siteUrl}/summer-perfumes-india` },
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 text-[#14120F] sm:px-6">
      <Script id="summer-perfumes-breadcrumb-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">
          Climate-first picks
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Summer Perfumes for India
        </h1>
        <p className="text-base leading-relaxed text-[#4A4540]">
          Indian summers reward lighter structures and clean profiles. Prioritize
          freshness, controlled projection, and longevity that survives heat.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[#E8DDD5] bg-white p-6">
        <h2 className="text-xl font-semibold">Recommended exploration flow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#4A4540]">
          <li>
            Start with{" "}
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/quiz">
              the India perfume quiz
            </Link>{" "}
            to identify weather-compatible scent families.
          </li>
          <li>
            Compare options in{" "}
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/catalog?season=summer">
              summer-filtered catalog results
            </Link>
            .
          </li>
          <li>
            Test shortlist decants before deciding on full bottles.
          </li>
        </ol>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E8DDD5] bg-white p-6">
        <h2 className="text-xl font-semibold">Related India fragrance guides</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/perfume-samples-india">
            Perfume Samples in India
          </Link>
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/office-perfumes-india">
            Office Perfumes India
          </Link>
          <Link className="rounded-lg bg-[#FFF3ED] px-3 py-2 text-sm font-medium text-[#B85A3A]" href="/catalog">
            Full Catalog
          </Link>
        </div>
      </section>
    </main>
  );
}
