import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/gift",
  "Gift finder – fragrance gifts for India | ScentRev",
  "Find a thoughtful fragrance gift on the ScentRev pilot — quick survey, curated picks, and India-ready delivery story.",
);

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
