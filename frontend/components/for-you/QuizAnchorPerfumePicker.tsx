"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import type { QuizCatalogPerfume } from "@/lib/quizAnchorDerivation";

const MAX_PICK = 5;

interface QuizAnchorPerfumePickerProps {
  catalog: QuizCatalogPerfume[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

/**
 * Searchable grid to pick 1–5 anchor perfumes for cold-start preference inference.
 */
export function QuizAnchorPerfumePicker({
  catalog,
  selectedIds,
  onToggle,
}: QuizAnchorPerfumePickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand_name || "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }, [catalog, query]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-[#5C5A52]">
        Choose bottles you&apos;ve tried, own, or remember loving we&apos;ll map notes and families
        for you. Optional: skip and pick manually on the next screens.
      </p>

      {/* Search bar same horizontal band as title (max-w-2xl) so it lines up with centered heading */}
      <div className="relative mx-auto w-full max-w-2xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09088]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by brand or name…"
          className="w-full rounded-2xl border border-[#E8D4C4] bg-white py-3 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none ring-0 placeholder:text-[#A09088] focus:border-[#B85A3A] shadow-sm transition-all focus:shadow-md"
          aria-label="Search perfumes"
        />
      </div>

      {/* Selection counter + total */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-1">
        <p className="text-xs text-[#8A6A5D]">
          {filtered.length < catalog.length
            ? `${filtered.length} of ${catalog.length} perfumes`
            : `${catalog.length} perfumes`}
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B85A3A]">
          {selectedIds.length}/{MAX_PICK} picked
        </p>
      </div>

      {/* Grid fewer columns on small screens so tiles are wider and less “tall narrow” */}
      <div className="max-h-[min(52vh,440px)] w-full overflow-y-auto overflow-x-hidden pr-1 scrollbar-hide">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const id = String(p.id);
            const selected = selectedIds.includes(id);
            const atCap = selectedIds.length >= MAX_PICK && !selected;
            const rawImg = p.primary_image_url || undefined;
            const img = getProxiedImageUrl(rawImg) || rawImg;

            return (
              <button
                key={id}
                type="button"
                disabled={atCap}
                onClick={() => onToggle(id)}
                className={cn(
                  "flex flex-col overflow-hidden rounded-[18px] text-left transition-all duration-200",
                  selected
                    ? "ring-[3px] ring-[#B85A3A] shadow-[0_8px_24px_rgba(184,90,58,0.18)]"
                    : "ring-1 ring-[#E8D4C4] bg-white shadow-sm hover:shadow-md hover:ring-[#D4B8A4] enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98]",
                  atCap && "cursor-not-allowed opacity-40",
                )}
              >
                {/* Warm gradient bottle well mixBlendMode multiply removes white backgrounds */}
                <div className="relative aspect-[5/6] w-full overflow-hidden bg-gradient-to-br from-[#FCF4EF] via-[#FAF4EF] to-[#F1E3DA]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain p-2 drop-shadow-[0_6px_12px_rgba(0,0,0,0.08)]"
                      style={{ mixBlendMode: "multiply" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg viewBox="0 0 60 120" className="h-16 w-auto opacity-20" fill="none">
                        <rect x="22" y="0" width="16" height="10" rx="3" fill="#C4A48E" />
                        <rect x="24" y="10" width="12" height="14" rx="2" fill="#D8C4B4" />
                        <path d="M24 24 C24 24,12 32,12 42 L12 104 C12 112 18 118 26 118 L34 118 C42 118 48 112 48 104 L48 42 C48 32 36 24 36 24 Z" fill="#E8D4C4" />
                      </svg>
                    </div>
                  )}
                  {/* Selection badge with index */}
                  {selected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#B85A3A] text-xs font-bold text-white shadow-lg"
                    >
                      {selectedIds.indexOf(id) + 1}
                    </motion.span>
                  )}
                </div>

                {/* Text footer */}
                <div className="border-t border-[#F0E8E2] bg-white px-2 py-2">
                  <p className="line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A6A5D]">
                    {p.brand_name || "-"}
                  </p>
                  <p className="line-clamp-1 text-[10px] font-medium leading-snug text-[#1A1A1A]">
                    {p.name || "-"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8A6A5D]">No matches. Try another search.</p>
        )}
      </div>
    </div>
  );
}
