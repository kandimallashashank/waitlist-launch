// Razorpay checkout utility loads script + provides typed helpers

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoaded = false;
let loadInFlight: Promise<boolean> | null = null;

/**
 * Ensures Razorpay checkout.js is loaded once. Reuses an existing global
 * script tag or `window.Razorpay` if present (e.g. from a prior navigation).
 */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  if (window.Razorpay) {
    scriptLoaded = true;
    return Promise.resolve(true);
  }
  if (loadInFlight) {
    return loadInFlight;
  }

  loadInFlight = new Promise((resolve) => {
    const settle = (ok: boolean): void => {
      loadInFlight = null;
      if (ok) {
        scriptLoaded = true;
      }
      resolve(ok);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_SRC}"]`,
    );
    if (existing) {
      let finished = false;
      const done = (ok: boolean): void => {
        if (finished) return;
        finished = true;
        settle(ok && Boolean(window.Razorpay));
      };
      existing.addEventListener('load', () => done(true), { once: true });
      existing.addEventListener('error', () => done(false), { once: true });
      // Cached / already-executed scripts may not re-fire `load` after we subscribe.
      queueMicrotask(() => {
        if (window.Razorpay) {
          done(true);
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => settle(true);
    script.onerror = () => settle(false);
    document.body.appendChild(script);
  });

  return loadInFlight;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function createRazorpayOrder(orderId: string, amount: number, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Stable per order so flaky networks can retry without double Razorpay orders (backend Redis idempotency).
    'Idempotency-Key': `scentrev-co-${orderId}`,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/v1/payments/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: orderId, amount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create payment order');
  }

  return res.json() as Promise<{
    razorpay_order_id: string;
    razorpay_key_id: string;
    amount: number;
    currency: string;
    order_id: string;
    payment_id: string;
  }>;
}

export async function verifyRazorpayPayment(
  data: RazorpayResponse & { order_id: string },
  token?: string,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/v1/payments/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Payment verification failed');
  }

  return res.json() as Promise<{
    verified: boolean;
    order_id: string;
    payment_status: string;
  }>;
}

export interface QuickBuyParams {
  perfume_id: string;
  size_code: string;
  quantity?: number;
  unit_price: number;
  total_amount: number;
  shipping_amount?: number;
  coupon_code?: string;
  store_credit_to_use?: number;
  referral_code?: string;
  accessories?: Array<{
    item_type: 'accessory';
    item_name: string;
    unit_price: number;
    quantity: number;
    size_code: string;
  }>;
}

export interface QuickBuyResponse {
  order_id: string;
  order_number: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: number;
  currency: string;
  payment_id: string;
}

export async function createQuickBuyOrder(params: QuickBuyParams, token: string): Promise<QuickBuyResponse> {
  const res = await fetch(`${API_URL}/api/v1/orders/quick-buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create quick buy order');
  }

  return res.json();
}

/**
 * Mark an unpaid Razorpay checkout as abandoned (e.g. user closed the modal without paying).
 * Keeps the DB consistent with mark-failed and restores reserved store credits server-side.
 */
export async function abandonCheckout(
  params: { order_id: string; razorpay_order_id: string },
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/payments/abandon-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Failed to abandon checkout');
  }
}
