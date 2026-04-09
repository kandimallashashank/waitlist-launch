const KEY = 'scentrev_recently_viewed';
const MAX_ITEMS = 12;

export interface RecentlyViewedItem {
  id: string;
  name: string;
  brand: string;
  brand_slug?: string;
  image_url?: string;
  price_3ml: number;
  /** Optional; when missing, cart “recently viewed” falls back to ``price_3ml`` for other tiers (largest may be ``price_12ml``, shown as 10ml in UI). */
  price_8ml?: number;
  price_12ml?: number;
  blind_buy_score?: number;
  viewedAt: string;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

export function trackRecentlyViewed(item: Omit<RecentlyViewedItem, 'viewedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getRecentlyViewed().filter(i => i.id !== item.id);
    const updated: RecentlyViewedItem[] = [
      { ...item, viewedAt: new Date().toISOString() },
      ...items,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // storage full ignore
  }
}
