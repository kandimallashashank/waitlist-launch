import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { buildPilotFollowupEmail } from "@/lib/email/waitlistPilotFollowup";
import {
  getSupabaseAdmin,
  sendViaResend,
} from "@/lib/waitlist/serverActions";

/**
 * Vercel Cron: send pilot thank-you + snapshot email after delay from last activity.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const delayHours = Number.parseFloat(
    process.env.WAITLIST_PILOT_FOLLOWUP_DELAY_HOURS ?? "3.5",
  );
  const delayMs = (Number.isFinite(delayHours) ? delayHours : 3.5) * 3600 * 1000;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ detail: "Config" }, { status: 500 });
  }

  const { data: rows, error } = await supabase
    .from("waitlist_pilot_followup")
    .select("email, quiz_completed_at, layering_first_success_at, followup_email_sent_at")
    .is("followup_email_sent_at", null);

  if (error) {
    console.error(error);
    return NextResponse.json({ detail: "DB error" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const email = row.email as string;
    const q = row.quiz_completed_at
      ? new Date(row.quiz_completed_at as string).getTime()
      : null;
    const l = row.layering_first_success_at
      ? new Date(row.layering_first_success_at as string).getTime()
      : null;
    if (q == null && l == null) {
      skipped += 1;
      continue;
    }
    const t = Math.max(q ?? 0, l ?? 0);
    if (t === 0) {
      skipped += 1;
      continue;
    }
    if (Date.now() < t + delayMs) {
      skipped += 1;
      continue;
    }

    const { data: wlRows } = await supabase
      .from("waitlist")
      .select("full_name, email")
      .eq("email", email)
      .limit(1);
    const wlRow = wlRows?.[0] as { full_name?: string | null } | undefined;

    const display =
      (wlRow?.full_name as string | undefined)?.trim() ||
      email.split("@")[0] ||
      "there";

    const { data: prefRows } = await supabase
      .from("waitlist_quiz_preferences")
      .select("recommendation_snapshot")
      .eq("email", email)
      .limit(1);
    const prefs = prefRows?.[0];

    const snap = prefs?.recommendation_snapshot as
      | Array<{ name?: string; brand?: string }>
      | undefined;
    const quizPicks = Array.isArray(snap)
      ? snap.slice(0, 3).map((p) => ({
          name: typeof p.name === "string" ? p.name : "",
          brand: typeof p.brand === "string" ? p.brand : "",
        }))
      : [];

    const { data: layerRows } = await supabase
      .from("waitlist_layering_events")
      .select("summary_snippet, harmony_score, harmony_label")
      .eq("email", email)
      .eq("success", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastLayer = layerRows?.[0] as
      | {
          summary_snippet?: string | null;
          harmony_score?: number | null;
          harmony_label?: string | null;
        }
      | undefined;

    const { subject, html, text } = buildPilotFollowupEmail({
      displayName: display,
      quizPicks,
      layeringSummary: lastLayer?.summary_snippet ?? null,
      layeringScore:
        typeof lastLayer?.harmony_score === "number"
          ? lastLayer.harmony_score
          : null,
      layeringLabel:
        typeof lastLayer?.harmony_label === "string"
          ? lastLayer.harmony_label
          : null,
    });

    const ok = await sendViaResend(email, subject, html, text);
    if (!ok) {
      console.error("Pilot email failed for", email);
      continue;
    }

    const { error: upErr } = await supabase
      .from("waitlist_pilot_followup")
      .update({ followup_email_sent_at: new Date().toISOString() })
      .eq("email", email);

    if (upErr) {
      console.error("Failed to mark pilot email sent", email, upErr);
      continue;
    }
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
