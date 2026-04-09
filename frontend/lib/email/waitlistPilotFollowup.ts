/**
 * HTML + plain text for waitlist pilot follow-up (post quiz/layering).
 */

interface QuizSnap {
  name?: string;
  brand?: string;
}

interface BuildPilotEmailArgs {
  displayName: string;
  quizPicks: QuizSnap[];
  layeringSummary: string | null;
  layeringScore: number | null;
  layeringLabel: string | null;
}

/**
 * Build pilot follow-up email bodies.
 *
 * Args:
 *   displayName: Short greeting name.
 *   quizPicks: Up to 3 recommendation labels.
 *   layeringSummary: Latest blend summary or null.
 *   layeringScore: Harmony score or null.
 *   layeringLabel: Harmony label or null.
 *
 * Returns:
 *   subject, html, text.
 */
export function buildPilotFollowupEmail(args: BuildPilotEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your ScentRev pilot snapshot thanks for testing";

  const picksBlock =
    args.quizPicks.length > 0
      ? `<ul style="margin:12px 0;padding-left:20px;color:#333;">
${args.quizPicks
  .slice(0, 3)
  .map(
    (p) =>
      `<li style="margin:6px 0;"><strong>${escapeHtml(p.brand || "")}</strong> ${escapeHtml(p.name || "")}</li>`,
  )
  .join("")}
</ul>`
      : "";

  const layerBlock =
    args.layeringSummary || args.layeringScore != null
      ? `<p style="margin:16px 0 8px;color:#333;"><strong>Your blend snapshot</strong></p>
<p style="margin:0;color:#444;line-height:1.5;">
${args.layeringLabel != null ? `Label: <strong>${escapeHtml(args.layeringLabel)}</strong>${args.layeringScore != null ? ` · Score ${args.layeringScore}` : ""}<br/>` : ""}
${escapeHtml(args.layeringSummary || "")}
</p>`
      : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Georgia,serif;background:#F4F0E8;margin:0;padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #E5DED4;">
<tr><td>
<p style="color:#B85A3A;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px;">Pilot preview</p>
<h1 style="font-size:22px;color:#1A1A1A;margin:0 0 12px;">Thanks for trying the pilot, ${escapeHtml(args.displayName)}</h1>
<p style="color:#444;line-height:1.6;margin:0 0 16px;">
We're learning from early testers like you. Here's a <strong>compact snapshot</strong> of what we saw for you on the waitlist preview.
When we launch, the real app will expand on this saved to your account, richer picks, and full shop flow.
</p>
${args.quizPicks.length ? `<p style="margin:16px 0 8px;color:#333;"><strong>Your pilot picks</strong></p>${picksBlock}` : ""}
${layerBlock}
<p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.5;">
You're still on the list we'll email you when we open. Questions? Just reply to this message.
</p>
</td></tr></table>
</body></html>`;

  const textLines = [
    `Thanks for trying the pilot, ${args.displayName}.`,
    "",
    "We're learning from early testers. Snapshot from your waitlist preview:",
    "",
  ];
  if (args.quizPicks.length) {
    textLines.push("Your pilot picks:");
    for (const p of args.quizPicks.slice(0, 3)) {
      textLines.push(`- ${p.brand} ${p.name}`);
    }
    textLines.push("");
  }
  if (args.layeringSummary || args.layeringScore != null) {
    textLines.push("Blend snapshot:");
    if (args.layeringLabel) {
      textLines.push(`${args.layeringLabel}${args.layeringScore != null ? ` (score ${args.layeringScore})` : ""}`);
    }
    if (args.layeringSummary) {
      textLines.push(args.layeringSummary);
    }
    textLines.push("");
  }
  textLines.push("At launch, the full app will build on this with your account.");
  textLines.push("- ScentRev");

  return { subject, html, text: textLines.join("\n") };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
