'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, RefreshCw, Shield, Package } from 'lucide-react';
import {
  DEFAULT_SUBSCRIPTION_TIER_PRICING,
  fetchSubscriptionTierPricing,
  type SubscriptionTierPricing,
} from '@/lib/subscriptionPlanPricing';

interface SubscriptionBannerProps {
  variant?: 'full' | 'slim';
}

interface SubscriptionTierRow {
  tier: string;
  desc: string;
  bg: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SubscriptionBanner({ variant = 'full' }: SubscriptionBannerProps) {
  const [is_hydrated, set_is_hydrated] = useState(false);
  const [tiers, setTiers] = useState<SubscriptionTierPricing[]>(
    DEFAULT_SUBSCRIPTION_TIER_PRICING,
  );

  useEffect(() => {
    set_is_hydrated(true);
    void fetchSubscriptionTierPricing(API_BASE).then(setTiers);
  }, []);

  const computedStart = tiers.reduce(
    (min, tier) => Math.min(min, tier.monthly),
    Number.POSITIVE_INFINITY,
  );
  const startingPrice = Number.isFinite(computedStart)
    ? computedStart
    : DEFAULT_SUBSCRIPTION_TIER_PRICING[0].monthly;
  const subscriptionRows: SubscriptionTierRow[] = [
    {
      tier: 'essential',
      desc: 'Mainstream fragrances',
      bg: 'bg-white/5 border border-white/10',
    },
    {
      tier: 'signature',
      desc: 'Designer & mid-range',
      bg: 'bg-white/10 border border-white/10',
    },
    {
      tier: 'prestige',
      desc: 'Niche & luxury',
      bg: 'bg-white/[0.15] border border-white/10',
    },
  ];

  if (!is_hydrated) {
    return null;
  }

  if (variant === 'slim') {
    return (
      <div className="bg-stone-900 border-b border-white/5 py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-terracotta-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                8ml travel spray every month from ₹{startingPrice}
              </p>
              <p className="text-stone-400 text-xs mt-0.5">
                Free shipping · Cancel anytime · GST included
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-stone-900 text-xs font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-stone-100"
          >
            Subscribe <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-stone-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-terracotta-900/20 via-transparent to-sage-900/10" aria-hidden />
      <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-16">
        <div className="flex flex-col sm:flex-row items-center gap-10">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-terracotta-400 text-[10px] font-semibold uppercase tracking-[0.25em] mb-4">
              Monthly Subscription
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight mb-3"
              style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
              A new fragrance<br className="hidden sm:block" />
              <span className="text-terracotta-400"> every month.</span>
            </h2>
            <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-5 max-w-md">
              One 8ml travel atomizer per month you pick the perfume, we ship immediately.
              Free shipping. Cancel anytime.
            </p>

            <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-stone-500 mb-7">
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-stone-400" /> Free shipping</span>
              <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4 text-stone-400" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-stone-400" /> Razorpay secured</span>
            </div>

            <Link
              href="/subscription"
              className="inline-flex items-center gap-2 bg-white text-stone-900 font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors hover:bg-stone-100"
            >
              Start from ₹{startingPrice}/month <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex-shrink-0 flex flex-col gap-2 w-full sm:w-52">
            {subscriptionRows.map((row) => {
              const tier = tiers.find((item) => item.id === row.tier);
              const row_class_name = [
                'flex items-center justify-between px-4 py-3 rounded-xl',
                row.bg,
              ].join(' ');
              return (
                <div
                  key={row.tier}
                  className={row_class_name}
                >
                  <div>
                    <p className="text-white text-xs font-semibold">{tier?.name || row.tier}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{row.desc}</p>
                  </div>
                  <span className="text-white font-semibold text-sm tabular-nums">
                    ₹{tier?.monthly || 0}/mo
                  </span>
                </div>
              );
            })}
            <p className="text-center text-[10px] text-stone-600 mt-1">8ml spray · never repeated</p>
          </div>
        </div>
      </div>
    </section>
  );
}
