import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/catalog",
  "Fragrance catalog – pilot preview | ScentRev",
  "Browse the ScentRev pilot catalog — micro-samples and bottles with blind-buy context for Indian weather. Explore notes and scores.",
);

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
