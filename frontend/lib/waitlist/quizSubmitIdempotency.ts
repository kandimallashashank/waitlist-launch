/**
 * Helpers for waitlist quiz POST idempotency: safe retries vs. true answer changes (retakes).
 */

/**
 * Serializes a JSON-compatible value with sorted object keys (arrays keep element order).
 *
 * Args:
 *   value: Any JSON-serializable quiz fragment.
 *
 * Returns:
 *   Canonical string for stable equality checks.
 */
function canonicalJsonForIdempotency(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonForIdempotency(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonForIdempotency(obj[k])}`,
  );
  return `{${parts.join(",")}}`;
}

/**
 * Returns true when persisted answers match the incoming payload (duplicate submit / retry).
 *
 * Args:
 *   persisted: Row ``answers`` from the database (unknown JSON shape).
 *   incoming: ``body.answers`` from the current request.
 *
 * Returns:
 *   True if payloads are equivalent; false if either is nullish or they differ.
 */
export function waitlistQuizAnswersPayloadEqual(
  persisted: unknown,
  incoming: unknown,
): boolean {
  if (persisted == null || incoming == null) {
    return false;
  }
  try {
    return (
      canonicalJsonForIdempotency(persisted) ===
      canonicalJsonForIdempotency(incoming)
    );
  } catch {
    return false;
  }
}
