import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

/** Tag stored when the user dismisses the pilot survey without filling fields (one-time flow). */
const DISMISSED_TAG = "pilot_survey_dismissed";

async function requireWaitlistSurveyContext(req: Request) {
  const email = await getWaitlistEmailFromRequest(req);
  if (!email) {
    return {
      error: NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    console.error(e);
    return {
      error: NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500 },
      ),
    };
  }

  if (!(await isEmailOnWaitlist(supabase, email))) {
    return {
      error: NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  return { email, supabase };
}

/**
 * Whether this waitlist email already submitted or dismissed the post-quiz survey (one per user).
 */
export async function GET(req: Request) {
  const ctx = await requireWaitlistSurveyContext(req);
  if ("error" in ctx) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("waitlist_quiz_survey")
    .select("id")
    .eq("email", ctx.email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { detail: "Could not load survey state", code: "DB_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ completed: Boolean(data) });
}

/**
 * Post-quiz pilot feedback survey. At most one row per email; repeats return ok without inserting again.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireWaitlistSurveyContext(req);
    if ("error" in ctx) return ctx.error;

    const { email, supabase } = ctx;

    const { data: existing, error: selErr } = await supabase
      .from("waitlist_quiz_survey")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (selErr) {
      console.error(selErr);
      return NextResponse.json(
        { detail: "Could not save survey", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const body = (await req.json().catch(() => ({}))) as {
      skipped?: boolean;
      too_long_rating?: number;
      irrelevant_tags?: string[];
      free_text?: string;
    };

    const skipped = body.skipped === true;
    const tags = Array.isArray(body.irrelevant_tags)
      ? body.irrelevant_tags.filter((x): x is string => typeof x === "string")
      : [];

    const { error } = await supabase.from("waitlist_quiz_survey").insert({
      email,
      too_long_rating: skipped
        ? null
        : typeof body.too_long_rating === "number"
          ? Math.min(5, Math.max(1, Math.round(body.too_long_rating)))
          : null,
      irrelevant_tags: skipped ? [DISMISSED_TAG] : tags,
      free_text:
        skipped
          ? null
          : typeof body.free_text === "string"
            ? body.free_text.slice(0, 2000)
            : null,
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { detail: "Could not save survey", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { detail: "Survey failed", code: "ERROR" },
      { status: 500 },
    );
  }
}
