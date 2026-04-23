import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";

import { getWaitlistSiteUrl } from "@/lib/waitlist/siteUrl";
import { AppProvider } from "@/contexts/AppContext";
import { PilotPreviewDataNotice } from "@/components/waitlist/PilotPreviewDataNotice";
import { WaitlistPreviewNav } from "@/components/waitlist/WaitlistPreviewNav";
import { WaitlistPostHogProvider } from "@/providers/WaitlistPostHogProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
});

const defaultTitle = "Buy Perfume Samples in India | ScentRev";
const defaultDescription =
  "Join ScentRev’s India waitlist: authentic micro-samples, full bottles, and a launch discount. Try scents that suit Indian weather before you buy.";

/** Default route: keywords first, under 60 chars for SERP; child routes set their own `title`. */
export const metadata: Metadata = {
  metadataBase: new URL(getWaitlistSiteUrl()),
  title: defaultTitle,
  description: defaultDescription,
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
    type: "website",
    locale: "en_IN",
    siteName: "ScentRev",
    title: defaultTitle,
    description: defaultDescription,
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ScentRev — perfume samples and fragrance discovery waitlist for India",
      },
    ],
  },
  facebook: {
    // Satisfies "Missing fb:app_id" warning in Facebook Debugger.
    // If you have a real App ID, set NEXT_PUBLIC_FACEBOOK_APP_ID in Vercel.
    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    /** Satisfies default browser probe; rewrites to `/icon` in `next.config.mjs`. */
    shortcut: [{ url: "/favicon.ico", type: "image/png" }],
    apple: [{ url: "/icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  /** Enables `env(safe-area-inset-*)` for notched Android / iOS devices. */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F4" },
    { media: "(prefers-color-scheme: dark)", color: "#14120F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${poppins.variable}`}>
      <body className="flex min-h-[100dvh] flex-col overflow-x-hidden antialiased font-sans">
        <AppProvider>
          <WaitlistPostHogProvider>
            <WaitlistPreviewNav />
            <PilotPreviewDataNotice />
            <main className="flex min-h-0 w-full flex-1 flex-col">{children}</main>
            <Toaster richColors position="top-center" />
          </WaitlistPostHogProvider>
        </AppProvider>
      </body>
    </html>
  );
}
