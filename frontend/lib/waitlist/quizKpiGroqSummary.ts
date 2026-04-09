/**
 * Optional Groq chat completion for quiz KPI analytics (matches FastAPI quiz_kpi_summary_llm).
 */

import type { PreferenceAnalyticsData } from "@/components/preferences/PreferenceAnalyticsCollapsible";

const SYSTEM_PROMPT =
  "You write concise copy for fragrance shoppers in India. " +
  "Output plain text only: exactly 2 short sentences, under 45 words total. " +
  "No JSON, no markdown, no bullet points, no quotation marks wrapping the whole reply.";

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
 *
 * Returns:
 *   Trimmed plain text (max 520 chars) or null if no key / request fails.
 */
export async function generatePreferenceKpiSummaryGroq(
  analytics: PreferenceAnalyticsData,
): Promise<string | null> {
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
    process.env.GROQ_KPI_SUMMARY_MAX_TOKENS || "180",
    10,
  );

  const lean = leanKpiPayload(analytics);
  const userContent =
    "Preference signals (JSON). Write 2 sentences summarizing what they enjoy and how they wear fragrance.\n\n" +
    JSON.stringify(lean);

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: Number.isFinite(temperature) ? temperature : 0.35,
        max_tokens: Number.isFinite(maxTokens) ? maxTokens : 180,
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
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return null;
    }
    return text.slice(0, 520);
  } catch (err) {
    console.warn("Groq KPI summary failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
