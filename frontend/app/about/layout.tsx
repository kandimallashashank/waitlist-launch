import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/about",
  "Our story – ScentRev waitlist pilot",
  "Why ScentRev exists for India — honest sampling, climate-aware picks, and a waitlist-first pilot. Read our story.",
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
