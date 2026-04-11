/**
 * ScentRev waitlist pilot follow-up email.
 * Warm canvas #F4F0E8, Inter + Poppins, terracotta / sage accents.
 * Fragrance DNA block first; blend snapshot; floating bottle cards at the end.
 */

import type { ScentDnaCardData } from "@/lib/waitlist/scentDnaCardData";
import {
  buildFloatingPicksEmailBlock,
  buildScentDnaEmailBlock,
} from "@/lib/email/scentDnaEmailBlock";
import {
  buildScentDnaShareHeadline,
  buildScentDnaShareTagline,
} from "@/lib/waitlist/scentDnaShareCopy";

interface QuizSnap {
  name?: string;
  brand?: string;
  image_url?: string | null;
}

interface BuildPilotEmailArgs {
  displayName: string;
  quizPicks: QuizSnap[];
  /** KPI + answers snapshot for the DNA card (email + parity with share UI). */
  scentDna: ScentDnaCardData | null;
  /** Matches share-card tagline (quiz vs gift). */
  scentDnaVariant?: "quiz" | "gift";
  layeringSummary: string | null;
  layeringScore: number | null;
  layeringLabel: string | null;
  /** Names of fragrances in the blend (up to 3). */
  layeringFragranceNames?: string[];
  layeringFragranceImages?: (string | null)[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getStoreUrl(): string {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_STORE_URL?.trim() : "";
  if (raw && /^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  return "https://scentrev.com";
}

function storeHref(path: string): string {
  const base = getStoreUrl();
  return escapeHtml(`${base}${path.startsWith("/") ? path : `/${path}`}`);
}

const YEAR = new Date().getFullYear();

const fontSans = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const fontDisplay = "'Poppins', 'Inter', system-ui, sans-serif";

export function buildPilotFollowupEmail(args: BuildPilotEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your fragrance DNA + ScentRev pilot snapshot";
  const safeName = escapeHtml(args.displayName);

  const scentDnaHtml =
    args.scentDna != null
      ? buildScentDnaEmailBlock(args.scentDna, fontSans, fontDisplay, {
          variant: args.scentDnaVariant ?? "quiz",
          firstName: args.displayName,
        })
      : "";

  const floatingPicksHtml = buildFloatingPicksEmailBlock(
    args.quizPicks,
    fontSans,
    fontDisplay,
  );

  /* ── Layering blend snapshot ── */
  const layerImagesHtml =
    args.layeringFragranceImages && args.layeringFragranceImages.length > 0
      ? `<tr><td align="left" style="padding:10px 0 6px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              ${args.layeringFragranceImages
                .slice(0, 3)
                .map((img, i) => {
                  const name = args.layeringFragranceNames?.[i] || "";
                  const imgTag = img
                    ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" width="52" height="52" style="width:52px;height:52px;object-fit:contain;display:block;border-radius:8px;background:#f4f0e8;" />`
                    : `<div style="width:52px;height:52px;background:#ede8e0;border-radius:8px;"></div>`;
                  return `<td valign="top" style="padding:0 8px 0 0;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e8e0d8;border-radius:10px;background:#fffcfa;">
                      <tr><td align="center" style="padding:6px;">${imgTag}</td></tr>
                      ${name ? `<tr><td align="center" style="padding:0 4px 6px;"><p style="margin:0;font-family:${fontSans};font-size:9px;color:#6b645c;line-height:1.2;">${escapeHtml(name.length > 14 ? name.slice(0, 13) + "…" : name)}</p></td></tr>` : ""}
                    </table>
                  </td>`;
                })
                .join("")}
            </tr>
          </table>
        </td></tr>`
      : "";

  const layerHtml =
    args.layeringSummary || args.layeringScore != null
      ? `
        <tr>
          <td align="left" style="padding:20px 0 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border:1px solid #e8e0d8;border-radius:14px;background:#fffcfa;overflow:hidden;">
              <tr>
                <td style="padding:0;line-height:0;font-size:0;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="height:3px;">
                    <tr>
                      <td width="50%" bgcolor="#B85A3A" style="background:#B85A3A;height:3px;font-size:0;">&nbsp;</td>
                      <td width="50%" bgcolor="#D4A574" style="background:#D4A574;height:3px;font-size:0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 18px 18px;">
                  <p style="margin:0;font-family:${fontSans};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#B85A3A;">Your blend snapshot</p>
                  ${layerImagesHtml ? layerImagesHtml.replace(/<tr>/, "").replace(/<\/tr>/, "") : ""}
                  ${
                    args.layeringLabel != null || args.layeringScore != null
                      ? `<p style="margin:10px 0 6px;font-family:${fontSans};font-size:13px;color:#14120F;">
                          ${args.layeringLabel ? `<strong style="font-weight:600;">${escapeHtml(args.layeringLabel)}</strong>` : ""}
                          ${args.layeringScore != null ? `<span style="color:#6b645c;"> &middot; Harmony score ${args.layeringScore}/100</span>` : ""}
                        </p>`
                      : ""
                  }
                  ${
                    args.layeringSummary
                      ? `<p style="margin:0;font-family:${fontSans};font-size:14px;line-height:22px;color:#4a4540;">${escapeHtml(args.layeringSummary)}</p>`
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" style="margin:0;padding:0;">
<head>
  <title>ScentRev</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Poppins:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style type="text/css">
    * { margin:0; padding:0; }
    body { width:100%; font-family:${fontSans}; background:#e5dfd4; margin:0 auto !important; -webkit-font-smoothing:antialiased; }
    table { mso-table-lspace:0; mso-table-rspace:0; border-collapse:collapse; }
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    @media only screen and (max-width:600px) {
      .full-width { width:100% !important; }
      .container { padding-left:18px !important; padding-right:18px !important; }
      .pick-cell { display:block !important; width:100% !important; padding:0 0 10px 0 !important; }
    }
    @media (prefers-color-scheme:dark) {
      body { background-color:#1a1917 !important; }
      .shell-pad { background-color:#1a1917 !important; }
      .brand-card { background-color:#262624 !important; border-color:#3d3c3a !important; }
      .content-surface { background-color:#262624 !important; }
      h1, .ink { color:#faf9f5 !important; }
      .sub { color:#d4d0c8 !important; }
      .pick-card, .blend-card { background-color:#2a2927 !important; border-color:#454440 !important; }
      .footer-bg { background-color:#0f0f0e !important; }
    }
  </style>
</head>
<body style="width:100%;font-family:${fontSans};padding:0;margin:0 auto !important;background-color:#e5dfd4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e5dfd4;">
    <tr>
      <td align="center" class="shell-pad" style="padding:28px 16px 36px;">
        <table border="0" cellpadding="0" cellspacing="0" class="full-width brand-card" width="600" style="width:600px;max-width:100%;background-color:#f4f0e8;border:1px solid #d9d1c7;border-radius:20px;overflow:hidden;">

          <!-- Accent strip -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="height:4px;">
                <tr>
                  <td width="34%" bgcolor="#B85A3A" style="background:#B85A3A;height:4px;font-size:0;">&nbsp;</td>
                  <td width="33%" bgcolor="#D4A574" style="background:#D4A574;height:4px;font-size:0;">&nbsp;</td>
                  <td width="33%" bgcolor="#8B9E7E" style="background:#8B9E7E;height:4px;font-size:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="left" class="container content-surface" style="padding:26px 36px 0;background-color:#f4f0e8;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td valign="middle" style="padding-right:14px;">
                    <a href="${storeHref("/")}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td align="center" valign="middle" bgcolor="#14120F" width="44" height="44" style="width:44px;height:44px;background:#14120F;border-radius:14px;">
                            <span style="font-family:${fontSans};font-size:14px;font-weight:700;color:#fff;line-height:44px;">SR</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-family:${fontSans};font-size:14px;font-weight:600;color:#14120F;">ScentRev</p>
                    <p style="margin:3px 0 0;font-family:${fontSans};font-size:12px;color:#6b645c;">Micro samples &middot; full bottles &middot; shipped in India</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td align="left" class="container content-surface" style="padding:20px 36px 36px;background-color:#f4f0e8;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">

                <!-- Eyebrow -->
                <tr>
                  <td style="padding-bottom:10px;">
                    <p style="margin:0;font-family:${fontSans};font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#B85A3A;">Pilot preview</p>
                  </td>
                </tr>

                <!-- Headline -->
                <tr>
                  <td>
                    <h1 style="margin:0;font-family:${fontDisplay};font-size:28px;font-weight:600;line-height:1.15;letter-spacing:-0.02em;color:#14120F;">
                      Thanks for testing, ${safeName}
                    </h1>
                  </td>
                </tr>

                <!-- Lead -->
                <tr>
                  <td style="padding-top:14px;">
                    <p class="sub" style="margin:0;font-family:${fontSans};font-size:15px;line-height:24px;color:#4a4540;">
                      Here&apos;s your fragrance DNA card from the pilot, plus your blend snapshot if you tried layering. Your top bottle matches sit at the end, styled like our shop cards so you can picture them on the shelf.
                    </p>
                  </td>
                </tr>

                ${scentDnaHtml}
                ${layerHtml}

                <!-- Divider -->
                <tr>
                  <td style="padding:28px 0 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr><td height="1" bgcolor="#e0d8cc" style="height:1px;background:#e0d8cc;font-size:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>

                ${floatingPicksHtml}

                <!-- Footer note -->
                <tr>
                  <td style="padding-top:20px;">
                    <p class="sub" style="margin:0;font-family:${fontSans};font-size:13px;line-height:21px;color:#6b645c;">
                      You&apos;re still on the list. We&apos;ll email you when we open.
                    </p>
                    <p style="margin:10px 0 0;font-family:${fontSans};font-size:13px;color:#6b645c;">
                      Questions? Email us at
                      <a href="mailto:support@scentrev.com" style="color:#B85A3A;text-decoration:underline;">support@scentrev.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0;line-height:0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr><td height="3" bgcolor="#B85A3A" style="height:3px;background:#B85A3A;font-size:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" class="footer-bg" style="padding:24px 36px 28px;background-color:#14120F;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left">
                    <p style="margin:0;font-family:${fontDisplay};font-size:18px;font-weight:600;color:#faf9f5;letter-spacing:-0.02em;">ScentRev</p>
                    <p style="margin:6px 0 0;font-family:${fontSans};font-size:12px;color:#9a948b;">Fragrance discovery for India &middot; &copy; ${YEAR}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr><td height="1" bgcolor="#3d3c3a" style="height:1px;background:#3d3c3a;font-size:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;">
                    <p style="margin:0;font-family:${fontSans};font-size:11px;color:#6b645c;line-height:18px;">
                      You received this because you joined the ScentRev waitlist.
                      This is a one-time pilot summary, not a marketing list.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  /* ── Plain text ── */
  const textLines = [
    `Thanks for testing the pilot, ${args.displayName}.`,
    "",
    "Your fragrance DNA (from your quiz signals):",
    "",
  ];
  if (args.scentDna) {
    const d = args.scentDna;
    const v = args.scentDnaVariant ?? "quiz";
    textLines.push(`  In one line: ${buildScentDnaShareHeadline(d)}`);
    textLines.push(`  ${buildScentDnaShareTagline(d, v)}`);
    if (d.families.length) {
      textLines.push(`  Your mix: ${d.families.join(", ")}`);
    }
    if (d.topNotes.length) {
      textLines.push(`  Top notes: ${d.topNotes.join(", ")}`);
    }
    if (d.moods.length) {
      textLines.push(`  Mood: ${d.moods.join(", ")}`);
    }
    textLines.push("");
  }
  if (args.quizPicks.length) {
    textLines.push("Your top picks:");
    for (const p of args.quizPicks.slice(0, 3)) {
      textLines.push(`  - ${p.brand || ""} ${p.name || ""}`.trim());
    }
    textLines.push("");
  }
  if (args.layeringSummary || args.layeringScore != null) {
    textLines.push("Your blend snapshot:");
    if (args.layeringFragranceNames?.length) {
      textLines.push(`  Fragrances: ${args.layeringFragranceNames.slice(0, 3).join(", ")}`);
    }
    if (args.layeringLabel) {
      textLines.push(`  ${args.layeringLabel}${args.layeringScore != null ? ` · Harmony score ${args.layeringScore}/100` : ""}`);
    }
    if (args.layeringSummary) textLines.push(`  ${args.layeringSummary}`);
    textLines.push("");
  }
  textLines.push("You're still on the list. We'll email you when we open.");
  textLines.push("Questions? Email support@scentrev.com");
  textLines.push("");
  textLines.push("- ScentRev team");

  return { subject, html, text: textLines.join("\n") };
}
