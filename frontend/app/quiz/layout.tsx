import type { Metadata } from "next";

import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/quiz",
  "Scent quiz – map your fragrance DNA | ScentRev",
  "Take the ScentRev pilot quiz — notes, seasons, and blind-buy fit for India. Get a shareable scent profile when you finish.",
);

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
