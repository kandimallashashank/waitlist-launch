import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPilotFollowupIdempotencyKey,
  runPilotFollowupCron,
  selectDuePilotFollowupRows,
  type PilotFollowupPendingRow,
} from "./pilotFollowupCron.ts";

const NOW_MS = Date.parse("2026-04-20T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

function buildRow(
  email: string,
  quizCompletedAt: string | null,
): PilotFollowupPendingRow {
  return {
    email,
    quiz_completed_at: quizCompletedAt,
    layering_first_success_at: null,
    followup_email_sent_at: null,
    updated_at: "2026-04-19T00:00:00.000Z",
  };
}

test("selectDuePilotFollowupRows keeps only due rows and orders oldest first", () => {
  const rows = [
    buildRow("newest@example.com", "2026-04-19T20:00:00.000Z"),
    buildRow("oldest@example.com", "2026-04-18T20:00:00.000Z"),
    buildRow("not-due@example.com", "2026-04-19T23:30:00.000Z"),
  ];

  const dueRows = selectDuePilotFollowupRows(rows, NOW_MS, HOUR_MS, 10);

  assert.deepEqual(
    dueRows.map((row) => row.email),
    ["oldest@example.com", "newest@example.com"],
  );
});

test("runPilotFollowupCron skips send when another worker already claimed the row", async () => {
  const sentEmails: string[] = [];

  const stats = await runPilotFollowupCron({
    rows: [buildRow("claimed@example.com", "2026-04-19T20:00:00.000Z")],
    nowMs: NOW_MS,
    delayMs: HOUR_MS,
    batchSize: 10,
    claimRow: async () => false,
    sendRow: async (row) => {
      sentEmails.push(row.email);
      return true;
    },
    markSent: async () => true,
  });

  assert.equal(sentEmails.length, 0);
  assert.deepEqual(stats, { sent: 0, skipped: 1, failed: 0 });
});

test("runPilotFollowupCron only marks sent after the provider accepts the email", async () => {
  const markedSent: string[] = [];
  const sentKeys: string[] = [];

  const stats = await runPilotFollowupCron({
    rows: [buildRow("retry@example.com", "2026-04-19T20:00:00.000Z")],
    nowMs: NOW_MS,
    delayMs: HOUR_MS,
    batchSize: 10,
    claimRow: async () => true,
    sendRow: async (row, idempotencyKey) => {
      sentKeys.push(`${row.email}:${idempotencyKey}`);
      return false;
    },
    markSent: async (row) => {
      markedSent.push(row.email);
      return true;
    },
  });

  assert.deepEqual(sentKeys, [
    "retry@example.com:pilot-followup/retry@example.com",
  ]);
  assert.deepEqual(markedSent, []);
  assert.deepEqual(stats, { sent: 0, skipped: 0, failed: 1 });
});

test("buildPilotFollowupIdempotencyKey normalizes email casing", () => {
  assert.equal(
    buildPilotFollowupIdempotencyKey("  Person@Example.com "),
    "pilot-followup/person@example.com",
  );
});
