import { NextResponse } from "next/server";

import {
  getWaitlistEmailValidationError,
  normalizeWaitlistEmail,
} from "@/lib/waitlist/emailValidation";
import {
  WAITLIST_SESSION_COOKIE,
  signWaitlistSessionJwt,
} from "@/lib/waitlist/sessionJwt";
import { completeWaitlistSignup, getSupabaseAdmin } from "@/lib/waitlist/serverActions";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

interface WaitlistPayload {
  email?: string;
  full_name?: string;
}

/**
 * Waitlist signup: Supabase persistence + Resend coupon email (server-only).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as WaitlistPayload;
    const fullName = String(body.full_name ?? "").trim() || undefined;

    const emailErr = getWaitlistEmailValidationError(String(body.email ?? ""));
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }
    const rawEmail = normalizeWaitlistEmail(String(body.email ?? ""));

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error("Waitlist Supabase config:", e);
      return NextResponse.json(
        { error: "Waitlist is not configured." },
        { status: 500 },
      );
    }

    const { data: priorRows, error: priorErr } = await supabase
      .from("waitlist")
      .select("coupon_code")
      .eq("email", rawEmail)
      .limit(1);

    if (priorErr) {
      console.error("Waitlist prior lookup:", priorErr.message);
      return NextResponse.json(
        { error: "Could not complete signup. Please try again later." },
        { status: 500 },
      );
    }

    const existingRow = priorRows?.[0] as { coupon_code?: string } | undefined;
    const hadCouponBefore = Boolean(existingRow?.coupon_code);
    /** True if this email was on the waitlist before this request (for client messaging). */
    const alreadyOnWaitlist = Boolean(existingRow);

    let result;
    try {
      result = await completeWaitlistSignup(rawEmail, fullName, hadCouponBefore);
    } catch (err) {
      console.error("Waitlist signup error:", err);
      return NextResponse.json(
        { error: "Could not save your signup. Please try again later." },
        { status: 500 },
      );
    }

    let sessionToken: string;
    try {
      sessionToken = await signWaitlistSessionJwt(rawEmail);
    } catch (e) {
      console.error("Waitlist session JWT:", e);
      return NextResponse.json(
        { error: "Waitlist session is not configured." },
        { status: 500 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      already: alreadyOnWaitlist,
      emailSent: result.emailSent,
      couponCode: result.couponCode,
      discountPercent: result.discountPercent,
      /** Same JWT as httpOnly cookie; use Authorization: Bearer for preview APIs if cookies fail. */
      previewSessionToken: sessionToken,
    });
    res.cookies.set(WAITLIST_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
