'use client';

/**
 * Embeds Razorpay EMI² Affordability Widget (see Razorpay docs: Native Web).
 * Enable the product in Dashboard → Affordability before it appears for customers.
 */

import { useEffect, useRef } from 'react';

const AFFORDABILITY_SCRIPT_SRC =
  'https://cdn.razorpay.com/widgets/affordability/affordability.js';

declare global {
  interface Window {
    RazorpayAffordabilitySuite?: new (config: {
      key: string;
      amount: number;
    }) => { render: () => void };
  }
}

let affordabilityScriptPromise: Promise<void> | null = null;

function loadAffordabilityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.RazorpayAffordabilitySuite) return Promise.resolve();
  if (affordabilityScriptPromise) return affordabilityScriptPromise;

  affordabilityScriptPromise = new Promise((resolve, reject) => {
    const finishOk = () => {
      if (window.RazorpayAffordabilitySuite) {
        resolve();
        return;
      }
      affordabilityScriptPromise = null;
      reject(new Error('RazorpayAffordabilitySuite not available'));
    };

    const fail = (err: Error) => {
      affordabilityScriptPromise = null;
      reject(err);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${AFFORDABILITY_SCRIPT_SRC}"]`
    );
    if (existing) {
      const rs = (existing as HTMLScriptElement & { readyState?: string }).readyState;
      if (rs === 'complete' || rs === 'loaded') {
        finishOk();
        return;
      }
      existing.addEventListener('load', finishOk, { once: true });
      existing.addEventListener('error', () => fail(new Error('affordability script error')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = AFFORDABILITY_SCRIPT_SRC;
    script.async = true;
    script.onload = finishOk;
    script.onerror = () => fail(new Error('Razorpay affordability script failed to load'));
    document.head.appendChild(script);
  });

  return affordabilityScriptPromise;
}

export interface RazorpayAffordabilityWidgetProps {
  /** Final amount in Indian Rupees (widget receives paise internally). */
  amountRupees: number;
  /** Razorpay Key ID from the dashboard; defaults to NEXT_PUBLIC_RAZORPAY_KEY_ID. */
  keyId?: string;
  className?: string;
}

export default function RazorpayAffordabilityWidget({
  amountRupees,
  keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  className,
}: RazorpayAffordabilityWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const key = keyId?.trim() ?? '';
  const amountPaise = Math.max(0, Math.round(Number(amountRupees) * 100));

  useEffect(() => {
    if (!key || amountPaise <= 0) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadAffordabilityScript();
        if (cancelled) return;
        const Suite = window.RazorpayAffordabilitySuite;
        if (!Suite) return;
        el.innerHTML = '';
        const suite = new Suite({ key, amount: amountPaise });
        suite.render();
      } catch {
        /* optional marketing surface; avoid console noise in production */
      }
    })();

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [key, amountPaise]);

  if (!key || amountPaise <= 0) return null;

  return (
    <div
      ref={containerRef}
      id="razorpay-affordability-widget"
      className={className}
      aria-label="Affordable payment options"
    />
  );
}
