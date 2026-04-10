import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";

import { AppProvider } from "@/contexts/AppContext";
import { PilotPreviewDataNotice } from "@/components/waitlist/PilotPreviewDataNotice";
import { WaitlistPreviewNav } from "@/components/waitlist/WaitlistPreviewNav";
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

export const metadata: Metadata = {
  title: "ScentRev | Waitlist",
  description:
    "Join the ScentRev waitlist: micro samples, full bottles, and your launch discount.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased font-sans overflow-x-hidden">
        <AppProvider>
          <WaitlistPreviewNav />
          <PilotPreviewDataNotice />
          {children}
          <Toaster richColors position="top-center" />
        </AppProvider>
      </body>
    </html>
  );
}
