/**
 * Sign waitlist session JWTs (HS256) for httpOnly cookies.
 * Must use the same secret as apps/api ``WAITLIST_PREVIEW_JWT_SECRET``.
 */

import { SignJWT } from "jose";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30d

function getSecretKey(): Uint8Array {
  const raw = process.env.WAITLIST_PREVIEW_JWT_SECRET?.trim();
  if (!raw) {
    throw new Error("WAITLIST_PREVIEW_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(raw);
}

/**
 * Create a JWT with ``sub`` = normalized waitlist email.
 *
 * Args:
 *     email: Normalized email (lowercase trim).
 *
 * Returns:
 *     Compact JWT string.
 */
export async function signWaitlistSessionJwt(email: string): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SEC}s`)
    .sign(key);
}

export const WAITLIST_SESSION_COOKIE = "scentrev_wl_sess";
