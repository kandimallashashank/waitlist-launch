'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DEFAULT_TIER_PRICING: Record<string, { monthly: number; annual: number; annualMonthly: number }> = {
  essential: { monthly: 299, annual: 2699, annualMonthly: 225 },
  signature: { monthly: 499, annual: 4499, annualMonthly: 375 },
  prestige: { monthly: 799, annual: 7199, annualMonthly: 600 },
};

const TIERS = [
  {
    id: 'essential',
    name: 'Essential',
    desc: 'Strong value brands, great for building a rotation.',
    features: ['1 × 8ml atomizer/month', 'Lattafa, Rasasi, Ajmal, Al Haramain', 'Fresh, Floral, Woody, Oriental', 'Fragrance card with layering tips', 'Subscriber full-bottle discount'],
  },
  {
    id: 'signature',
    name: 'Signature',
    badge: 'Most popular',
    desc: 'Designer and mid-range houses. The sweet spot.',
    features: ['Everything in Essential', 'Versace, Calvin Klein, Hugo Boss, Armaf', 'Aquatic, Gourmand, International Designer', 'Priority catalog access', 'Referral rewards (annual)'],
  },
  {
    id: 'prestige',
    name: 'Prestige',
    desc: 'Niche and luxury. For the serious collector.',
    gold: true,
    features: ['Everything in Signature', 'Tom Ford, Creed, Amouage, Nishane, MFK', 'Niche Oud, Leather, Ultra-Niche', 'Free upgrade tokens (annual)', 'Early catalog drops'],
  },
] as const;

const FAQ = [
  { q: 'What do I get each month?', a: 'One 8ml travel atomizer (~100 sprays) of the fragrance you pick. Your first box also includes a reusable atomizer case. We include a fragrance card with notes, occasion ideas, and layering tips.' },
  { q: 'How is Signature different from Essential?', a: 'Each tier unlocks a different slice of our catalog. Essential covers strong-value and accessible brands. Signature adds designer and mid-range options. Prestige includes niche and luxury houses. You can always pick a pricier scent on any tier by paying a one-time upgrade fee.' },
  { q: 'Monthly vs annual which should I pick?', a: 'Monthly bills every month. Annual is billed once per year and saves ~25% vs twelve monthly payments. Annual subscribers also unlock referral rewards, full-bottle discounts, and early catalog access.' },
  { q: 'How do I pick my perfume each month?', a: 'After subscribing, open your tier catalog for the billing month. Pick a fragrance and confirm. If you took our Scent Quiz, we personalize catalog ordering so your best matches appear first.' },
  { q: 'What is "Pick for me"?', a: 'An optional setting. When on, we auto-select a fragrance each month using your scent profile. You can still switch before the pick-by date.' },
  { q: 'What is an upgrade fee?', a: 'A one-time extra charge when you pick a fragrance priced above your plan allowance. You pay only the difference. Your next renewal stays at your normal plan price.' },
  { q: 'Can I pause or skip?', a: 'Yes pause stops future renewals until you resume. You can skip up to two months per calendar year from Manage Subscription.' },
  { q: 'How do I cancel?', a: 'Cancel anytime from Manage Subscription. You keep access through the end of the period you already paid for.' },
  { q: 'Is GST included? Is shipping free?', a: 'Prices are inclusive of GST. Shipping is free on all Scent Box orders.' },
  { q: 'Can subscription prices change?', a: 'Yes. Plan prices may be updated before launch or over time, for example when we align with live billing, run offers, or adjust tiers. Your renewal always reflects the current plan price we show in your account, with notice where required.' },
];

export function SubscribePilotPage(): React.ReactElement {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tierPricing, setTierPricing] = useState(DEFAULT_TIER_PRICING);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_BASE}/api/v1/subscriptions/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((plans: unknown) => {
        if (!Array.isArray(plans) || cancelled) return;
        const next = { ...DEFAULT_TIER_PRICING };
        for (const row of plans as Array<Record<string, unknown>>) {
          if ((row.billing_cycle || 'monthly') !== 'monthly') continue;
          const tier = String(row.tier || row.catalog_tier || '').toLowerCase();
          if (!next[tier]) continue;
          const m = Number(row.price_inr ?? row.monthly_price_inr);
          if (Number.isFinite(m) && m > 0) next[tier] = { ...next[tier], monthly: m };
        }
        setTierPricing(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startingMonthly = useMemo(() => Math.min(...Object.values(tierPricing).map((p) => p.monthly)), [tierPricing]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F0EBE3]">

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-8 pt-16">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.18)_0%,transparent_65%)]" />
          <div className="absolute -left-32 top-40 h-64 w-64 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.08)_0%,transparent_70%)]" />
          <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-[radial-gradient(ellipse,rgba(212,165,116,0.07)_0%,transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* Left headline */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B85A3A]/30 bg-[#B85A3A]/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B85A3A]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B85A3A]">Scent Box · Pilot</span>
              </div>

              <h1 className="mb-5 font-sans text-[2.6rem] font-light leading-[1.07] tracking-[-0.025em] text-white md:text-[3.25rem]">
                A new perfume<br />
                <span className="text-white/60">every month.</span>
              </h1>

              <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/75">
                One 8ml atomizer (~100 sprays) delivered to your door.{' '}
                Starting at <span className="font-semibold text-white">₹{startingMonthly}/mo</span>
                {' '}(indicative; subscription prices can be dynamic; see plans below).
                No lock-in.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/#waitlist-form"
                  className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#0F0F0F] transition-opacity hover:opacity-90"
                >
                  Join the waitlist
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white/80"
                >
                  See plans ↓
                </button>
              </div>
            </div>

            {/* Right glass stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { n: '450+', label: 'Fragrances', sub: 'Niche to designer' },
                { n: '₹299', label: 'Starting price', sub: 'Per month' },
                { n: '8ml', label: 'Per box', sub: '~100 sprays' },
                { n: '3', label: 'Tiers', sub: 'Essential → Prestige' },
              ].map(({ n, label, sub }) => (
                <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md">
                  <p className="mb-0.5 text-2xl font-light text-white">{n}</p>
                  <p className="text-xs font-semibold text-white/85">{label}</p>
                  <p className="text-[10px] text-white/55">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Perks strip glass card */}
        <div className="relative mx-auto mt-10 max-w-3xl">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
              {[
                'Free shipping',
                'GST inclusive',
                'Cancel anytime',
                'Pause or skip',
                '10–15% off full bottles',
              ].map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[11px] text-white/85">
                  <Check className="h-3 w-3 text-[#B85A3A]" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works glass cards */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="mb-10 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">How it works</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'Pick a plan',
              body: 'Essential, Signature, or Prestige. Monthly or annual billing.',
              stat: 'From ₹299/mo',
              icon: '◈',
            },
            {
              n: '02',
              title: 'Choose your scent',
              body: 'Browse your tier catalog each month. Pick any fragrance. Upgrade fees only when you go premium.',
              stat: '450+ fragrances',
              icon: '◉',
            },
            {
              n: '03',
              title: 'Delivered to you',
              body: 'Ships within 1–2 business days. Track it like any store order.',
              stat: 'Free shipping',
              icon: '◎',
            },
          ].map(({ n, title, body, stat, icon }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md transition-colors hover:border-white/[0.13] hover:bg-white/[0.06]"
            >
              {/* Subtle corner glow on hover */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(ellipse,rgba(184,90,58,0.12)_0%,transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />

              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-[11px] text-white/45">{n}</span>
                <span className="rounded-full border border-[#B85A3A]/25 bg-[#B85A3A]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#B85A3A]">
                  {stat}
                </span>
              </div>

              <div className="mb-3 text-2xl text-white/35">{icon}</div>

              <p className="mb-2 text-[15px] font-semibold text-white">{title}</p>
              <p className="text-sm leading-relaxed text-white/85">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="plans" className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center font-sans text-2xl font-light text-white">Simple pricing</h2>
          <p className="mb-10 text-center text-sm text-white/85">All plans include free shipping and GST. No hidden fees.</p>

          {/* Billing toggle */}
          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={cn('rounded-lg px-6 py-2 text-sm font-medium transition-all', billing === 'monthly' ? 'bg-white text-[#0F0F0F]' : 'text-white/80 hover:text-white')}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={cn('rounded-lg px-6 py-2 text-sm font-medium transition-all', billing === 'annual' ? 'bg-white text-[#0F0F0F]' : 'text-white/80 hover:text-white')}
              >
                Annual{' '}
                <span className={cn('ml-1 text-xs font-semibold', billing === 'annual' ? 'text-emerald-600' : 'text-emerald-500')}>Save 25%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TIERS.map((tier) => {
              const isGold = 'gold' in tier && tier.gold;
              const pricing = tierPricing[tier.id] ?? DEFAULT_TIER_PRICING[tier.id];
              const price = billing === 'annual' ? pricing.annualMonthly : pricing.monthly;
              const annualSavings = Math.max(0, pricing.monthly * 12 - pricing.annual);
              return (
                <motion.div
                  key={tier.id}
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-6',
                    isGold
                      ? 'border-[#C9A96E]/30 bg-[#1A1710]'
                      : 'border-white/[0.08] bg-white/[0.04]',
                    'badge' in tier && tier.badge ? 'ring-1 ring-[#B85A3A]/60' : '',
                  )}
                >
                  {'badge' in tier && tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B85A3A] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {tier.badge}
                    </span>
                  )}
                  <p className="mb-0.5 text-base font-semibold text-white">{tier.name}</p>
                  <p className="mb-5 text-xs leading-relaxed text-white/85">{tier.desc}</p>
                  <div className="mb-5">
                    <span className="text-4xl font-light tabular-nums text-white">₹{price}</span>
                    <span className="ml-1 text-sm text-white/55">/mo</span>
                    {billing === 'annual' && (
                      <p className="mt-1 text-xs font-medium text-emerald-500">₹{pricing.annual}/year · save ₹{annualSavings}</p>
                    )}
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B85A3A]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/#waitlist-form"
                    className={cn(
                      'block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-colors',
                      isGold
                        ? 'bg-[#C9A96E] text-[#0F0F0F] hover:bg-[#D4B87A]'
                        : 'bg-white/10 text-white hover:bg-white/15',
                    )}
                  >
                    Notify me at launch
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-white/50">
            Subscription plan prices may be <span className="font-medium text-white/70">dynamic</span>.
            They can change before launch, when we sync with live plans, or at renewal based on catalog
            and offers. Amounts on this page are indicative; the price you see at checkout (or on your
            renewal invoice) is what applies. Final launch pricing will be confirmed when we open
            subscriptions.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-2xl px-6 py-20">
        <h2 className="mb-10 text-center font-sans text-xl font-light text-white">Questions</h2>
        <div className="divide-y divide-white/[0.06]">
          {FAQ.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-start justify-between gap-4 py-4 text-left text-sm font-medium text-white/85 transition-colors hover:text-white"
              >
                <span>{item.q}</span>
                <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-white/45 transition-transform duration-200', openFaq === i && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-4 text-sm leading-relaxed text-white/85">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="border-t border-white/[0.06] px-4 py-12 text-center">
        <p className="mb-5 text-sm text-white/85">
          While you wait, try the{' '}
          <Link href="/quiz" className="font-semibold text-[#B85A3A] underline underline-offset-2">scent quiz</Link>
          {' '}and{' '}
          <Link href="/layering-lab" className="font-semibold text-[#B85A3A] underline underline-offset-2">Layering Lab</Link>.
        </p>
        <Link href="/#waitlist-form" className="inline-flex rounded-xl bg-[#B85A3A] px-7 py-3 text-sm font-semibold text-white hover:bg-[#A04D2F] transition-colors">
          Join the waitlist
        </Link>
      </div>
    </div>
  );
}
