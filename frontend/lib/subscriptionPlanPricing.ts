/**
 * Shared subscription tier pricing helpers.
 *
 * Keeps frontend pricing in sync with `/api/v1/subscriptions/plans` so admin
 * updates reflect across checkout, plan cards, and pricing CTAs.
 */

export type SubscriptionTierKey = 'essential' | 'signature' | 'prestige';

interface SubscriptionPlanRow {
  tier?: string | null;
  catalog_tier?: string | null;
  billing_cycle?: string | null;
  price_inr?: number | null;
  monthly_price_inr?: number | null;
  annual_price_inr?: number | null;
  is_active?: boolean | null;
}

export interface SubscriptionTierPricing {
  id: SubscriptionTierKey;
  name: string;
  monthly: number;
  annual: number;
  annualMonthly: number;
}

export const DEFAULT_SUBSCRIPTION_TIER_PRICING: SubscriptionTierPricing[] = [
  { id: 'essential', name: 'Essential', monthly: 299, annual: 2699, annualMonthly: 225 },
  { id: 'signature', name: 'Signature', monthly: 499, annual: 4499, annualMonthly: 375 },
  { id: 'prestige', name: 'Prestige', monthly: 799, annual: 7199, annualMonthly: 600 },
];

const DEFAULT_BY_TIER: Record<SubscriptionTierKey, SubscriptionTierPricing> = {
  essential: DEFAULT_SUBSCRIPTION_TIER_PRICING[0],
  signature: DEFAULT_SUBSCRIPTION_TIER_PRICING[1],
  prestige: DEFAULT_SUBSCRIPTION_TIER_PRICING[2],
};

function toTierKey(value: unknown): SubscriptionTierKey | null {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'essential' || v === 'signature' || v === 'prestige') {
    return v;
  }
  return null;
}

function readMonthlyPrice(row: SubscriptionPlanRow | undefined, fallback: number): number {
  if (!row) return fallback;
  const raw = row.price_inr ?? row.monthly_price_inr;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readAnnualPrice(
  row: SubscriptionPlanRow | undefined,
  monthlyPrice: number,
  fallback: number,
): number {
  if (!row) return fallback;
  const raw = row.annual_price_inr ?? row.price_inr;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return monthlyPrice * 12;
}

export function normalizeSubscriptionTierPricing(
  plans: SubscriptionPlanRow[] | null | undefined,
): SubscriptionTierPricing[] {
  if (!Array.isArray(plans) || plans.length === 0) {
    return DEFAULT_SUBSCRIPTION_TIER_PRICING;
  }

  const activeRows = plans.filter((row) => row?.is_active !== false);
  const rows = activeRows.length > 0 ? activeRows : plans;

  const output: SubscriptionTierPricing[] = [];
  for (const tier of ['essential', 'signature', 'prestige'] as const) {
    const fallback = DEFAULT_BY_TIER[tier];
    const monthlyRow = rows.find((row) => {
      const rowTier = toTierKey(row?.tier ?? row?.catalog_tier);
      const cycle = String(row?.billing_cycle || 'monthly').toLowerCase();
      return rowTier === tier && cycle !== 'annual';
    });
    const annualRow = rows.find((row) => {
      const rowTier = toTierKey(row?.tier ?? row?.catalog_tier);
      const cycle = String(row?.billing_cycle || '').toLowerCase();
      return rowTier === tier && cycle === 'annual';
    });

    const monthly = readMonthlyPrice(monthlyRow, fallback.monthly);
    const annual = readAnnualPrice(annualRow, monthly, fallback.annual);
    output.push({
      id: tier,
      name: fallback.name,
      monthly,
      annual,
      annualMonthly: Math.round(annual / 12),
    });
  }
  return output;
}

export async function fetchSubscriptionTierPricing(
  apiBase: string,
): Promise<SubscriptionTierPricing[]> {
  try {
    const res = await fetch(`${apiBase}/api/v1/subscriptions/plans`);
    if (!res.ok) return DEFAULT_SUBSCRIPTION_TIER_PRICING;
    const body = (await res.json()) as SubscriptionPlanRow[];
    return normalizeSubscriptionTierPricing(body);
  } catch {
    return DEFAULT_SUBSCRIPTION_TIER_PRICING;
  }
}
