import { Layers } from "lucide-react";

/**
 * Layering Lab route loading shell (waitlist preview; avoids storefront layout deps).
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-white px-6 pt-24 pb-16">
      <Layers className="mb-4 h-10 w-10 animate-pulse text-[#B85A3A]/40" aria-hidden />
      <p className="text-sm text-[#5C5A52]">Loading Layering Lab…</p>
    </div>
  );
}
