import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { buildPilotFollowupEmail } from "@/lib/email/waitlistPilotFollowup";
import { buildScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";
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

    const { data: quizPrefRows } = await supabase
      .from("waitlist_quiz_preferences")
      .select("recommendation_snapshot, preference_analytics, answers")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1);
    const quizPref = quizPrefRows?.[0] as
      | {
          recommendation_snapshot?: unknown;
          preference_analytics?: unknown;
          answers?: unknown;
        }
      | undefined;

    const { data: giftPrefRows } = await supabase
      .from("waitlist_gift_preferences")
      .select("recommendation_snapshot, preference_analytics, derived_quiz_answers")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1);
    const giftPref = giftPrefRows?.[0] as
      | {
          recommendation_snapshot?: unknown;
          preference_analytics?: unknown;
          derived_quiz_answers?: unknown;
        }
      | undefined;

    const quizSnap = quizPref?.recommendation_snapshot;
    const giftSnap = giftPref?.recommendation_snapshot;
    const snap =
      Array.isArray(quizSnap) && quizSnap.length > 0
        ? quizSnap
        : Array.isArray(giftSnap)
          ? giftSnap
          : [];

    const quizPicks = Array.isArray(snap)
      ? snap.slice(0, 3).map(
          (p: {
            name?: string;
            brand?: string;
            image_url?: string | null;
            primary_image_url?: string | null;
          }) => ({
            name: typeof p.name === "string" ? p.name : "",
            brand: typeof p.brand === "string" ? p.brand : "",
            image_url:
              (typeof p.image_url === "string" ? p.image_url : null) ||
              (typeof p.primary_image_url === "string" ? p.primary_image_url : null),
          }),
        )
      : [];

    const preferenceAnalytics =
      (quizPref?.preference_analytics ??
        giftPref?.preference_analytics ??
        null) as Record<string, unknown> | null;
    const answersPayload =
      (quizPref?.answers ?? giftPref?.derived_quiz_answers ?? null) as
        | Record<string, unknown>
        | null;
    const scentDna = buildScentDnaCardData(preferenceAnalytics, answersPayload);

    const { data: layerRows } = await supabase
      .from("waitlist_layering_events")
      .select("summary_snippet, harmony_score, harmony_label, fragrance_names, fragrance_images")
      .eq("email", email)
      .eq("success", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastLayer = layerRows?.[0] as
      | {
          summary_snippet?: string | null;
          harmony_score?: number | null;
          harmony_label?: string | null;
          fragrance_names?: string[] | null;
          fragrance_images?: (string | null)[] | null;
        }
      | undefined;

    const scentDnaVariant: "quiz" | "gift" =
      quizPref?.answers != null ? "quiz" : "gift";

    const { subject, html, text } = buildPilotFollowupEmail({
      displayName: display,
      quizPicks,
      scentDna,
      scentDnaVariant,
      layeringSummary: lastLayer?.summary_snippet ?? null,
      layeringScore:
        typeof lastLayer?.harmony_score === "number"
          ? lastLayer.harmony_score
          : null,
      layeringLabel:
        typeof lastLayer?.harmony_label === "string"
          ? lastLayer.harmony_label
          : null,
      layeringFragranceNames: Array.isArray(lastLayer?.fragrance_names)
        ? lastLayer.fragrance_names.filter((n): n is string => typeof n === "string")
        : undefined,
      layeringFragranceImages: Array.isArray(lastLayer?.fragrance_images)
        ? lastLayer.fragrance_images
        : undefined,
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
