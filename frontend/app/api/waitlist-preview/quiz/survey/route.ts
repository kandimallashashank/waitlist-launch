import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

/**
 * Post-quiz pilot feedback survey.
 */
export async function POST(req: Request) {
  try {
    const email = await getWaitlistEmailFromRequest(req);
    if (!email) {
      return NextResponse.json(
        { detail: "Waitlist session required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { detail: "Server misconfigured", code: "CONFIG" },
        { status: 500 },
      );
    }

    if (!(await isEmailOnWaitlist(supabase, email))) {
      return NextResponse.json(
        { detail: "Email not on waitlist", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      too_long_rating?: number;
      irrelevant_tags?: string[];
      free_text?: string;
    };

    const { error } = await supabase.from("waitlist_quiz_survey").insert({
      email,
      too_long_rating:
        typeof body.too_long_rating === "number"
          ? Math.min(5, Math.max(1, Math.round(body.too_long_rating)))
          : null,
      irrelevant_tags: Array.isArray(body.irrelevant_tags)
        ? body.irrelevant_tags.filter((x): x is string => typeof x === "string")
        : [],
      free_text:
        typeof body.free_text === "string"
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
