import type { Metadata } from "next";

import { SubscribePilotPage } from "@/components/subscribe/SubscribePilotPage";
import { WaitlistGate } from "@/components/waitlist/WaitlistGate";
import { buildWaitlistRouteMetadata } from "@/lib/seo/waitlistRouteMetadata";

export const metadata: Metadata = buildWaitlistRouteMetadata(
  "/subscribe",
  "Scent Box pilot – subscribe | ScentRev",
  "Join the ScentRev Scent Box pilot — curated samples each cycle, member perks, and India-first delivery. See plans and subscribe.",
);

export default function WaitlistSubscribePage() {
  return (
    <WaitlistGate featureName="Scent Box">
      <SubscribePilotPage />
    </WaitlistGate>
  );
}
