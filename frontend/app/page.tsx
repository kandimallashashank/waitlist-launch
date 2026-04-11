import type { Metadata } from "next";

import WaitlistHomeClient from "./WaitlistHomeClient";

const title = "Perfume samples & discovery waitlist – ScentRev";
const description =
  "Join ScentRev’s India waitlist: authentic micro-samples, full bottles, and a launch discount. Try scents that suit Indian weather before you buy.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
    languages: {
      "en-IN": "/",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

/**
 * Waitlist landing: metadata is defined here (server) so ``<head>`` includes
 * canonical, robots, and Open Graph tags; UI lives in the client component.
 */
export default function WaitlistHomePage() {
  return <WaitlistHomeClient />;
}
