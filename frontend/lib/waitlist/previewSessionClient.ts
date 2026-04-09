/**
 * Browser-side backup for waitlist preview JWT: same value as httpOnly cookie,
 * returned once from POST /api/waitlist so APIs accept Authorization: Bearer
 * when cookies are missing or blocked.
 */

export const PREVIEW_SESSION_STORAGE_KEY = "scentrev_wl_preview_jwt";

/**
 * Persist preview session JWT from signup response (in addition to httpOnly cookie).
 *
 * Args:
 *   token: JWT string from API, or null/undefined to skip.
 */
export function storePreviewSessionFromSignup(
  token: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  const t = token?.trim();
  if (!t) return;
  try {
    sessionStorage.setItem(PREVIEW_SESSION_STORAGE_KEY, t);
  } catch {
    /* storage full or disabled */
  }
}

/**
 * Headers for waitlist-preview API calls (Bearer fallback when cookie absent).
 *
 * Returns:
 *   Header map with Authorization if a stored token exists; otherwise {}.
 */
export function getPreviewAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const t = sessionStorage.getItem(PREVIEW_SESSION_STORAGE_KEY)?.trim();
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  } catch {
    return {};
  }
}

/**
 * Map API error body + status to a short user-facing message.
 *
 * Args:
 *   raw: Response body text (often JSON).
 *   status: HTTP status.
 *
 * Returns:
 *   Human-readable error string.
 */
export function formatWaitlistPreviewApiError(raw: string, status: number): string {
  if (status === 401) {
    try {
      const j = JSON.parse(raw) as { code?: string; detail?: string };
      if (j.code === "UNAUTHORIZED") {
        return "Join the waitlist on the home page first so we can attach your preview session then try again.";
      }
      if (typeof j.detail === "string") return j.detail;
    } catch {
      /* fall through */
    }
  }
  try {
    const j = JSON.parse(raw) as { detail?: string };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* fall through */
  }
  return raw.trim() || "Something went wrong. Please try again.";
}
