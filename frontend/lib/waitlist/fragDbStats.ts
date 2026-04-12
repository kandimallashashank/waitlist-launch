/**
 * Live FragDB scale metrics for the waitlist dashboard (Supabase).
 *
 * Primary path: Postgres RPC ``get_frag_db_stats`` (migration
 * ``20260411120000_get_frag_db_stats_rpc.sql``) — counts active rows in
 * ``perfumes`` plus JSONB-derived notes/accords/similar edges, and row counts
 * for ``brands`` / ``perfumers``. Legacy path keeps old normalized table
 * names for older databases; minimal path returns partial KPIs if both fail.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/** Counts + derived averages returned to the browser. */
export interface FragDbStats {
  fragrances: number;
  notes: number;
  accords: number;
  brands: number;
  perfumers: number;
  /** Mean note pyramid entries per fragrance (top / heart / base). */
  avgMappedNotesPerFragrance: number;
  /** Mean accord strength entries scored per fragrance. */
  avgAccordTraitsPerFragrance: number;
  /** Total community “reminds me of” pairs (shown as a compact headline number). */
  similarScentHintsTotal: number;
  fetchedAt: string;
}

/**
 * Build a single-line description for PostgREST errors (message is often empty).
 *
 * Args:
 *   table: Table that was queried.
 *   error: Supabase select error.
 *
 * Returns:
 *   Human-readable string for logs and thrown Error.
 */
function formatCountError(table: string, error: PostgrestError): string {
  const parts = [
    error.message?.trim(),
    error.code ? `code=${error.code}` : "",
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((s) => Boolean(s && s.length > 0));
  const body = parts.length > 0 ? parts.join(" | ") : JSON.stringify(error);
  return `${table}: ${body}`;
}

/**
 * Count rows in a single table via PostgREST (exact count, no row payload).
 * Retries a few times on failure to smooth transient pool/network blips.
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *   table: Physical table name.
 *
 * Returns:
 *   Row count, or 0 when the API reports null count.
 *
 * Raises:
 *   Error: When PostgREST returns an error for this table after retries.
 */
async function countTable(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  const maxAttempts = 3;
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (!error) {
      return count ?? 0;
    }

    lastError = error;
    if (attempt < maxAttempts - 1) {
      const delayMs = 150 * 2 ** attempt;
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  throw new Error(formatCountError(table, lastError!));
}

/**
 * Count active catalog rows in ``perfumes`` (matches ``v_perfumes_card`` scope).
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *
 * Returns:
 *   Number of rows with ``is_active = true``.
 *
 * Raises:
 *   Error: When PostgREST fails after retries.
 */
async function countActivePerfumes(supabase: SupabaseClient): Promise<number> {
  const label = "perfumes(is_active=true)";
  const maxAttempts = 3;
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { count, error } = await supabase
      .from("perfumes")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (!error) {
      return count ?? 0;
    }

    lastError = error;
    if (attempt < maxAttempts - 1) {
      const delayMs = 150 * 2 ** attempt;
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  throw new Error(formatCountError(label, lastError!));
}

/**
 * Coerce RPC JSON number fields to finite integers.
 *
 * Args:
 *   value: Unknown JSON value.
 *
 * Returns:
 *   Non-negative integer, or 0 when not numeric.
 */
function statInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

/**
 * Parse ``get_frag_db_stats`` RPC payload into ``FragDbStats``.
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *
 * Returns:
 *   Stats when RPC succeeds; null when the function is missing or returns an error.
 */
async function tryFetchFragDbStatsFromRpc(
  supabase: SupabaseClient,
): Promise<FragDbStats | null> {
  const { data, error } = await supabase.rpc("get_frag_db_stats");
  if (error || data == null || typeof data !== "object") {
    return null;
  }
  const row = data as Record<string, unknown>;
  const fragrances = statInt(row.fragrances);
  const notes = statInt(row.notes);
  const accords = statInt(row.accords);
  const brands = statInt(row.brands);
  const perfumers = statInt(row.perfumers);
  const fragranceNotePlacements = statInt(row.fragrance_note_placements);
  const fragranceAccordLinks = statInt(row.fragrance_accord_links);
  const similarityEdges = statInt(row.similar_scent_edges);

  return {
    fragrances,
    notes,
    accords,
    brands,
    perfumers,
    avgMappedNotesPerFragrance: roundOneDecimal(
      safeDivide(fragranceNotePlacements, fragrances),
    ),
    avgAccordTraitsPerFragrance: roundOneDecimal(
      safeDivide(fragranceAccordLinks, fragrances),
    ),
    similarScentHintsTotal: similarityEdges,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Legacy normalized-table counts (older FragDB shape).
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *
 * Returns:
 *   ``FragDbStats`` from table row counts.
 */
async function fetchFragDbStatsLegacy(
  supabase: SupabaseClient,
): Promise<FragDbStats> {
  const [
    fragrances,
    notes,
    accords,
    brands,
    perfumers,
    fragranceNotePlacements,
    fragranceAccordLinks,
    similarityEdges,
  ] = await Promise.all([
    countTable(supabase, "fragrances"),
    countTable(supabase, "notes"),
    countTable(supabase, "accords"),
    countTable(supabase, "brands"),
    countTable(supabase, "perfumers"),
    countTable(supabase, "fragrance_notes"),
    countTable(supabase, "fragrance_accords"),
    countTable(supabase, "fragrance_reminds_of"),
  ]);

  return {
    fragrances,
    notes,
    accords,
    brands,
    perfumers,
    avgMappedNotesPerFragrance: roundOneDecimal(
      safeDivide(fragranceNotePlacements, fragrances),
    ),
    avgAccordTraitsPerFragrance: roundOneDecimal(
      safeDivide(fragranceAccordLinks, fragrances),
    ),
    similarScentHintsTotal: similarityEdges,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Partial KPIs when RPC and legacy paths are unavailable.
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *
 * Returns:
 *   Active perfume count plus ``brands`` / ``perfumers``; other metrics zeroed.
 */
async function fetchFragDbStatsMinimal(
  supabase: SupabaseClient,
): Promise<FragDbStats> {
  const [fragrances, brands, perfumers] = await Promise.all([
    countActivePerfumes(supabase),
    countTable(supabase, "brands"),
    countTable(supabase, "perfumers"),
  ]);

  return {
    fragrances,
    notes: 0,
    accords: 0,
    brands,
    perfumers,
    avgMappedNotesPerFragrance: 0,
    avgAccordTraitsPerFragrance: 0,
    similarScentHintsTotal: 0,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Divide with zero guard.
 *
 * Args:
 *   numerator: Numerator.
 *   denominator: Denominator.
 *
 * Returns:
 *   Ratio, or 0 if denominator is non-positive.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

/**
 * Round to one decimal for display as a KPI.
 *
 * Args:
 *   value: Raw ratio.
 *
 * Returns:
 *   Value rounded to one decimal place.
 */
function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Load table counts and derive customer-facing metrics.
 *
 * Args:
 *   supabase: Service-role Supabase client.
 *
 * Returns:
 *   FragDbStats with ISO timestamp in fetchedAt.
 */
export async function fetchFragDbStats(
  supabase: SupabaseClient,
): Promise<FragDbStats> {
  const fromRpc = await tryFetchFragDbStatsFromRpc(supabase);
  if (fromRpc) {
    return fromRpc;
  }

  try {
    return await fetchFragDbStatsLegacy(supabase);
  } catch {
    return fetchFragDbStatsMinimal(supabase);
  }
}
