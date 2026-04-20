import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import {
  buildBreadcrumbJsonLd,
  buildIndiaFaqJsonLd,
} from "@/lib/seo/jsonLdBuilders";
import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";
import { getWaitlistSiteUrl } from "@/lib/waitlist/siteUrl";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/perfume-samples-india",
  "Perfume Samples in India (From ₹199) | ScentRev Decants",
  "Buy authentic perfume samples in India from ₹199. Try 3ml, 5ml, 8ml, and 10ml decants before buying full bottles. India shipping + weather-fit picks.",
);

const FAQ_ITEMS = [
  {
    q: "Are ScentRev perfume samples authentic?",
    a: "Yes. We source authentic fragrances and decant them into travel-friendly sample sizes so you can test before buying full bottles.",
  },
  {
    q: "What sample sizes are available in India?",
    a: "ScentRev focuses on practical trial sizes like 3ml, 5ml, 8ml, and 10ml so you can evaluate longevity and projection across multiple wears.",
  },
  {
    q: "How do I decide what to sample first?",
    a: "Start with the ScentRev quiz to narrow choices by notes, mood, usage, and Indian weather fit, then explore your shortlists in catalog.",
  },
];

export default function PerfumeSamplesIndiaPage() {
  const siteUrl = getWaitlistSiteUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Perfume Samples India", url: `${siteUrl}/perfume-samples-india` },
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 text-[#14120F] sm:px-6">
      <Script id="perfume-samples-breadcrumb-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      <Script id="perfume-samples-faq-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(buildIndiaFaqJsonLd())}
      </Script>

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">
          India Fragrance Guide
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Perfume Samples in India: Try Before You Buy
        </h1>
        <p className="text-base leading-relaxed text-[#4A4540]">
          Sampling first is the lowest-risk way to discover fragrances in Indian weather.
          Explore small decants before committing to full-bottle pricing.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[#E8DDD5] bg-white p-6">
        <h2 className="text-xl font-semibold">Start with high-intent pathways</h2>
        <ul className="mt-4 space-y-2 text-sm text-[#4A4540]">
          <li>
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/catalog">
              Browse perfume samples and decants catalog in India
            </Link>
          </li>
          <li>
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/summer-perfumes-india">
              Find summer perfumes for Indian heat and humidity
            </Link>
          </li>
          <li>
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/office-perfumes-india">
              Discover office-safe perfumes for daily wear in India
            </Link>
          </li>
          <li>
            <Link className="text-[#B85A3A] underline underline-offset-4" href="/quiz">
              Take the perfume finder quiz for India
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="perfume-samples-faq">
        <h2 id="perfume-samples-faq" className="text-2xl font-semibold">
          Frequently asked questions
        </h2>
        {FAQ_ITEMS.map((item) => (
          <article key={item.q} className="rounded-xl border border-[#E8DDD5] bg-white p-5">
            <h3 className="font-semibold">{item.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4A4540]">{item.a}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
