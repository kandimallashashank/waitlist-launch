/**
 * Waitlist email validation — practical RFC 5321 subset.
 * Accepts real-world addresses including .co, .in, .io, subdomains, plus-addressing, etc.
 * Rejects obvious garbage: missing @, no TLD, consecutive dots, leading/trailing dots.
 */

export const WAITLIST_EMAIL_MAX_LENGTH = 254;

/**
 * Local part rules:
 *   - 1–64 chars
 *   - Allowed: a-z 0-9 . _ + - (case-insensitive)
 *   - No leading, trailing, or consecutive dots
 *
 * Domain rules:
 *   - Each label: 1–63 chars, alphanumeric + hyphens, no leading/trailing hyphen
 *   - At least one dot separating labels
 *   - TLD: 2–24 alpha chars (covers .co, .in, .io, .com, .museum, etc.)
 */
const LOCAL_RE = /^[a-z0-9]([a-z0-9._%+\-]*[a-z0-9])?$/;
const LOCAL_CONSEC_DOTS = /\.\./;
const DOMAIN_LABEL_RE = /^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,24}$/;

export function trimWaitlistEmail(raw: string): string {
  return String(raw ?? "").trim();
}

export function normalizeWaitlistEmail(raw: string): string {
  return trimWaitlistEmail(raw).toLowerCase();
}

export function isValidWaitlistEmail(raw: string): boolean {
  return getWaitlistEmailValidationError(raw) === null;
}

export function getWaitlistEmailValidationError(raw: string): string | null {
  const trimmed = trimWaitlistEmail(raw);

  if (!trimmed) return "Please enter your email.";
  if (trimmed.length > WAITLIST_EMAIL_MAX_LENGTH) return "Email address is too long.";

  const atIdx = trimmed.lastIndexOf("@");
  if (atIdx < 1) return "Please enter a valid email address.";

  const local = trimmed.slice(0, atIdx).toLowerCase();
  const domain = trimmed.slice(atIdx + 1).toLowerCase();

  // Local part
  if (!local || local.length > 64) return "Please enter a valid email address.";
  if (LOCAL_CONSEC_DOTS.test(local)) return "Please enter a valid email address.";
  if (!LOCAL_RE.test(local)) return "Please enter a valid email address.";

  // Domain
  if (!domain || domain.length > 253) return "Please enter a valid email address.";
  const labels = domain.split(".");
  if (labels.length < 2) return "Please enter a valid email address.";

  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld)) return "Please enter a valid email address.";

  for (const label of labels.slice(0, -1)) {
    if (!label || label.length > 63) return "Please enter a valid email address.";
    if (!DOMAIN_LABEL_RE.test(label)) return "Please enter a valid email address.";
  }

  return null;
}
