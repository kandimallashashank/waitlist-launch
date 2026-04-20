/**
 * Helpers for the pilot follow-up email cron.
 *
 * The cron must behave safely across retries and overlapping runs:
 * 1. Only due rows should be processed.
 * 2. Oldest due rows should be sent first.
 * 3. A row must be claimed before sending so concurrent runs do not double-send.
 * 4. Retries should reuse a stable provider idempotency key.
 */
export interface PilotFollowupPendingRow {
  email: string;
  quiz_completed_at: string | null;
  layering_first_success_at: string | null;
  followup_email_sent_at?: string | null;
  updated_at?: string | null;
}

export interface PilotFollowupCronStats {
  sent: number;
  skipped: number;
  failed: number;
}

interface DuePilotFollowupRow extends PilotFollowupPendingRow {
  readyAtMs: number;
}

interface RunPilotFollowupCronArgs {
  rows: PilotFollowupPendingRow[];
  nowMs: number;
  delayMs: number;
  batchSize: number;
  claimRow: (row: PilotFollowupPendingRow, claimedAtIso: string) => Promise<boolean>;
  sendRow: (row: PilotFollowupPendingRow, idempotencyKey: string) => Promise<boolean>;
  markSent: (row: PilotFollowupPendingRow, sentAtIso: string) => Promise<boolean>;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Return the latest user activity timestamp that should trigger the follow-up.
 *
 * Args:
 *   row: Pending follow-up row.
 *
 * Returns:
 *   Milliseconds since epoch for the latest activity, or null when the row is invalid.
 */
export function getPilotFollowupTriggerMs(
  row: PilotFollowupPendingRow,
): number | null {
  const quizCompletedMs = parseTimestamp(row.quiz_completed_at);
  const layeringFirstSuccessMs = parseTimestamp(row.layering_first_success_at);
  const triggerMs = Math.max(quizCompletedMs ?? 0, layeringFirstSuccessMs ?? 0);

  return triggerMs > 0 ? triggerMs : null;
}

/**
 * Pick due rows and order them from oldest-ready to newest-ready.
 *
 * Args:
 *   rows: Raw pending rows from Supabase.
 *   nowMs: Current wall-clock time in milliseconds.
 *   delayMs: Required delay after latest activity.
 *   batchSize: Maximum rows to process in one cron run.
 *
 * Returns:
 *   Due rows in deterministic send order.
 */
export function selectDuePilotFollowupRows(
  rows: PilotFollowupPendingRow[],
  nowMs: number,
  delayMs: number,
  batchSize: number,
): DuePilotFollowupRow[] {
  return rows
    .map((row) => {
      const triggerMs = getPilotFollowupTriggerMs(row);
      if (triggerMs == null) {
        return null;
      }

      const readyAtMs = triggerMs + delayMs;
      if (readyAtMs > nowMs) {
        return null;
      }

      return { ...row, readyAtMs };
    })
    .filter((row): row is DuePilotFollowupRow => row != null)
    .sort((left, right) => left.readyAtMs - right.readyAtMs)
    .slice(0, Math.max(batchSize, 0));
}

/**
 * Build a stable Resend idempotency key for a one-time pilot follow-up.
 *
 * Args:
 *   email: Recipient email address.
 *
 * Returns:
 *   Deterministic idempotency key safe to reuse across retries.
 */
export function buildPilotFollowupIdempotencyKey(email: string): string {
  return `pilot-followup/${email.trim().toLowerCase()}`;
}

/**
 * Run one cron batch with claim-before-send semantics.
 *
 * Args:
 *   args: Batch rows and side-effect callbacks.
 *
 * Returns:
 *   Aggregate send/skip/failure counts for the cron response.
 */
export async function runPilotFollowupCron(
  args: RunPilotFollowupCronArgs,
): Promise<PilotFollowupCronStats> {
  const dueRows = selectDuePilotFollowupRows(
    args.rows,
    args.nowMs,
    args.delayMs,
    args.batchSize,
  );
  let skipped = args.rows.length - dueRows.length;
  let sent = 0;
  let failed = 0;

  for (const row of dueRows) {
    const claimedAtIso = new Date(args.nowMs).toISOString();
    const claimed = await args.claimRow(row, claimedAtIso);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const idempotencyKey = buildPilotFollowupIdempotencyKey(row.email);
    const accepted = await args.sendRow(row, idempotencyKey);
    if (!accepted) {
      failed += 1;
      continue;
    }

    const sentAtIso = new Date(args.nowMs).toISOString();
    const markedSent = await args.markSent(row, sentAtIso);
    if (!markedSent) {
      failed += 1;
      continue;
    }

    sent += 1;
  }

  return { sent, skipped, failed };
}
