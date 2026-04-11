/**
 * Verify waitlist session JWT from cookies and resolve normalized email.
 */

import { jwtVerify, type JWTPayload } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";

import { WAITLIST_SESSION_COOKIE } from "@/lib/waitlist/sessionJwt";

/**
 * Extract waitlist email from signed session cookie.
 *
 * Args:
 *   cookieValue: Raw cookie string value.
 *
 * Returns:
 *   Normalized email from JWT `sub`, or null if invalid.
 */
export async function getEmailFromWaitlistSessionCookie(
  cookieValue: string | undefined,
): Promise<string | null> {
  const secret = process.env.WAITLIST_PREVIEW_JWT_SECRET?.trim();
  if (!cookieValue?.trim() || !secret) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(
      cookieValue,
      new TextEncoder().encode(secret),
    );
    const sub = (payload as JWTPayload).sub;
    if (typeof sub !== "string" || !sub.includes("@")) {
      return null;
    }
    return sub.trim().toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Read waitlist session email from a Request (cookie, then Bearer fallback).
 *
 * Cookie is preferred so a stale JWT in ``sessionStorage`` (sent as Bearer) cannot
 * override the current httpOnly session after refresh or re-signup.
 *
 * Args:
 *   req: Incoming request.
 *
 * Returns:
 *   Email or null.
 */
export async function getWaitlistEmailFromRequest(
  req: Request,
): Promise<string | null> {
  const rawCookie = req.headers.get("cookie") ?? "";
  const match = rawCookie.match(
    new RegExp(`(?:^|;\\s*)${WAITLIST_SESSION_COOKIE}=([^;]+)`),
  );
  const cookieValue = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  const fromCookie = await getEmailFromWaitlistSessionCookie(cookieValue);
  if (fromCookie) {
    return fromCookie;
  }

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) {
      const fromBearer = await getEmailFromWaitlistSessionCookie(token);
      if (fromBearer) {
        return fromBearer;
      }
    }
  }

  return null;
}

/**
 * Confirm a row exists in public.waitlist for this email.
 *
 * Args:
 *   supabase: Service-role client.
 *   email: Normalized email.
 *
 * Returns:
 *   True if at least one row exists.
 */
export async function isEmailOnWaitlist(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("email")
    .eq("email", email)
    .limit(1);
  if (error) {
    console.error("waitlist lookup:", error.message);
    return false;
  }
  return Boolean(data?.length);
}
