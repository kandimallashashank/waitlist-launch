/**
 * Shared waitlist email rules for `POST /api/waitlist` and the waitlist page.
 * Practical format check (not full RFC 5322); blocks obvious garbage.
 */

/** RFC 5321 maximum length for a mailbox string. */
export const WAITLIST_EMAIL_MAX_LENGTH = 254;

/**
 * Local @ domain.tld — no whitespace; at least one dot after @.
 */
const WAITLIST_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Trims surrounding whitespace from an email input.
 *
 * Args:
 *   raw: Raw string from UI or JSON body.
 *
 * Returns:
 *   Trimmed string (may be empty).
 */
export function trimWaitlistEmail(raw: string): string {
  return String(raw ?? "").trim();
}

/**
 * Normalizes for storage and comparison: trim + lowercase.
 *
 * Args:
 *   raw: Raw email string.
 *
 * Returns:
 *   Normalized email.
 */
export function normalizeWaitlistEmail(raw: string): string {
  return trimWaitlistEmail(raw).toLowerCase();
}

/**
 * True if the value is a plausible email after trim and length check.
 *
 * Args:
 *   raw: User or API input before normalization.
 *
 * Returns:
 *   Whether the email passes validation.
 */
export function isValidWaitlistEmail(raw: string): boolean {
  return getWaitlistEmailValidationError(raw) === null;
}

/**
 * Returns a short error message for the client or API, or null if valid.
 *
 * Args:
 *   raw: User or API input.
 *
 * Returns:
 *   Error message or null when the value is acceptable.
 */
export function getWaitlistEmailValidationError(raw: string): string | null {
  const trimmed = trimWaitlistEmail(raw);
  if (!trimmed) {
    return "Please enter your email.";
  }
  if (trimmed.length > WAITLIST_EMAIL_MAX_LENGTH) {
    return "Email address is too long.";
  }
  const lower = trimmed.toLowerCase();
  if (!WAITLIST_EMAIL_RE.test(lower)) {
    return "Please enter a valid email address.";
  }
  return null;
}
