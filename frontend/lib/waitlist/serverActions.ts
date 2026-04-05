/**
 * Server-only waitlist helpers: Supabase (service role) + Resend.
 * Used by `app/api/waitlist/route.ts` — never import from client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import {
  WAITLIST_COUPON_EMAIL_SUBJECT,
  WAITLIST_DISCOUNT,
  buildWaitlistCouponEmailHtml,
  buildWaitlistCouponEmailText,
} from "./couponEmailTemplate";

const COUPON_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Normalize Supabase project URL (strip trailing slash and duplicate `/rest/v1`).
 *
 * Args:
 *   url: Raw env value.
 *
 * Returns:
 *   Origin like `https://xxx.supabase.co`.
 */
export function normalizeSupabaseProjectUrl(url: string): string {
  let u = (url || "").trim().replace(/\/+$/, "");
  const suffix = "/rest/v1";
  while (u.endsWith(suffix)) {
    u = u.slice(0, -suffix.length).replace(/\/+$/, "");
  }
  return u;
}

/**
 * Create a cryptographically secure waitlist coupon code (`WAIT15-XXXXXXXX`).
 *
 * Returns:
 *   Uppercase alphanumeric code.
 */
export function generateWaitlistCouponCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += COUPON_ALPHABET[bytes[i]! % COUPON_ALPHABET.length];
  }
  return `WAIT${WAITLIST_DISCOUNT}-${suffix}`;
}

interface WaitlistRow {
  id?: string;
  email: string;
  full_name?: string | null;
  coupon_code?: string | null;
  coupon_used?: boolean | null;
  discount_percent?: number | null;
}

/**
 * Return a Supabase client with the service role key (server only).
 *
 * Raises:
 *   Error: When URL or service key is missing.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!rawUrl?.trim() || !serviceKey?.trim()) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) must be set.",
    );
  }
  const url = normalizeSupabaseProjectUrl(rawUrl);
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Load or create a waitlist row and ensure a coupon exists (matches main API behavior).
 *
 * Args:
 *   supabase: Service-role client.
 *   email: Normalized email.
 *   fullName: Optional name.
 *
 * Returns:
 *   Row fields including `coupon_code` and `discount_percent`.
 */
export async function getOrCreateWaitlistRow(
  supabase: SupabaseClient,
  email: string,
  fullName: string | undefined,
): Promise<WaitlistRow> {
  const { data: rows, error: selectErr } = await supabase
    .from("waitlist")
    .select("id, email, full_name, coupon_code, coupon_used, discount_percent")
    .eq("email", email)
    .limit(1);

  if (selectErr) {
    throw new Error(selectErr.message);
  }

  const existing = rows?.[0] as WaitlistRow | undefined;

  if (!existing) {
    const coupon_code = generateWaitlistCouponCode();
    const payload = {
      id: randomUUID(),
      email,
      full_name: fullName ?? null,
      source: "waitlist_page",
      coupon_code,
      discount_percent: WAITLIST_DISCOUNT,
      coupon_used: false,
    };
    const { error: insertErr } = await supabase.from("waitlist").insert(payload);
    if (insertErr) {
      throw new Error(insertErr.message);
    }
    return payload;
  }

  if (!existing.coupon_code) {
    const coupon_code = generateWaitlistCouponCode();
    const { error: updateErr } = await supabase
      .from("waitlist")
      .update({
        coupon_code,
        discount_percent: WAITLIST_DISCOUNT,
      })
      .eq("email", email);
    if (updateErr) {
      throw new Error(updateErr.message);
    }
    return {
      ...existing,
      coupon_code,
      discount_percent: WAITLIST_DISCOUNT,
    };
  }

  return existing;
}

/**
 * Send email via Resend HTTP API.
 *
 * Args:
 *   toEmail: Recipient.
 *   subject: Subject line.
 *   html: HTML body.
 *   text: Plain-text body.
 *
 * Returns:
 *   True if Resend accepted the request.
 */
export async function sendViaResend(
  toEmail: string,
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY or RESEND_FROM_EMAIL is not set.");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", res.status, body);
    return false;
  }
  return true;
}

/**
 * Run full post-signup flow: optional email when the coupon is newly assigned.
 *
 * Args:
 *   emailNorm: Normalized subscriber email.
 *   fullName: Optional display name.
 *   hadCouponBefore: Whether a coupon already existed before this request.
 *
 * Returns:
 *   Result object for the JSON response.
 */
export async function completeWaitlistSignup(
  emailNorm: string,
  fullName: string | undefined,
  hadCouponBefore: boolean,
): Promise<{
  couponCode: string;
  discountPercent: number;
  already: boolean;
  emailSent: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const data = await getOrCreateWaitlistRow(supabase, emailNorm, fullName);
  const couponCode = data.coupon_code || "";
  const discountPercent =
    typeof data.discount_percent === "number"
      ? data.discount_percent
      : WAITLIST_DISCOUNT;

  if (hadCouponBefore) {
    return {
      couponCode,
      discountPercent,
      already: true,
      emailSent: false,
    };
  }

  const display = (fullName || "").trim() || "there";
  const html = buildWaitlistCouponEmailHtml(display, couponCode, discountPercent);
  const text = buildWaitlistCouponEmailText(display, couponCode, discountPercent);
  const emailSent = await sendViaResend(
    emailNorm,
    WAITLIST_COUPON_EMAIL_SUBJECT,
    html,
    text,
  );

  if (!emailSent) {
    console.warn("Waitlist row saved but email failed for", emailNorm);
  }

  return {
    couponCode,
    discountPercent,
    already: false,
    emailSent,
  };
}
