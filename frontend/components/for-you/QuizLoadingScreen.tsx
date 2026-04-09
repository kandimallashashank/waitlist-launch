"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { BottlePlaceholderSVG } from "@/components/perfume/BottlePlaceholderSVG";
import { getProxiedImageUrl, isProductPerfumeUrl } from "@/lib/imageProxy";

const SUBTITLE_STEPS = [
  "Matching your note preferences…",
  "Checking seasonal suitability…",
  "Scoring occasion fit…",
  "Finalising your picks…",
];

export interface QuizLoadingPerfumeImage {
  brand: string;
  name?: string;
  url?: string | null;
}

const PRELOAD_IMAGES: QuizLoadingPerfumeImage[] = [
  { brand: "Dior", name: "Dior Homme Intense", url: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.jpg" },
  { brand: "Acqua di Parma", name: "Rosa Nobile Hair Mist", url: "https://fimgs.net/mdimg/perfume-thumbs/375x500.53650.jpg" },
  { brand: "Armaf", name: "Skin Couture Signature", url: "https://fimgs.net/mdimg/perfume-thumbs/375x500.27677.jpg" },
  { brand: "Afnan", name: "Afzal Abeer", url: "https://fimgs.net/mdimg/perfume-thumbs/375x500.27378.jpg" },
  { brand: "Ajmal", name: "Bling", url: "https://fimgs.net/mdimg/perfume-thumbs/375x500.16036.jpg" },
];

interface QuizLoadingScreenProps {
  perfumeImages: QuizLoadingPerfumeImage[];
  progress: number;
  isSlow?: boolean;
  title?: string;
}

function subtitleForProgress(progress: number): string {
  if (progress < 25) return SUBTITLE_STEPS[0];
  if (progress < 50) return SUBTITLE_STEPS[1];
  if (progress < 75) return SUBTITLE_STEPS[2];
  return SUBTITLE_STEPS[3];
}

export function QuizLoadingScreen({
  perfumeImages,
  progress,
  isSlow = false,
  title = "Analyzing your preferences",
}: QuizLoadingScreenProps) {
  const [imageIndex, setImageIndex] = useState(0);

  // Preload all PRELOAD_IMAGES via proxy as soon as component mounts
  useEffect(() => {
    PRELOAD_IMAGES.forEach(({ url }) => {
      if (!url) return;
      const src = getProxiedImageUrl(url, { knockOutWhiteMat: isProductPerfumeUrl(url) });
      if (!src) return;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }, []);

  const images = useMemo(() => {
    const apiImages = perfumeImages.filter((image) => image.brand || image.url);
    // Always show preload images first; switch to real recommendations once API responds
    return apiImages.length > 0 ? apiImages : PRELOAD_IMAGES;
  }, [perfumeImages]);

  useEffect(() => {
    if (images.length <= 1) { setImageIndex(0); return; }
    const id = window.setInterval(() => {
      setImageIndex((c) => (c + 1) % images.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [images]);

  useEffect(() => {
    if (images.length <= 1) return;
    const maxAhead = Math.min(2, images.length - 1);
    for (let offset = 1; offset <= maxAhead; offset += 1) {
      const idx = (imageIndex + offset) % images.length;
      const raw = images[idx]?.url;
      const href = getProxiedImageUrl(raw, { knockOutWhiteMat: isProductPerfumeUrl(raw) });
      if (!href) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = href;
    }
  }, [images, imageIndex]);

  const current = images[imageIndex] ?? PRELOAD_IMAGES[0];
  const subtitle = subtitleForProgress(progress);
  const rawUrl = current.url ?? undefined;
  const isProductImage = isProductPerfumeUrl(rawUrl);
  const imageSrc = getProxiedImageUrl(rawUrl, { knockOutWhiteMat: isProductImage });

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7F4]">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(340px,42%)_1fr]">

        {/* ─── Left panel: copy + progress ─── */}
        <section className="flex flex-col justify-between px-7 pb-10 pt-8 sm:px-10 lg:px-14 lg:pb-14 lg:pt-12">
          <div className="space-y-10">
            {/* Brand mark */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#B85A3A]" />
              <p className="text-[11px] font-bold tracking-[0.38em] text-[#B85A3A]">SCENTREV</p>
            </div>

            <div className="space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A09088]">
                Personalized Search
              </p>
              <div className="max-w-sm space-y-3">
                <h2 className="font-display text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl">
                  {title}
                </h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={subtitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="max-w-xs text-[15px] leading-relaxed text-[#5C5A52]"
                  >
                    {subtitle}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A6A5D]">
              <span>Matching</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[#EDE0D8]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#B85A3A] to-[#D4845E]"
                animate={{ width: `${Math.max(6, progress)}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
            <p className="text-sm leading-relaxed text-[#8A6A5D]">
              {isSlow
                ? "Taking a little longer building a sharper shortlist…"
                : "Finding the best matches for your profile."}
            </p>
          </div>
        </section>

        {/* ─── Right panel: bottle showcase ─── */}
        <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F5EBE3] via-[#EFE3D8] to-[#E8D8CC] px-6 py-10 sm:px-10 lg:px-14">
          {/* Atmospheric blurs */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#F5EBE3]/80 to-transparent" />
          <div className="pointer-events-none absolute -right-10 top-10 h-64 w-64 rounded-full bg-[#B85A3A]/12 blur-[70px]" />
          <div className="pointer-events-none absolute bottom-10 left-0 h-48 w-48 rounded-full bg-[#1A1A1A]/5 blur-[55px]" />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.brand}-${imageIndex}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center"
            >
              <div className="flex h-[min(68vh,28rem)] w-full items-center justify-center px-2 sm:px-4">
                {imageSrc ? (
                  isProductImage ? (
                    <div className="relative flex h-full w-full max-w-[280px] items-center justify-center sm:max-w-[300px]">
                      {/* Ground shadow: pulses in sync with float */}
                      <motion.div
                        className="pointer-events-none absolute bottom-[14%] left-1/2 z-0 h-10 w-[min(85%,240px)] -translate-x-1/2"
                        animate={{ scaleX: [1, 0.88, 1], opacity: [0.7, 0.4, 0.7] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          background: "radial-gradient(ellipse 100% 100% at 50% 0%, rgba(26,26,26,0.22) 0%, rgba(26,26,26,0.06) 48%, transparent 72%)",
                          filter: "blur(8px)",
                        }}
                        aria-hidden
                      />
                      <motion.img
                        src={imageSrc}
                        alt={current.name || current.brand}
                        decoding="async"
                        fetchPriority="high"
                        animate={{ y: [0, -18, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-[1] max-h-[min(60vh,24rem)] w-full object-contain drop-shadow-[0_20px_40px_rgba(26,26,26,0.16)]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <img
                      src={imageSrc}
                      alt={current.name || current.brand}
                      className="max-h-full max-w-full object-contain rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.1)]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )
                ) : (
                  <BottlePlaceholderSVG />
                )}
              </div>

              <motion.div
                className="mt-6 space-y-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.36em] text-[#8A6A5D]">
                  {current.brand}
                </p>
                {current.name && (
                  <p className="text-sm text-[#1A1A1A]">{current.name}</p>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
