/**
 * Layering harmony via Groq OpenAI-compatible API (waitlist preview).
 */

import { fetchFragranceDetailFromSupabase } from "@/lib/waitlist/supabaseFragranceCatalog";
import { getSupabaseAdmin } from "@/lib/waitlist/serverActions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const WAITLIST_LAYERING_LIFETIME_LIMIT = 5;

/**
 * Load fragrance row from Supabase for Groq context (no FastAPI).
 *
 * Args:
 *   id: Fragrance UUID.
 *
 * Returns:
 *   Row or null if missing / misconfigured.
 */
async function fetchFragranceDetail(
  id: string,
): Promise<Record<string, unknown> | null> {
  try {
    const supabase = getSupabaseAdmin();
    return await fetchFragranceDetailFromSupabase(supabase, id);
  } catch {
    return null;
  }
}

const SYSTEM = `You are a fragrance layering analyst. Given 1-3 perfumes (notes, accords, concentration), respond with ONLY valid JSON (no markdown):
{
  "harmony_score": number 0-100,
  "harmony_label": "Exceptional"|"Excellent"|"Harmonious"|"Compatible"|"Adventurous"|"Contrasting",
  "harmony_description": "one sentence",
  "compatibility_score": number|null,
  "compatibility_label": string|null,
  "compatibility_reasons": string[],
  "summary": "2 short sentences max",
  "tips": ["tip1","tip2","tip3"],
  "dominant_accords": [{"accord":"string","count":1,"dominance_pct":25,"descriptor":"short"}],
  "blended_notes": {"top":[],"middle":[],"base":[]},
  "performance": {"sillage":1-10,"longevity_hours":1-24,"gender_score":1-10,"gender_label":"Masculine"|"Feminine"|"Unisex"},
  "best_seasons": [{"season":"string","score":0-100}],
  "best_occasions": [{"occasion":"string","score":0-100}],
  "balance_note": "one sentence",
  "heritage_match": null,
  "score_components": {"shared_notes":0,"shared_accords":0,"concentration_harmony":0,"gender_harmony":0,"performance_balance":0,"heritage_bonus":0},
  "blend_insights": {
    "compliment_potential": {"score":0,"label":"Moderate","crowd_pleasing_accords_detected":[],"rationale":""},
    "fatigue_risk": {"level":"Low","rationale":"","signals":[]},
    "projection_curve": {"pattern":"","headline":"","detail":""},
    "longevity_stability": {"evenness":"","rationale":"","longest_lingering":null},
    "clash_warnings": [],
    "synergy_highlights": [],
    "climate_suitability": {"hot_humid":"","cold_dry":"","overall_tip":""},
    "time_of_day_fit": {"morning":0,"daytime":0,"evening":0,"night":0,"summary":""}
  }
}`;

/**
 * Run Groq harmony analysis for fragrance ids.
 *
 * Args:
 *   fragranceIds: 1–3 UUIDs.
 *   userContext: Optional quiz summary string for compatibility.
 *
 * Returns:
 *   Parsed analysis object for the layering UI.
 *
 * Raises:
 *   Error: When Groq is unconfigured or HTTP fails.
 */
export async function analyzeLayeringWithGroq(
  fragranceIds: string[],
  userContext?: string,
): Promise<Record<string, unknown>> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  const frags: Record<string, unknown>[] = [];
  for (const id of fragranceIds) {
    const row = await fetchFragranceDetail(id);
    if (!row) {
      throw new Error(`Unknown fragrance: ${id}`);
    }
    frags.push(row);
  }

  const userMsg = JSON.stringify({
    fragrances: frags.map((r) => ({
      id: r.id,
      name: r.name,
      brand_name: r.brand_name ?? r.brand,
      concentration: r.concentration ?? r.type,
      scent_family: r.scent_family,
      main_accords: r.main_accords,
      notes_top: r.notes_top,
      notes_middle: r.notes_middle,
      notes_base: r.notes_base,
      sillage: r.sillage,
      longevity_hours: r.longevity_hours,
      gender_score: r.gender_score,
    })),
    user_context: userContext ?? null,
  });

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq error ${res.status}: ${t.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = body.choices?.[0]?.message?.content ?? "";
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    throw new Error("Groq returned non-JSON");
  }

  return buildAnalysisResult(parsed, frags);
}

function mapFragrance(row: Record<string, unknown>): Record<string, unknown> {
  const id = String(row.id ?? "");
  const img = row.primary_image_url ?? row.image_url;
  const brandName =
    typeof row.brand_name === "string"
      ? row.brand_name
      : typeof row.brand === "string"
        ? row.brand
        : "";
  return {
    id,
    name: typeof row.name === "string" ? row.name : "Fragrance",
    brand_name: brandName,
    primary_image_url: typeof img === "string" ? img : undefined,
    price_3ml: typeof row.price_3ml === "number" ? row.price_3ml : undefined,
    price_8ml: typeof row.price_8ml === "number" ? row.price_8ml : undefined,
    price_12ml: typeof row.price_12ml === "number" ? row.price_12ml : undefined,
    scent_family: typeof row.scent_family === "string" ? row.scent_family : undefined,
    sillage: typeof row.sillage === "number" ? row.sillage : undefined,
    longevity_hours:
      typeof row.longevity_hours === "number" ? row.longevity_hours : undefined,
    gender_score: typeof row.gender_score === "number" ? row.gender_score : undefined,
    main_accords: Array.isArray(row.main_accords)
      ? row.main_accords.filter((x): x is string => typeof x === "string")
      : undefined,
    notes_top: Array.isArray(row.notes_top)
      ? row.notes_top.filter((x): x is string => typeof x === "string")
      : undefined,
    notes_middle: Array.isArray(row.notes_middle)
      ? row.notes_middle.filter((x): x is string => typeof x === "string")
      : undefined,
    notes_base: Array.isArray(row.notes_base)
      ? row.notes_base.filter((x): x is string => typeof x === "string")
      : undefined,
    concentration:
      typeof row.concentration === "string"
        ? row.concentration
        : typeof row.type === "string"
          ? row.type
          : undefined,
  };
}

function buildAnalysisResult(
  ai: Record<string, unknown>,
  frags: Record<string, unknown>[],
): Record<string, unknown> {
  const fragrances = frags.map(mapFragrance);
  const harmony_score = Number(ai.harmony_score) || 50;
  return {
    harmony_score,
    harmony_label: ai.harmony_label ?? "Compatible",
    harmony_description: ai.harmony_description ?? "",
    compatibility_score:
      typeof ai.compatibility_score === "number" ? ai.compatibility_score : null,
    compatibility_label: ai.compatibility_label ?? null,
    compatibility_reasons: Array.isArray(ai.compatibility_reasons)
      ? ai.compatibility_reasons.filter((x): x is string => typeof x === "string")
      : [],
    ai_powered: true,
    dominant_accords: Array.isArray(ai.dominant_accords)
      ? ai.dominant_accords
      : [],
    blended_notes: ai.blended_notes ?? { top: [], middle: [], base: [] },
    performance: ai.performance ?? {
      sillage: 5,
      longevity_hours: 6,
      gender_score: 5,
      gender_label: "Unisex",
    },
    best_seasons: Array.isArray(ai.best_seasons) ? ai.best_seasons : [],
    best_occasions: Array.isArray(ai.best_occasions) ? ai.best_occasions : [],
    summary: typeof ai.summary === "string" ? ai.summary : "",
    tips: Array.isArray(ai.tips)
      ? ai.tips.filter((x): x is string => typeof x === "string")
      : [],
    fragrance_count: fragrances.length,
    fragrances,
    score_components: ai.score_components,
    heritage_match: ai.heritage_match ?? null,
    balance_note: ai.balance_note ?? "",
    blend_insights: ai.blend_insights ?? null,
  };
}
