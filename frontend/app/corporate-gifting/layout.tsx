import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/corporate-gifting",
  "Corporate fragrance gifting India | ScentRev",
  "Corporate gifting for India teams — custom discovery sets, decants, and branded fragrance touchpoints. Request a ScentRev program.",
);

export default function CorporateGiftingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
