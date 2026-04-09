'use client';

/**
 * Curated layering combos: compact teaser grid; tap opens a modal with blend “report” and cart actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThumbsUp, ShoppingCart, Check, Loader2, Sparkles, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/AppContext';
import { Cart } from '@/api/base44Client';
import { createProductUrl } from '@/utils';
import { uiListedDecantLabel } from '@/lib/fragranceCardPricing';

const SIZE_OPTIONS = [
  { label: '3ml' as const, key: 'price_3ml' as const },
  { label: '8ml' as const, key: 'price_8ml' as const },
  { label: '12ml' as const, key: 'price_12ml' as const },
];

interface CuratedFragrance {
  id: string;
  name: string;
  brand_name: string;
  primary_image_url?: string;
  price_3ml?: number;
  price_8ml?: number;
  price_12ml?: number;
}

interface CuratedCombo {
  id: string;
  title: string;
  subtitle?: string | null;
  harmony_score: number;
  summary: string;
  applause_count: number;
  dominant_accords: { accord: string }[];
  fragrances: CuratedFragrance[];
}

function pickDefaultSize(f: CuratedFragrance): (typeof SIZE_OPTIONS)[number]['label'] | null {
  if (f.price_3ml != null) return '3ml';
  if (f.price_8ml != null) return '8ml';
  if (f.price_12ml != null) return '12ml';
  return null;
}

function defaultSizePrice(f: CuratedFragrance): { size: string; price: number } | null {
  const size = pickDefaultSize(f);
  if (!size) return null;
  const opt = SIZE_OPTIONS.find((s) => s.label === size);
  if (!opt || f[opt.key] == null) return null;
  return { size, price: Number(f[opt.key]) };
}

function harmonyTone(score: number): string {
  if (score >= 65) return 'text-emerald-700 bg-emerald-50';
  if (score >= 45) return 'text-amber-800 bg-amber-50';
  return 'text-red-800 bg-red-50';
}

function TeaserBottles({ fragrances, size }: { fragrances: CuratedFragrance[]; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-10 w-10' : 'h-14 w-14';
  const overlap = size === 'sm' ? '-ml-3.5' : '-ml-5';
  const shown = fragrances.slice(0, 3);
  return (
    <div className="flex justify-center pl-4">
      {shown.map((f, i) => (
        <div
          key={`${f.id}-${i}`}
          className={`relative ${dim} rounded-lg bg-white shadow-sm ring-2 ring-white ${overlap} first:ml-0`}
          style={{ zIndex: 5 - i }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#FDF6F3] to-[#F0E4DC]">
            {f.primary_image_url ? (
              <Image src={f.primary_image_url} alt="" fill className="object-contain p-1" sizes="56px" />
            ) : (
              <div className="flex h-full items-center justify-center text-[8px] text-zinc-300">-</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModalFragranceRow({
  fragrance,
  index,
}: {
  fragrance: CuratedFragrance;
  index: number;
}) {
  const { addToCart } = useCart();
  const [sending, setSending] = useState(false);
  const [added, setAdded] = useState(false);
  const def = defaultSizePrice(fragrance);

  const handleQuickAdd = async () => {
    if (!def) {
      toast.error('Not available in cart sizes right now');
      return;
    }
    setSending(true);
    try {
      await addToCart({
        item_id: fragrance.id,
        item_type: 'fragrance',
        item_name: fragrance.name,
        item_brand: fragrance.brand_name,
        price: def.price,
        size: def.size,
        quantity: 1,
        image_url: fragrance.primary_image_url,
      } as Cart);
      setAdded(true);
      toast.success(`${fragrance.name} (${uiListedDecantLabel(def.size)}) added`);
      setTimeout(() => setAdded(false), 1600);
    } catch {
      // addToCart surfaces errors
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-[#B85A3A] shadow-sm">
        {index + 1}
      </span>
      <Link href={createProductUrl(fragrance.id, fragrance.name)} className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-zinc-100">
          {fragrance.primary_image_url ? (
            <Image src={fragrance.primary_image_url} alt="" fill className="object-contain p-0.5" sizes="36px" />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] text-zinc-300">-</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-zinc-900">{fragrance.name}</p>
          <p className="truncate text-[10px] text-zinc-500">{fragrance.brand_name}</p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        {def ? (
          <span className="hidden text-[10px] text-zinc-500 sm:inline">
            {uiListedDecantLabel(def.size)} ₹{def.price}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!def || sending || added}
          aria-label={added ? 'Added' : `Add ${fragrance.name} to cart`}
          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
            added ? 'bg-emerald-500 text-white' : def ? 'bg-[#B85A3A] text-white' : 'bg-zinc-100 text-zinc-400'
          }`}
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function ComboDetailModal({
  combo,
  onClose,
}: {
  combo: CuratedCombo;
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleAddAll = async () => {
    const items: { f: CuratedFragrance; size: string; price: number }[] = [];
    for (const f of combo.fragrances) {
      const size = pickDefaultSize(f);
      if (!size) continue;
      const opt = SIZE_OPTIONS.find((s) => s.label === size);
      if (!opt || f[opt.key] == null) continue;
      items.push({ f, size, price: Number(f[opt.key]) });
    }
    if (items.length === 0) {
      toast.error('No sizes available right now');
      return;
    }
    setAddingAll(true);
    try {
      for (const { f, size, price } of items) {
        await addToCart({
          item_id: f.id,
          item_type: 'fragrance',
          item_name: f.name,
          item_brand: f.brand_name,
          price,
          size,
          quantity: 1,
          image_url: f.primary_image_url,
        } as Cart);
      }
      toast.success(`Added ${items.length} items to cart`);
    } catch {
      // surfaced by addToCart
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="curated-combo-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B85A3A]">Blend report</p>
            <h2 id="curated-combo-modal-title" className="font-display text-lg leading-snug text-zinc-900">
              {combo.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <TeaserBottles fragrances={combo.fragrances} size="md" />

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${harmonyTone(combo.harmony_score)}`}>
              <Sparkles className="h-3.5 w-3.5" />
              {combo.harmony_score}/100 harmony
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              <ThumbsUp className="h-3.5 w-3.5 text-[#B85A3A]" />
              {combo.applause_count.toLocaleString('en-IN')} loved this
            </span>
          </div>

          {combo.subtitle ? <p className="mt-3 text-center text-sm text-[#B85A3A]">{combo.subtitle}</p> : null}

          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600">{combo.summary}</p>

          {(combo.dominant_accords || []).length > 0 ? (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {(combo.dominant_accords || []).slice(0, 6).map((a) => (
                <span
                  key={a.accord}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600"
                >
                  {a.accord}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Fragrances</p>
          <div className="mt-2 space-y-2">
            {combo.fragrances.map((f, i) => (
              <ModalFragranceRow key={`${combo.id}-${f.id}-${i}`} fragrance={f} index={i} />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={handleAddAll}
            disabled={addingAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {addingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
            Add full blend to cart
          </button>
          <p className="mt-2 text-center text-[10px] text-zinc-500">Smallest in-stock size per fragrance · edit in cart</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CuratedComboTeaser({
  combo,
  onOpen,
}: {
  combo: CuratedCombo;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col rounded-xl border border-zinc-200/90 bg-white p-3 text-left shadow-sm transition hover:border-[#B85A3A]/40 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#B85A3A] focus-visible:ring-offset-2"
    >
      <TeaserBottles fragrances={combo.fragrances} size="sm" />
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${harmonyTone(combo.harmony_score)}`}>
          {combo.harmony_score}/100
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
          <ThumbsUp className="h-3 w-3 text-[#B85A3A]" />
          {combo.applause_count}
        </span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 font-display text-[13px] font-semibold leading-snug text-zinc-900 group-hover:text-[#B85A3A]">
        {combo.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{combo.summary}</p>
      <span className="mt-2 text-[10px] font-semibold text-[#B85A3A]">View blend & shop →</span>
    </button>
  );
}

export function CuratedCombosSection() {
  const [combos, setCombos] = useState<CuratedCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/layering/curated-combos`);
      if (!res.ok) {
        setCombos([]);
        return;
      }
      const data = await res.json();
      setCombos(Array.isArray(data.combos) ? data.combos : []);
    } catch {
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCombo = openId ? combos.find((c) => c.id === openId) : null;

  if (loading) {
    return (
      <div className="mt-14 border-t border-zinc-100 pt-10">
        <div className="mx-auto mb-6 h-6 max-w-xs animate-pulse rounded bg-zinc-100" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-50" />
          ))}
        </div>
      </div>
    );
  }

  if (combos.length === 0) {
    return null;
  }

  return (
    <>
      <section className="mt-14 border-t border-zinc-100 pt-10" aria-labelledby="curated-combos-heading">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B85A3A]">
            For layering combos
          </p>
          <h2 id="curated-combos-heading" className="font-display mt-3 text-xl text-zinc-900 md:text-2xl">
            One scent is a voice.
          </h2>
          <p className="font-display mt-1 text-lg text-zinc-800 md:text-xl">Two is a signature.</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600">
            Layering is not an accident. It is architecture. We pair fragrances the way they were
            meant to meet: base with base, skin with season, mood with moment. Every combo here has
            been worn, tested, and verified on real skin, not imagined in a lab. Tap a card for the
            full blend report and cart.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {combos.map((c) => (
            <CuratedComboTeaser key={c.id} combo={c} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>
      </section>

      {openCombo ? (
        <ComboDetailModal key={openCombo.id} combo={openCombo} onClose={() => setOpenId(null)} />
      ) : null}
    </>
  );
}
