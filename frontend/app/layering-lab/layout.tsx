import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/layering-lab",
  "Layering Lab – fragrance combos | ScentRev",
  "Experiment with scent layering in the ScentRev pilot: save combos, see what works in heat and humidity, then shop samples.",
);

export default function LayeringLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
