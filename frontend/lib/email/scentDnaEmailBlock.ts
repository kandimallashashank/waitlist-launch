/**
 * HTML table fragment for the fragrance DNA card inside pilot emails.
 * Parity with ``ScentDnaShareCard``: share headline/tagline, per-row bar colors, top-note + mood chips.
 */

import type { ScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";
import { scentDnaFamilyBarColor } from "@/lib/waitlist/scentDnaPalette";
import {
  buildScentDnaShareHeadline,
  buildScentDnaShareTagline,
  titleCaseWords,
  truncScentDnaChipLabel,
} from "@/lib/waitlist/scentDnaShareCopy";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAX_FAMILIES = 4;
const MAX_TOP_NOTES = 4;
const MAX_MOODS = 3;
const NOTE_CHIP_MAX = 20;
const MOOD_CHIP_MAX = 22;

/** Inline styles for DNA chips (matches share card terracotta pills). */
const CHIP_STYLE = `display:inline-block;margin:0 5px 5px 0;padding:6px 11px;border:1px solid #f0d1c1;border-radius:10px;background:#fdf6f3;font-family:INHERIT_SANS;font-size:10px;font-weight:600;color:#7a3a23;line-height:1.2;`;

export interface BuildScentDnaEmailBlockOptions {
  /** Quiz self map vs gift flow — drives tagline framing. */
  variant?: "quiz" | "gift";
  /** Display name from waitlist (possessive line; use "Your" if empty or ``there``). */
  firstName?: string;
}

/**
 * Build one chip span (notes or mood).
 */
function emailDnaChip(label: string, fontSans: string): string {
  const style = CHIP_STYLE.replace("INHERIT_SANS", fontSans);
  return `<span style="${style}">${escapeHtml(label)}</span>`;
}

/**
 * Build a DNA summary block aligned with the in-app share card.
 *
 * Args:
 *   data: Normalized DNA fields.
 *   fontSans: CSS font stack for body text.
 *   fontDisplay: CSS font stack for headings.
 *   options: Optional variant and name for possessive / tagline.
 *
 * Returns:
 *   One or more ``<tr>...</tr>`` rows for insertion in the email shell.
 */
export function buildScentDnaEmailBlock(
  data: ScentDnaCardData,
  fontSans: string,
  fontDisplay: string,
  options?: BuildScentDnaEmailBlockOptions,
): string {
  const variant = options?.variant ?? "quiz";
  const rawName = options?.firstName?.trim() ?? "";
  const leadTitle =
    !rawName || rawName.toLowerCase() === "there"
      ? "Your"
      : `${escapeHtml(rawName)}'s`;

  const headline = buildScentDnaShareHeadline(data);
  const tagline = buildScentDnaShareTagline(data, variant);

  const familyRows = data.familyBars.slice(0, MAX_FAMILIES);
  const familiesHtml = familyRows
    .map((row, idx) => {
      const pct = Math.min(100, Math.max(0, row.percent));
      const fill = scentDnaFamilyBarColor(idx);
      const label = titleCaseWords(row.label);
      return `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin:0 0 7px;">
      <tr>
        <td align="left" style="font-family:${fontSans};font-size:10px;font-weight:600;color:#1a1a1a;padding:0;">${escapeHtml(label)}</td>
        <td align="right" style="font-family:${fontSans};font-size:9px;font-weight:700;color:#737373;padding:0;white-space:nowrap;">${pct}%</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:3px 0 0;">
          <div style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:999px;height:6px;overflow:hidden;line-height:0;font-size:0;">
            <div style="width:${pct}%;background:${fill};height:6px;border-radius:999px;font-size:0;line-height:0;">&nbsp;</div>
          </div>
        </td>
      </tr>
    </table>`;
    })
    .join("");

  const topNoteLabels = data.openingNoteBars
    .slice(0, MAX_TOP_NOTES)
    .map((row) => truncScentDnaChipLabel(titleCaseWords(row.label), NOTE_CHIP_MAX));
  const topNotesHtml = topNoteLabels.map((l) => emailDnaChip(l, fontSans)).join("");

  const moodLabels = data.moodBars
    .slice(0, MAX_MOODS)
    .map((row) => truncScentDnaChipLabel(titleCaseWords(row.label), MOOD_CHIP_MAX));
  const moodsHtml = moodLabels.map((l) => emailDnaChip(l, fontSans)).join("");

  const pilotStamp = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const sectionLabel = (t: string) =>
    `<p style="margin:0 0 6px;font-family:${fontSans};font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#737373;">${escapeHtml(t)}</p>`;

  const yourMixBlock =
    familyRows.length > 0
      ? `<div style="margin-top:14px;">${sectionLabel("Your mix")}${familiesHtml}</div>`
      : "";

  const topNotesBlock =
    topNoteLabels.length > 0
      ? `<div style="margin-top:12px;">${sectionLabel("Top notes")}<div style="line-height:0;">${topNotesHtml}</div></div>`
      : "";

  const moodBlock =
    moodLabels.length > 0
      ? `<div style="margin-top:12px;padding-bottom:4px;">${sectionLabel("Mood")}<div style="line-height:0;">${moodsHtml}</div></div>`
      : "";

  return `
        <tr>
          <td align="left" style="padding:22px 0 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-radius:18px;border:2px solid #f0d1c1;background:linear-gradient(180deg,#fdf8f6 0%,#f5ede9 100%);overflow:hidden;">
              <tr>
                <td style="padding:0;line-height:0;font-size:0;">
                  <div style="height:4px;background:linear-gradient(90deg,#B85A3A 0%,#d4a574 55%,#8b9e7e 100%);font-size:0;line-height:0;">&nbsp;</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 18px 14px;">
                  <p style="margin:0;font-family:${fontSans};font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#B85A3A;">Fragrance DNA</p>
                  <p style="margin:6px 0 0;font-family:${fontDisplay};font-size:19px;font-weight:700;line-height:1.2;color:#0a0a0a;">${leadTitle}</p>
                  <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06);">
                    ${sectionLabel("In one line")}
                    <p style="margin:0;font-family:${fontDisplay};font-size:16px;font-weight:700;line-height:1.3;color:#7a3a23;">${escapeHtml(headline)}</p>
                    <p style="margin:8px 0 0;font-family:${fontSans};font-size:12px;line-height:18px;color:#525252;">${escapeHtml(tagline)}</p>
                  </div>
                  ${yourMixBlock}
                  ${topNotesBlock}
                  ${moodBlock}
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06);">
                    <tr>
                      <td align="left" style="font-family:${fontSans};font-size:12px;font-weight:700;color:#1a1a1a;">ScentRev</td>
                      <td align="right" style="font-family:${fontSans};font-size:10px;color:#737373;">${escapeHtml(pilotStamp)}<br /><span style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#B85A3A;">Pilot</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

/**
 * Floating product-style bottle row for email clients (white well + shadow).
 *
 * Args:
 *   picks: Up to three quiz recommendations with optional image URLs.
 *   fontSans: Body font stack.
 *   fontDisplay: Heading font stack.
 *
 * Returns:
 *   ``<tr>...</tr>`` HTML or empty string.
 */
export function buildFloatingPicksEmailBlock(
  picks: Array<{ name?: string; brand?: string; image_url?: string | null }>,
  fontSans: string,
  fontDisplay: string,
): string {
  const slice = picks.slice(0, 3);
  if (!slice.length) {
    return "";
  }
  const cells = slice
    .map((p) => {
      const img = p.image_url
        ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name || "")}" width="120" height="120" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto;mix-blend-mode:multiply;" />`
        : `<div style="width:120px;height:120px;margin:0 auto;background:#f0ebe4;border-radius:12px;"></div>`;
      return `<td valign="top" align="center" class="pick-cell" style="padding:0 8px 0 0;width:33%;">
        <div style="background:#ffffff;border-radius:20px;padding:14px 12px 16px;box-shadow:0 18px 40px -12px rgba(26,26,26,0.14),0 8px 16px -8px rgba(184,90,58,0.12);border:1px solid #f0e8e0;">
          <div style="background:linear-gradient(180deg,#faf8f5 0%,#f3ece4 100%);border-radius:14px;padding:12px 10px 14px;">
            ${img}
          </div>
          <p style="margin:12px 0 0;font-family:${fontSans};font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#B85A3A;">${escapeHtml(p.brand || "")}</p>
          <p style="margin:4px 0 0;font-family:${fontDisplay};font-size:13px;font-weight:600;color:#14120F;line-height:1.25;">${escapeHtml(p.name || "")}</p>
        </div>
      </td>`;
    })
    .join("");

  return `
        <tr>
          <td align="left" style="padding:28px 0 8px;">
            <p style="margin:0;font-family:${fontSans};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#B85A3A;">Your top match bottles</p>
            <p style="margin:6px 0 0;font-family:${fontSans};font-size:13px;line-height:20px;color:#5c4a42;">Floated on a clean white stage, same idea as our product pages.</p>
          </td>
        </tr>
        <tr>
          <td align="left" style="padding:0 0 8px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
              <tr>${cells}</tr>
            </table>
          </td>
        </tr>`;
}
