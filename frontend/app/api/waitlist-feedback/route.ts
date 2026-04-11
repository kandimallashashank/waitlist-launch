import { NextResponse } from "next/server";

import {
  getWaitlistEmailValidationError,
  normalizeWaitlistEmail,
} from "@/lib/waitlist/emailValidation";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 5000;
const MAX_PAGE_URL = 500;
const ALLOWED_CATEGORY = new Set(["general", "bug", "idea", "other"]);

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") {
    return null;
  }
  const t = v.trim();
  if (!t) {
    return null;
  }
  return t.slice(0, max);
}

/**
 * Persists waitlist pilot feedback to Supabase (service role).
 *
 * Public POST: honeypot rejects bots; optional email; no auth required.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ detail: "Invalid request.", code: "BAD_REQUEST" }, { status: 400 });
    }

    const messageRaw = trimStr(body.message, MAX_MESSAGE);
    if (!messageRaw || messageRaw.length < 3) {
      return NextResponse.json(
        { detail: "Please enter at least a few words of feedback.", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const category =
      typeof body.category === "string" && ALLOWED_CATEGORY.has(body.category)
        ? body.category
        : "general";

    let emailOut: string | null = null;
    const emailIn = body.email;
    if (emailIn != null && String(emailIn).trim() !== "") {
      const err = getWaitlistEmailValidationError(String(emailIn));
      if (err) {
        return NextResponse.json({ detail: err, code: "VALIDATION" }, { status: 400 });
      }
      emailOut = normalizeWaitlistEmail(String(emailIn));
    }

    const pageUrl = trimStr(body.page_url, MAX_PAGE_URL);

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error("waitlist-feedback Supabase config:", e);
      return NextResponse.json(
        { detail: "Server is not configured.", code: "CONFIG" },
        { status: 500 },
      );
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

    const { error } = await supabase.from("waitlist_feedback").insert({
      email: emailOut,
      message: messageRaw,
      category,
      page_url: pageUrl,
      user_agent: userAgent,
      source:
        typeof body.source === "string" && body.source.trim().length > 0
          ? body.source.trim().slice(0, 64)
          : "waitlist_landing",
    });

    if (error) {
      console.error("waitlist_feedback insert:", error.message);
      return NextResponse.json(
        { detail: "Could not save feedback. Try again later.", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { detail: "Something went wrong.", code: "ERROR" },
      { status: 500 },
    );
  }
}
