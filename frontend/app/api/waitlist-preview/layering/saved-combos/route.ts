/**
 * Pilot Layering Lab: persist up to 5 saved blend snapshots per waitlist email.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";
import {
  getWaitlistEmailFromRequest,
  isEmailOnWaitlist,
} from "@/lib/waitlist/session";

const MAX_SAVED = 5;

function comboKey(fragranceIds: string[]): string {
  return [...fragranceIds].sort().join("|");
}

function isSavedComboEntry(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * List saved blends for the current waitlist session.
 *
 * Args:
 *   req: Incoming request (cookie or Bearer JWT).
 *
 * Returns:
 *   JSON `{ combos, count, max }`.
 */
export async function GET(req: Request) {
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

    const { data, error } = await supabase
      .from("waitlist_saved_layering_combos")
      .select("combos")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { detail: "Could not load saved blends", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    const raw = data?.combos;
    const combos = Array.isArray(raw) ? raw.filter(isSavedComboEntry) : [];
    return NextResponse.json({
      combos,
      count: combos.length,
      max: MAX_SAVED,
    });
  } catch (err) {
    console.error("saved-combos GET:", err);
    return NextResponse.json(
      { detail: "Unexpected error", code: "SERVER" },
      { status: 500 },
    );
  }
}

/**
 * Save the current blend snapshot (dedupes by fragrance id set, cap at 5).
 *
 * Args:
 *   req: JSON body with fragrance_ids, names, harmony_score, optional analysis fields.
 *
 * Returns:
 *   JSON `{ combos, count, max }`.
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
      fragrance_ids?: unknown;
      fragrance_names?: unknown;
      fragrance_brands?: unknown;
      fragrance_images?: unknown;
      harmony_score?: unknown;
      summary?: unknown;
      dominant_accords?: unknown;
      performance?: unknown;
      best_seasons?: unknown;
      best_occasions?: unknown;
    };

    const ids = Array.isArray(body.fragrance_ids)
      ? body.fragrance_ids.filter((x): x is string => typeof x === "string")
      : [];
    if (ids.length < 1 || ids.length > 3) {
      return NextResponse.json(
        { detail: "Provide 1–3 fragrance_ids", code: "VALIDATION" },
        { status: 400 },
      );
    }

    const names = Array.isArray(body.fragrance_names)
      ? body.fragrance_names.filter((x): x is string => typeof x === "string")
      : [];
    const brands = Array.isArray(body.fragrance_brands)
      ? body.fragrance_brands.filter((x): x is string => typeof x === "string")
      : [];
    const images = Array.isArray(body.fragrance_images)
      ? body.fragrance_images
          .filter((x): x is string => typeof x === "string")
          .map((u) => u.slice(0, 2000))
      : [];

    const harmony =
      typeof body.harmony_score === "number" && Number.isFinite(body.harmony_score)
        ? body.harmony_score
        : Number(body.harmony_score) || 0;

    const summary =
      typeof body.summary === "string" ? body.summary.slice(0, 2000) : "";

    const newEntry = {
      fragrance_ids: ids,
      fragrance_names: names,
      fragrance_brands: brands,
      fragrance_images: images.slice(0, 3),
      harmony_score: harmony,
      summary,
      dominant_accords: body.dominant_accords ?? [],
      performance: body.performance ?? null,
      best_seasons: body.best_seasons ?? [],
      best_occasions: body.best_occasions ?? [],
      saved_at: new Date().toISOString(),
    };

    const key = comboKey(ids);

    const { data: row, error: readErr } = await supabase
      .from("waitlist_saved_layering_combos")
      .select("combos")
      .eq("email", email)
      .maybeSingle();

    if (readErr) {
      console.error(readErr);
      return NextResponse.json(
        { detail: "Could not read saved blends", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    const rawExisting = row?.combos;
    let combos: Record<string, unknown>[] = Array.isArray(rawExisting)
      ? rawExisting.filter(isSavedComboEntry)
      : [];

    combos = combos.filter((c) => {
      const cids = c.fragrance_ids;
      if (!Array.isArray(cids)) return true;
      const sid = cids.filter((x): x is string => typeof x === "string");
      return comboKey(sid) !== key;
    });

    combos.unshift(newEntry);
    combos = combos.slice(0, MAX_SAVED);

    const { error: upsertErr } = await supabase
      .from("waitlist_saved_layering_combos")
      .upsert(
        {
          email,
          combos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

    if (upsertErr) {
      console.error(upsertErr);
      return NextResponse.json(
        { detail: "Could not save blend", code: "DB_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      combos,
      count: combos.length,
      max: MAX_SAVED,
    });
  } catch (err) {
    console.error("saved-combos POST:", err);
    return NextResponse.json(
      { detail: "Unexpected error", code: "SERVER" },
      { status: 500 },
    );
  }
}
