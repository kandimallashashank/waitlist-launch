import type { Metadata } from "next";
import Link from "next/link";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/quiz",
  "Perfume Quiz India (3-Minute Scent Finder) | ScentRev",
  "Take a 3-minute perfume quiz for India and get personalised fragrance matches by notes, mood, and climate fit. Fast shortlist, lower blind-buy risk.",
);

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section className="border-t border-[#E8DDD5] bg-[#F8F3EE] px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B85A3A]">
            India fragrance intents
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#14120F]">
            Explore detailed perfume guides for India
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/perfume-samples-india" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#B85A3A]">
              Perfume samples in India
            </Link>
            <Link href="/summer-perfumes-india" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#B85A3A]">
              Summer perfumes India
            </Link>
            <Link href="/office-perfumes-india" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#B85A3A]">
              Office perfumes India
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
