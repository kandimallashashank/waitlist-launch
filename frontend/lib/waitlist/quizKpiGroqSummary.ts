/**
 * Optional Groq chat completion for quiz KPI analytics (matches FastAPI quiz_kpi_summary_llm).
 */

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";
import { buildGiftGroqStyleHints } from "@/lib/waitlist/giftGroqStyleHints";
import type { WaitlistGiftAnswersInput } from "@/lib/waitlist/giftToQuizPayload";
import type { QuizAnswersPayload } from "@/lib/waitlist/quizPipeline";

/** Room for one paragraph; override with ``GROQ_KPI_SUMMARY_MAX_TOKENS``. */
const DEFAULT_GROQ_KPI_SUMMARY_MAX_TOKENS = 220;

const SYSTEM_PROMPT_QUIZ = `You write one short paragraph for someone in India who just finished our fragrance quiz and is looking at their match list.

Your job is to explain in plain, warm language why a thoughtful shop would steer them toward fragrances like the ones we are showing, using only what is in the JSON. Sound human, like a friend at the counter, not a checklist.

Tone: simple everyday words (smart 12-year-old can follow). Never say sillage, projection, accord, or dry-down; say how far the smell carries, how long it lasts, or name smells plainly (citrus, wood, vanilla). Address the reader as you and your. Use we or us when you explain what we did with their answers (for example we looked for, we leaned toward).

Rules:
- One paragraph only: three to five sentences, flowing prose.
- No bullet points, no numbered lists, no line breaks, no markdown, no title, no quotes around the whole reply.
- Do not quote JSON field names or say "the score says."
- Never use em dashes; use commas, periods, or "and" instead.

Few-shot (Input mimics the real JSON; Ideal paragraph is the target):

Example 1
Input:
{"archetype_focus_label":"Signature-focused","performance_appetite_label":"Moderate presence","occasion_versatility_score":55,"season_versatility_score":40,"pyramid":{"dominant_layer_label":"Opening-forward"}}
Ideal paragraph:
That is why we would pull bottles where the first impression feels clear and memorable, because you like having a defined scent personality and you notice the opening most. We would also keep the strength in a polite middle ground for you, easy to wear at work or out, without filling a whole room. Your answers suggest you care about fitting different days and seasons a little, so we would not lock you into one extreme lane.

Example 2
Input:
{"archetype_focus_label":"Wide explorer","performance_appetite_label":"Soft presence","occasion_versatility_score":82,"season_versatility_score":72,"pyramid":{"dominant_layer_label":"Balanced pyramid"}}
Ideal paragraph:
We would reach for a spread of personalities rather than one signature type, because you enjoy variety and you said you like fragrance for lots of different moments. You also told us you prefer things that stay closer to the skin, so we would favor picks that feel gentle and personal instead of loud. Season and occasion flexibility matter to you, so we would look for wears that can move with your week without feeling stuck.

Example 3
Input:
{"archetype_focus_label":"Balanced explorer","performance_appetite_label":"Bold presence","occasion_versatility_score":44,"season_versatility_score":38,"pyramid":{"dominant_layer_label":"Base-forward"}}
Ideal paragraph:
You mix curiosity with a bit of focus, and you fall for the part of a scent that lingers longest, the cozy dry woods, vanilla, or soft musk kinds of stories. That is why we would emphasize bases that reward patience, not only the first spray. You are fine if people notice you from a little farther away, so we would not shy away from presence, and we would keep the list a little narrower on occasion and season so it still feels like you.`;

/**
 * Gift flow: third-person copy for the buyer, grounded in selected notes/families + KPIs.
 * Few-shots teach mapping from quiz signals → short blurbs without inventing notes.
 */
const SYSTEM_PROMPT_GIFT = `You write two short sentences for someone buying a fragrance gift in India.

The reader is the gift-giver. Describe the recipient only as they / them / their (never "you" for the recipient).

Write the way you would text a friend who asked what to buy: short, specific, a little warmth, zero brochure voice. If it sounds like a product listing or like ChatGPT, rewrite it.

Tone: simple everyday words (smart 12-year-old). Forbidden words and phrases (do not print these at all, even in a joke): sillage, projection, accord, dry-down, moderate-projection, base-forward, heart-forward, opening-forward, any hyphen stuck between two perfume-tech words.

Say strength in plain English: stays close, fills a bit of space, easy to notice from a step away, lasts a few hours, hangs around all day. Say smells with the real names from the JSON (bergamot, cedar, vanilla, and so on).

Banned patterns:
- No "something - think something" or any dash used as a dramatic pause. Use a comma, "so", "and", or start the next sentence. Same for em dashes and en dashes, never use them.
- No stacked marketing adjectives (bold, adventurous, energetic lifestyle) unless the JSON actually names that vibe; prefer one clear picture over hype.
- No spec-sheet compounds; say "medium strength" not "moderate-projection".

JSON fields:
- recipient_signals: scent_families, mood_preferences, liked_notes_top/middle/base, avoid_notes, occasions, seasons, wear_style.
- kpi_summary: scores and labels. Translate labels into plain English (never dump jargon).
- gift_style_hints: wear cards, suggested_accords_for_copy, gender/age framing, experience_copy_rule, minor_copy_rule.

Rules:
1. Every smell word must come from the JSON (notes, families, suggested_accords_for_copy, or gift_style_hints cues). Do not invent materials.
2. Never praise or recommend notes listed under avoid_notes.
3. If under_18 or minor_copy_rule applies, keep copy school-safe and gentle.
4. If notes and scent_families are empty, still write two warm sentences from kpi_summary + gift_style_hints + wear_style only.

Output: exactly 2 sentences, under 56 words, plain text. No JSON, markdown, bullets, colons before lists, or wrapping quotes. Only commas, periods, and "and" between ideas.

Few-shot: Input is abbreviated like the real bundle; Ideal summary is the target style:

Example A (woody + vanilla, base-forward, moderate presence)
Input:
{"kpi_summary":{"performance_appetite_label":"Moderate presence","pyramid":{"dominant_layer_label":"Base-forward"}},"recipient_signals":{"scent_families":["woody","amber_spicy"],"liked_notes_base":["vanilla","sandalwood"],"liked_notes_top":[],"liked_notes_middle":[],"avoid_notes":[]},"gift_style_hints":{"suggested_accords_for_copy":["cedar","warm spice"]}}
Ideal summary:
They lean toward warm wood and cozy vanilla and sandalwood more than sharp citrus. A gift that lasts through the day but does not fill the whole room should feel thoughtful, not overwhelming.

Example B (office + bergamot, soft presence)
Input:
{"kpi_summary":{"performance_appetite_label":"Soft presence","pyramid":{"dominant_layer_label":"Opening-forward"}},"recipient_signals":{"liked_notes_top":["bergamot"],"occasions":["work","daily"],"avoid_notes":[]},"gift_style_hints":{"wear_moment":"office","suggested_accords_for_copy":["clean citrus","soft musk"]}}
Ideal summary:
Fresh, desk-friendly smells like bergamot suit them better than sticky dessert scents. Something polite that stays close in the room shows you really listened.

Example C (date night + sweet + fresh lanes)
Input:
{"kpi_summary":{"performance_appetite_label":"Moderate presence","pyramid":{"dominant_layer_label":"Heart-forward"}},"recipient_signals":{"scent_families":["gourmand","fresh"],"mood_preferences":["romantic"],"avoid_notes":[]},"gift_style_hints":{"current_scent_style_lanes":["sweet_gourmand","fresh_clean"],"suggested_accords_for_copy":["vanilla","bergamot"]}}
Ideal summary:
They like both airy freshness and a little cozy sweetness, so date-night picks can mix soft vanilla with a bright opening. Aim for romantic, not candy-heavy.

Example D (sparse notes; lean on KPI + hints only)
Input:
{"kpi_summary":{"archetype_focus_label":"Wide explorer","performance_appetite_label":"Soft presence","pyramid":{"dominant_layer_label":"Balanced pyramid"}},"recipient_signals":{"scent_families":[],"liked_notes_top":[],"liked_notes_middle":[],"liked_notes_base":[],"avoid_notes":[]},"gift_style_hints":{"preset_scene_hint":"easy everyday gift"}}
Ideal summary:
They seem open-minded and like a gentler smell that stays near their skin. A versatile, easy-to-wear pick matches how broadly they like to explore.

Example E (bold + moderate presence + bergamot + woody; avoid the old robotic template)
Input:
{"kpi_summary":{"performance_appetite_label":"Moderate presence","pyramid":{"dominant_layer_label":"Opening-forward"}},"recipient_signals":{"scent_families":["woody","fresh"],"liked_notes_top":["bergamot"],"mood_preferences":["adventurous"],"avoid_notes":[]},"gift_style_hints":{"suggested_accords_for_copy":["citrus","cedar"]}}
Ideal summary:
They like things that feel lively but still wearable day to day, and bergamot with woody notes hits that fresh-but-grounded note for them. Pick something in the middle for how far it carries, enough to notice without fogging the room.`;

/** Who the KPI blurb is written for (second-person quiz vs third-person gift recipient). */
export type PreferenceKpiSummaryVoice = "quiz_taker" | "gift_recipient";

const GIFT_SIGNAL_LIST_CAP = 12;

/**
 * Build a compact JSON-safe view of gift/quiz selections for the LLM (notes, families, wear).
 *
 * Args:
 *   answers: Merged quiz payload after gift mapping and optional anchor merge.
 *
 * Returns:
 *   Plain object serialized beside kpi_summary in the user message.
 */
export function buildGiftRecipientSignalsForGroq(
  answers: QuizAnswersPayload,
): Record<string, unknown> {
  const np = answers.note_preferences ?? {};
  const take = <T>(xs: T[] | undefined, max: number): T[] =>
    Array.isArray(xs) ? xs.slice(0, max) : [];

  return {
    recipient_gender_lean: answers.preferred_gender ?? null,
    age_group: answers.age_group ?? null,
    scent_families: take(answers.scent_families, GIFT_SIGNAL_LIST_CAP),
    mood_preferences: take(answers.mood_preferences, 8),
    liked_notes_top: take(np.top_notes, GIFT_SIGNAL_LIST_CAP),
    liked_notes_middle: take(np.middle_notes, GIFT_SIGNAL_LIST_CAP),
    liked_notes_base: take(np.base_notes, GIFT_SIGNAL_LIST_CAP),
    avoid_notes: take(np.disliked_notes, 8),
    occasions: take(answers.preferred_occasions, 8),
    seasons: take(answers.preferred_seasons, 6),
    wear_style: {
      intensity: answers.preferred_intensity ?? null,
      longevity: answers.preferred_longevity ?? null,
      sillage: answers.preferred_sillage ?? null,
    },
  };
}

/**
 * Normalize model blurbs: unicode dashes, ASCII `` - `` used as a pause, stray jargon.
 *
 * Args:
 *   text: Raw assistant message.
 *
 * Returns:
 *   Plain punctuation, collapsed spaces.
 */
function sanitizeKpiSummaryText(text: string): string {
  let s = text
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\bmoderate-projection\b/gi, "medium strength")
    .replace(/\bstrong sillage\b/gi, "noticeable presence")
    .replace(/\bsillage\b/gi, "presence")
    .replace(/\bprojection\b/gi, "strength");
  while (s.includes("  ")) {
    s = s.replace(/  /g, " ");
  }
  return s.trim();
}

function leanKpiPayload(analytics: PreferenceAnalyticsData): Record<string, unknown> {
  return {
    archetype_focus_score: analytics.archetype_focus_score,
    archetype_focus_label: analytics.archetype_focus_label,
    performance_appetite_score: analytics.performance_appetite_score,
    performance_appetite_label: analytics.performance_appetite_label,
    occasion_versatility_score: analytics.occasion_versatility_score,
    season_versatility_score: analytics.season_versatility_score,
    pyramid: analytics.pyramid,
  };
}

/**
 * Ask Groq for a short shopper-facing blurb from deterministic KPI JSON.
 *
 * Args:
 *   analytics: Preference analytics (scores + labels; ``ai_summary`` ignored).
 *   options: For ``gift_recipient``, pass ``giftAnswers`` (merged quiz payload) and
 *     ``giftQuizInput`` (raw gift wizard body) for ``recipient_signals`` + ``gift_style_hints``.
 *
 * Returns:
 *   Trimmed plain text (max 520 chars) or null if no key / request fails.
 */
export async function generatePreferenceKpiSummaryGroq(
  analytics: PreferenceAnalyticsData,
  options?: {
    voice?: PreferenceKpiSummaryVoice;
    /** Gift pipeline: merged ``QuizAnswersPayload`` for note/family grounding. */
    giftAnswers?: QuizAnswersPayload;
    /** Raw gift wizard answers (wear card, style lanes, experience) - accord hints. */
    giftQuizInput?: WaitlistGiftAnswersInput;
  },
): Promise<string | null> {
  const voice: PreferenceKpiSummaryVoice = options?.voice ?? "quiz_taker";
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url =
    process.env.GROQ_API_BASE_URL?.trim() ||
    "https://api.groq.com/openai/v1/chat/completions";
  const model =
    process.env.GROQ_KPI_SUMMARY_MODEL?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    "llama-3.1-8b-instant";

  const timeoutSec = Number.parseFloat(
    process.env.GROQ_KPI_HTTP_TIMEOUT_SECONDS || "12",
  );
  const timeoutMs = Number.isFinite(timeoutSec)
    ? Math.max(1000, Math.round(timeoutSec * 1000))
    : 12_000;

  const temperature = Number.parseFloat(
    process.env.GROQ_KPI_SUMMARY_TEMPERATURE || "0.35",
  );
  const maxTokens = Number.parseInt(
    process.env.GROQ_KPI_SUMMARY_MAX_TOKENS ||
      String(DEFAULT_GROQ_KPI_SUMMARY_MAX_TOKENS),
    10,
  );

  const lean = leanKpiPayload(analytics);
  let userContent: string;
  if (voice === "gift_recipient") {
    const bundle: Record<string, unknown> = {
      kpi_summary: lean,
      gift_style_hints:
        options?.giftQuizInput != null
          ? buildGiftGroqStyleHints(options.giftQuizInput)
          : null,
      recipient_signals:
        options?.giftAnswers != null
          ? buildGiftRecipientSignalsForGroq(options.giftAnswers)
          : {
              scent_families: [],
              mood_preferences: [],
              liked_notes_top: [],
              liked_notes_middle: [],
              liked_notes_base: [],
              avoid_notes: [],
              occasions: [],
              seasons: [],
              recipient_gender_lean: null,
              age_group: null,
              wear_style: {
                intensity: null,
                longevity: null,
                sillage: null,
              },
            },
    };
    userContent =
      "Write exactly two short sentences for the gift-giver. Use recipient_signals for concrete note/family names; use gift_style_hints for wear/occasion/style-lane vocabulary and tone; reconcile with kpi_summary. Sound like a human shopkeeper, not marketing copy. Never use the words sillage or projection, never use hyphenated tech phrases like moderate-projection, never use a dash between clauses. JSON:\n\n" +
      JSON.stringify(bundle);
  } else {
    userContent =
      "Quiz-taker preference signals (JSON below). Write one paragraph only: explain why we would choose fragrances that fit them, weaving in how they like to wear scent. Use you/your for them; use we/us when describing what we matched or looked for. Never use they/them for the quiz-taker.\n\n" +
      JSON.stringify(lean);
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: voice === "gift_recipient" ? SYSTEM_PROMPT_GIFT : SYSTEM_PROMPT_QUIZ,
          },
          { role: "user", content: userContent },
        ],
        temperature: Number.isFinite(temperature) ? temperature : 0.35,
        max_tokens: Number.isFinite(maxTokens)
          ? maxTokens
          : DEFAULT_GROQ_KPI_SUMMARY_MAX_TOKENS,
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(
        "Groq KPI summary:",
        res.status,
        errBody.slice(0, 200),
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return null;
    }
    return sanitizeKpiSummaryText(raw).slice(0, 520);
  } catch (err) {
    console.warn("Groq KPI summary failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
