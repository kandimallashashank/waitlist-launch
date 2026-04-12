import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/about",
  "Our story | ScentRev",
  "Why we started ScentRev: the same broken discovery we saw as collectors and builders. Real samples and honest tools for India.",
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
