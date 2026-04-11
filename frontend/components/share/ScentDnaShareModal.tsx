/**
 * Modal: preview DNA card, download PNG (1080×1920 via pixelRatio), native share, copy link.
 */

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Download, Link2, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { ScentDnaShareCard } from "@/components/share/ScentDnaShareCard";
import type { ScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";
import { cn } from "@/lib/utils";

export interface ScentDnaShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ScentDnaCardData;
  variant: "quiz" | "gift";
  displayName: string;
}

/**
 * Full-screen overlay to preview the DNA story card, download PNG, native share, or copy link.
 */
export function ScentDnaShareModal({
  open,
  onOpenChange,
  data,
  variant,
  displayName,
}: ScentDnaShareModalProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sharePageUrl = React.useMemo(() => {
    if (typeof window === "undefined") {
      return "https://scentrev.com/share/scent-dna";
    }
    return `${window.location.origin}/share/scent-dna`;
  }, []);

  const downloadPng = React.useCallback(async () => {
    const node = cardRef.current;
    if (!node) {
      toast.error("Card not ready. Try again.");
      return;
    }
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#FDF8F6",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `scentrev-fragrance-dna-${variant}.png`;
      a.click();
      toast.success("Saved image. Add it to Instagram as a story.");
    } catch (e) {
      console.error(e);
      toast.error("Could not create image. Try another browser.");
    } finally {
      setBusy(false);
    }
  }, [variant]);

  const copyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sharePageUrl);
      toast.success("Link copied. Paste in your bio or DM.");
    } catch {
      toast.error("Could not copy link.");
    }
  }, [sharePageUrl]);

  const nativeShare = React.useCallback(async () => {
    const node = cardRef.current;
    if (!node) {
      toast.error("Card not ready.");
      return;
    }
    setBusy(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#FDF8F6",
      });
      if (!blob) {
        toast.error("Could not build image.");
        return;
      }
      const file = new File([blob], "scentrev-fragrance-dna.png", {
        type: "image/png",
      });
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          files: [file],
          title: "My fragrance DNA",
          text: "I mapped my scent profile on ScentRev.",
          url: sharePageUrl,
        });
      } else {
        await downloadPng();
        toast.message("Downloaded image", {
          description: "Open Instagram and upload from your photos.",
        });
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        return;
      }
      console.error(e);
      await downloadPng();
    } finally {
      setBusy(false);
    }
  }, [downloadPng, sharePageUrl]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-end sm:justify-center bg-[#1A1A1A]/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scent-dna-share-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1A1A1A] shadow-md transition hover:bg-white"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="mb-4 max-h-[min(72vh,640px)] w-full max-w-sm overflow-auto rounded-3xl border border-[#E8D4C4] bg-[#F5F2EE] p-4 shadow-2xl sm:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="scent-dna-share-title"
          className="mb-1 text-center font-display text-lg font-bold text-[#1A1A1A]"
        >
          Share your fragrance DNA
        </h2>
        <p className="mb-4 text-center text-xs leading-relaxed text-[#6B6560]">
          Save the card, then post it to stories or your feed. Layout matches your
          ScentRev profile DNA card (2:3).
        </p>

        <div className="flex justify-center">
          <div
            className={cn(
              "origin-top scale-[0.82] sm:scale-90",
              busy && "pointer-events-none opacity-80",
            )}
          >
            <ScentDnaShareCard
              ref={cardRef}
              data={data}
              variant={variant}
              displayName={displayName}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void nativeShare()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#B85A3A] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#a14f33] disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadPng()}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E8D4C4] bg-white px-4 py-3 text-sm font-semibold text-[#1A1A1A] shadow-sm transition hover:border-[#D4B8A4] disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E8D4C4] bg-white/80 px-4 py-3 text-sm font-semibold text-[#5C3A28] shadow-sm transition hover:border-[#D4B8A4]"
          >
            <Link2 className="h-4 w-4" aria-hidden />
            Copy link
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
