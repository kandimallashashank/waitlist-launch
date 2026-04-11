import { NextResponse } from "next/server";

import {
  getWaitlistEmailValidationError,
  normalizeWaitlistEmail,
} from "@/lib/waitlist/emailValidation";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 4000;
const MAX_NAME = 120;
const MAX_COMPANY = 200;
const MAX_PHONE = 32;

const ALLOWED_HEADCOUNT = new Set([
  "under_25",
  "25_100",
  "100_500",
  "500_plus",
  "unsure",
]);

const ALLOWED_OCCASION = new Set([
  "diwali_festive",
  "year_end_thanks",
  "client_partner",
  "team_rewards",
  "other",
]);

const ALLOWED_BUDGET = new Set([
  "exploring",
  "under_2l",
  "2l_10l",
  "10l_plus",
]);

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/**
 * Persists a corporate gifting program lead to Supabase (service role).
 *
 * Public POST: honeypot field rejects bots; no auth required.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ detail: "Invalid request.", code: "BAD_REQUEST" }, { status: 400 });
    }

    const companyName = trimStr(body.company_name, MAX_COMPANY);
    if (!companyName) {
      return NextResponse.json(
        { detail: "Company name is required.", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const emailErr = getWaitlistEmailValidationError(String(body.contact_email ?? ""));
    if (emailErr) {
      return NextResponse.json({ detail: emailErr, code: "VALIDATION" }, { status: 400 });
    }
    const contactEmail = normalizeWaitlistEmail(String(body.contact_email ?? ""));

    const contactName = trimStr(body.contact_name, MAX_NAME);
    const phoneRaw = trimStr(body.phone, MAX_PHONE);
    const phone =
      phoneRaw && /^[\d+\s().-]{6,32}$/.test(phoneRaw) ? phoneRaw.replace(/\s+/g, " ") : null;

    const headcount = typeof body.headcount_band === "string" ? body.headcount_band : "";
    const occasion = typeof body.occasion === "string" ? body.occasion : "";
    const budget = typeof body.budget_band === "string" ? body.budget_band : "";

    if (!ALLOWED_HEADCOUNT.has(headcount)) {
      return NextResponse.json(
        { detail: "Please select a team size.", code: "VALIDATION" },
        { status: 400 },
      );
    }
    if (!ALLOWED_OCCASION.has(occasion)) {
      return NextResponse.json(
        { detail: "Please select an occasion.", code: "VALIDATION" },
        { status: 400 },
      );
    }
    if (!ALLOWED_BUDGET.has(budget)) {
      return NextResponse.json(
        { detail: "Please select a budget band.", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const message = trimStr(body.message, MAX_MESSAGE);

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error("Corporate inquiry Supabase config:", e);
      return NextResponse.json(
        { detail: "Server is not configured.", code: "CONFIG" },
        { status: 500 },
      );
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

    const { error } = await supabase.from("corporate_program_inquiries").insert({
      contact_email: contactEmail,
      contact_name: contactName,
      company_name: companyName,
      phone,
      headcount_band: headcount,
      occasion,
      budget_band: budget,
      message,
      source:
        typeof body.source === "string" && body.source.trim().length > 0
          ? body.source.trim().slice(0, 64)
          : "corporate_gifting_page",
      user_agent: userAgent,
    });

    if (error) {
      console.error("corporate_program_inquiries insert:", error.message);
      return NextResponse.json(
        { detail: "Could not save your request. Try again later.", code: "DB_ERROR" },
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
