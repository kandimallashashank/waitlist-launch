/**
 * ScentRev waitlist coupon email (HTML + plain text) for Resend.
 *
 * Visual language mirrors the waitlist hero (`app/page.tsx`): warm canvas #F4F0E8,
 * ink #14120F, terracotta #B85A3A, sage/amber accent stripe, black SR mark, chip row,
 * bordered inner “card” for MVP. Typography: Inter + Poppins per `globals.css`.
 */

const WAITLIST_DISCOUNT = 15;

/** Default email subject (also set in Resend call; keep in sync). */
export const WAITLIST_COUPON_EMAIL_SUBJECT =
  "You're in: your ScentRev early-access code";

/**
 * Store origin for links (matches web app when `NEXT_PUBLIC_STORE_URL` is set).
 *
 * Returns:
 *   Base URL without trailing slash.
 */
function getWaitlistEmailStoreUrl(): string {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_STORE_URL?.trim() : "";
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  return "https://scentrev.com";
}

/**
 * Escape text for safe inclusion in HTML email bodies.
 *
 * Args:
 *   s: Raw string.
 *
 * Returns:
 *   HTML-escaped string.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Absolute URL for a store path, HTML-escaped for href attributes.
 *
 * Args:
 *   path: Path starting with /.
 *
 * Returns:
 *   Escaped full URL.
 */
function storeHref(path: string): string {
  const base = getWaitlistEmailStoreUrl().replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return escapeHtml(`${base}${p}`);
}

const YEAR = new Date().getFullYear();

/** Short hidden preheader filler (keeps inbox preview clean in some clients). */
const PREHEADER_FILL =
  "&#8199; &#847; &shy; &#8199; &#847; &shy; &#8199; &#847; &shy; &#8199; &#847; &shy; ";

/**
 * Build the branded HTML body for the launch waitlist coupon email.
 *
 * Args:
 *   displayName: Greeting name or "there".
 *   couponCode: Assigned coupon code.
 *   discountPercent: Discount percentage (default 15).
 *
 * Returns:
 *   Full HTML document string.
 */
export function buildWaitlistCouponEmailHtml(
  displayName: string,
  couponCode: string,
  discountPercent: number = WAITLIST_DISCOUNT,
): string {
  const safeName = escapeHtml(displayName);
  const safeCode = escapeHtml(couponCode);
  const preheader = `Your ${discountPercent}% launch code is inside. Micro samples, full bottles, Blind Buy Score 0-5, shipped in India.`;

  const fontSans =
    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const fontDisplay = "'Poppins', 'Inter', system-ui, sans-serif";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en" xml:lang="en" style="margin:0;padding:0;color-scheme:light dark;supported-color-schemes:light dark;">
<head>
  <title>ScentRev</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Poppins:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
  <!--[if mso]>
  <style type="text/css">a{text-decoration:none!important}</style>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <style type="text/css">
    * { margin: 0; padding: 0; }
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      width: 100%;
      font-family: ${fontSans};
      word-wrap: normal;
      background: #e5dfd4;
      margin: 0 auto !important;
      -webkit-font-smoothing: antialiased;
    }
    table { mso-table-lspace: 0; mso-table-rspace: 0; border-collapse: collapse; }
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
    }
    @media only screen and (max-width: 619px) {
      .full-width { width: 100% !important; }
      .container { padding-left: 22px !important; padding-right: 22px !important; }
      .shell-pad { padding-left: 12px !important; padding-right: 12px !important; padding-top: 16px !important; padding-bottom: 28px !important; }
      h1 { font-size: 26px !important; line-height: 32px !important; }
      .chip-stack td { display: block !important; width: 100% !important; padding: 0 0 8px 0 !important; }
      .mvp-icon-wrap { width: 44px !important; }
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1917 !important; }
      .shell-pad { background-color: #1a1917 !important; }
      .brand-card { background-color: #262624 !important; border-color: #3d3c3a !important; }
      .accent-bar td { opacity: 0.95; }
      .content-surface { background-color: #262624 !important; }
      .hero-eyebrow { color: #e8a882 !important; }
      h1, .brand-name { color: #faf9f5 !important; }
      .tagline, .lead, .mvp-copy { color: #d4d0c8 !important; }
      .lead strong, .mvp-copy strong { color: #faf9f5 !important; }
      .waitlist-pill { background-color: rgba(255,255,255,0.08) !important; border-color: #4a4844 !important; color: #b0aba3 !important; }
      .chip { background-color: #2e2d2b !important; border-color: #454440 !important; }
      .chip strong { color: #faf9f5 !important; }
      .chip span.lbl { color: #9a948b !important; }
      .mvp-card { background-color: #2a2927 !important; border-color: #454440 !important; }
      .mvp-row-alt { background-color: transparent !important; }
      .mvp-icon-well { background-color: #14120f !important; }
      .divider-line { background-color: #4a4844 !important; }
      .mvp-copy a { color: #e8b896 !important; }
      .coupon-shell { background-color: #2a2927 !important; border-color: #b85a3a !important; }
      .coupon-inner { background-color: #1e1d1b !important; }
      .coupon-gold { background-color: #d4a574 !important; }
      .coupon-code { color: #faf9f5 !important; }
      .footer { background-color: #0f0f0e !important; }
      .footer-rule { background-color: #b85a3a !important; }
      .footer p, .footer a.footerCopy { color: #b0aea5 !important; }
    }
  </style>
</head>
<body class="body" style="width:100%;font-family:${fontSans};padding:0;margin:0 auto !important;background-color:#e5dfd4;">
  <span style="color:transparent;visibility:hidden;display:none;opacity:0;height:0;width:0;font-size:0;">${escapeHtml(preheader)}</span>
  <div style="display:none !important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${PREHEADER_FILL.repeat(12)}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#e5dfd4;">
    <tr>
      <td align="center" class="shell-pad" style="padding:28px 16px 36px;">
        <table border="0" cellpadding="0" cellspacing="0" class="full-width brand-card" width="640" style="width:640px;max-width:100%;background-color:#f4f0e8;border:1px solid #d9d1c7;border-radius:20px;overflow:hidden;">
          <!-- Brand accent strip: terracotta / amber / sage (no CSS gradient; Outlook-safe) -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="accent-bar" role="presentation" style="width:100%;height:4px;">
                <tr>
                  <td width="34%" bgcolor="#B85A3A" style="background-color:#B85A3A;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                  <td width="33%" bgcolor="#D4A574" style="background-color:#D4A574;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                  <td width="33%" bgcolor="#8B9E7E" style="background-color:#8B9E7E;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header: matches hero mark (ink tile + wordmark + tagline + pill) -->
          <tr>
            <td align="center" class="container content-surface" style="padding:26px 36px 8px;background-color:#f4f0e8;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td valign="top" style="padding:0 14px 0 0;">
                          <a href="${storeHref("/")}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                              <tr>
                                <td align="center" valign="middle" bgcolor="#14120F" width="44" height="44" style="width:44px;height:44px;background-color:#14120F;border-radius:14px;border:1px solid rgba(255,255,255,0.12);">
                                  <span style="font-family:${fontSans};font-size:14px;font-weight:700;color:#ffffff;line-height:44px;">SR</span>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="top" style="padding-top:2px;">
                          <a href="${storeHref("/")}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                            <p class="brand-name" style="margin:0;font-family:${fontSans};font-size:14px;font-weight:600;letter-spacing:-0.02em;color:#14120F;">ScentRev</p>
                            <p class="tagline" style="margin:4px 0 0;font-family:${fontSans};font-size:12px;font-weight:400;line-height:16px;color:#6b645c;">Micro samples &middot; full bottles &middot; shipped in India</p>
                          </a>
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
                            <tr>
                              <td class="waitlist-pill" style="border-radius:999px;border:1px solid #d9d1c7;background-color:rgba(255,255,255,0.75);padding:7px 14px;">
                                <span style="font-family:${fontSans};font-size:10px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#6b645c;">Waitlist confirmed</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td align="center" class="container content-surface" style="padding:8px 36px 36px;background-color:#f4f0e8;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left" style="padding-bottom:10px;">
                    <p class="hero-eyebrow" style="margin:0;font-family:${fontSans};font-size:12px;font-weight:600;color:#B85A3A;letter-spacing:0.02em;">
                      <span style="color:#D4A574;">&#10022;</span>&nbsp; Early access + launch discount
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="left">
                    <h1 style="margin:0;font-family:${fontDisplay};font-size:31px;font-weight:600;line-height:1.12;letter-spacing:-0.03em;color:#14120F;">
                      Hi ${safeName}, you&apos;re on the list
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:16px;">
                    <p class="lead" style="margin:0;font-family:${fontSans};font-size:16px;line-height:26px;font-weight:400;color:#4a4540;">
                      Thanks for joining. ScentRev is <strong style="font-weight:600;color:#14120F;">fragrance discovery for India</strong>: micro sizes to wear on real skin first, plus full-size bottles when you are ready. Data, not guesswork.
                    </p>
                  </td>
                </tr>
                <!-- Trust chips (hero-aligned) -->
                <tr>
                  <td align="left" style="padding-top:20px;">
                    <table border="0" cellpadding="0" cellspacing="0" class="chip-stack" role="presentation" width="100%">
                      <tr>
                        <td class="chip" style="padding:0 8px 8px 0;vertical-align:top;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e0d8cc;border-radius:999px;background-color:rgba(255,255,255,0.92);">
                            <tr>
                              <td style="padding:10px 16px;font-family:${fontSans};font-size:12px;color:#14120F;">
                                <strong style="font-weight:600;letter-spacing:-0.02em;">450+ fragrances</strong>
                                <span class="lbl" style="display:block;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:#8a8279;margin-top:2px;">Samples &amp; full bottles</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="chip" style="padding:0 8px 8px 0;vertical-align:top;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e0d8cc;border-radius:999px;background-color:rgba(255,255,255,0.92);">
                            <tr>
                              <td style="padding:10px 16px;font-family:${fontSans};font-size:12px;color:#14120F;">
                                <strong style="font-weight:600;letter-spacing:-0.02em;">From &#8377;199</strong>
                                <span class="lbl" style="display:block;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:#8a8279;margin-top:2px;">Micro samples</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="chip" style="padding:0 0 8px 0;vertical-align:top;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e0d8cc;border-radius:999px;background-color:rgba(255,255,255,0.92);">
                            <tr>
                              <td style="padding:10px 16px;font-family:${fontSans};font-size:12px;color:#14120F;">
                                <strong style="font-weight:600;letter-spacing:-0.02em;">India-first</strong>
                                <span class="lbl" style="display:block;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:#8a8279;margin-top:2px;">Heat &amp; humidity</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td align="center" style="padding:22px 0 6px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="120" role="presentation" style="margin:0 auto;">
                      <tr>
                        <td class="divider-line" height="1" bgcolor="#E0D8CC" style="height:1px;background-color:#e0d8cc;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <p style="margin:10px 0 0;font-family:${fontSans};font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#B85A3A;">What we&apos;re building</p>
                  </td>
                </tr>
                <!-- MVP card -->
                <tr>
                  <td align="left" style="padding-top:14px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mvp-card" role="presentation" style="border:1px solid #e8e0d8;border-radius:14px;background-color:#fffcfa;">
                      <tr>
                        <td style="padding:18px 18px 8px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td width="48" valign="top" class="mvp-icon-wrap" style="padding:0 0 14px 0;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                  <tr>
                                    <td class="mvp-icon-well" align="center" valign="middle" width="40" height="40" bgcolor="#14120F" style="width:40px;height:40px;background-color:#14120F;border-radius:12px;">
                                      <span aria-hidden="true" style="font-size:17px;line-height:40px;">&#129514;</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="top" style="padding:0 0 14px 6px;">
                                <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:15px;line-height:23px;color:#14120F;">
                                  <strong style="font-weight:600;">Micro vials, India-first.</strong> 3ml to 10ml, shipped here. A small rupee decision beats a big bottle regret.
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding:0;"><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mvp-row-alt" role="presentation" style="background-color:#faf7f2;border-radius:10px;"><tr>
                                <td width="48" valign="top" style="padding:12px 0 12px 0;">
                                  <table border="0" cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;">
                                    <tr>
                                      <td class="mvp-icon-well" align="center" valign="middle" width="40" height="40" bgcolor="#14120F" style="width:40px;height:40px;background-color:#14120F;border-radius:12px;">
                                        <span aria-hidden="true" style="font-size:17px;line-height:40px;">&#128202;</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td valign="top" style="padding:12px 12px 12px 6px;">
                                  <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:15px;line-height:23px;color:#14120F;">
                                    <strong style="font-weight:600;">Blind Buy Score (0-5).</strong> Chatter from Reddit, Facebook, and the open web, fused with perfume metrics in one weighted pipeline: 0 is a weak blind buy, 5 is a strong one, so you spend less time searching.
                                  </p>
                                </td>
                              </tr></table></td>
                            </tr>
                            <tr>
                              <td width="48" valign="top" style="padding:0 0 14px 0;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                  <tr>
                                    <td class="mvp-icon-well" align="center" valign="middle" width="40" height="40" bgcolor="#14120F" style="width:40px;height:40px;background-color:#14120F;border-radius:12px;">
                                      <span aria-hidden="true" style="font-size:17px;line-height:40px;">&#127777;&#65039;</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="top" style="padding:0 0 14px 6px;">
                                <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:15px;line-height:23px;color:#14120F;">
                                  <strong style="font-weight:600;">Climate-aware picks.</strong> Built for Indian heat and humidity, not a London autumn baseline.
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding:0;"><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mvp-row-alt" role="presentation" style="background-color:#faf7f2;border-radius:10px;"><tr>
                                <td width="48" valign="top" style="padding:12px 0 12px 0;">
                                  <table border="0" cellpadding="0" cellspacing="0" align="center" role="presentation" style="margin:0 auto;">
                                    <tr>
                                      <td class="mvp-icon-well" align="center" valign="middle" width="40" height="40" bgcolor="#14120F" style="width:40px;height:40px;background-color:#14120F;border-radius:12px;">
                                        <span aria-hidden="true" style="font-size:17px;line-height:40px;">&#129513;</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td valign="top" style="padding:12px 12px 12px 6px;">
                                  <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:15px;line-height:23px;color:#14120F;">
                                    <strong style="font-weight:600;">Quiz, Layering Lab, Club.</strong>
                                    <a href="${storeHref("/layering-lab")}" target="_blank" rel="noopener noreferrer" style="color:#B85A3A;text-decoration:underline;font-weight:600;">Layering Lab</a> ranks combos with AI/ML on real-world data and metrics you can use to decide. 
                                    <a href="${storeHref("/subscription")}" target="_blank" rel="noopener noreferrer" style="color:#B85A3A;text-decoration:underline;font-weight:600;">Club</a> subscriptions (Essential, Signature, Prestige) send one 8ml fragrance each month: you choose the scent or enable auto-select and we match from your quiz profile.
                                  </p>
                                </td>
                              </tr></table></td>
                            </tr>
                            <tr>
                              <td width="48" valign="top" style="padding:0;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                  <tr>
                                    <td class="mvp-icon-well" align="center" valign="middle" width="40" height="40" bgcolor="#14120F" style="width:40px;height:40px;background-color:#14120F;border-radius:12px;">
                                      <span aria-hidden="true" style="font-size:16px;line-height:40px;">&#128231;</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td valign="top" style="padding:0 0 0 6px;">
                                <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:15px;line-height:23px;color:#14120F;">
                                  <strong style="font-weight:600;">Launch updates only.</strong> No unrelated blasts from this signup.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:18px;">
                    <p class="mvp-copy" style="margin:0;font-family:${fontSans};font-size:14px;line-height:22px;color:#5c564e;">
                      When we open:
                      <a href="${storeHref("/shop-all")}" target="_blank" rel="noopener noreferrer" style="color:#B85A3A;font-weight:600;text-decoration:underline;">Shop</a> &middot;
                      <a href="${storeHref("/quiz")}" target="_blank" rel="noopener noreferrer" style="color:#B85A3A;font-weight:600;text-decoration:underline;">Quiz</a> &middot;
                      <a href="${storeHref("/subscription")}" target="_blank" rel="noopener noreferrer" style="color:#B85A3A;font-weight:600;text-decoration:underline;">Club</a>
                    </p>
                  </td>
                </tr>
                <!-- Coupon -->
                <tr>
                  <td align="center" style="padding:28px 0 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="coupon-shell" role="presentation" style="max-width:520px;border:2px solid #B85A3A;border-radius:16px;background-color:#B85A3A;padding:2px;">
                      <tr>
                        <td class="coupon-inner" style="background-color:#fdf6f3;border-radius:14px;overflow:hidden;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td class="coupon-gold" height="3" bgcolor="#D4A574" style="height:3px;background-color:#D4A574;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                            <tr>
                              <td align="center" style="padding:24px 20px 22px;">
                                <p style="margin:0;font-family:${fontSans};font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#B85A3A;">Your code</p>
                                <p class="coupon-code" style="margin:12px 0 0;font-family:${fontSans};font-size:26px;font-weight:700;letter-spacing:0.06em;color:#14120F;font-variant-numeric:tabular-nums;">
                                  ${safeCode}
                                </p>
                                <p style="margin:14px 0 0;font-family:${fontSans};font-size:13px;line-height:20px;color:#4a4540;">
                                  <strong style="color:#B85A3A;font-weight:600;">${discountPercent}% off</strong> first order &middot; one use &middot; this email
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding:0;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:999px;background-color:#B85A3A;" bgcolor="#B85A3A">
                      <tr>
                        <td align="center" style="padding:0;">
                          <a href="${storeHref("/")}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 36px;color:#ffffff;text-decoration:none;font-family:${fontSans};font-size:14px;font-weight:600;letter-spacing:0.04em;border-radius:999px;" aria-label="Visit ScentRev">
                            Visit ScentRev
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0;line-height:0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td class="footer-rule" height="3" bgcolor="#B85A3A" style="height:3px;background-color:#B85A3A;font-size:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" class="container footer" style="padding:28px 36px 34px;background-color:#14120F;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td align="left" style="padding-bottom:6px;">
                    <p style="margin:0;font-family:${fontDisplay};font-size:20px;font-weight:600;color:#faf9f5;letter-spacing:-0.02em;">ScentRev</p>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:14px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr>
                        <td height="1" bgcolor="#3d3c3a" style="height:1px;background-color:#3d3c3a;font-size:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:18px;">
                    <p class="footerCopy" style="margin:0;font-size:13px;line-height:21px;font-family:${fontSans};color:#b0aea5;">
                      Need help?
                      <a href="mailto:support@scentrev.com" class="footerCopy" style="color:#d4a574;text-decoration:underline;">support@scentrev.com</a>
                      &nbsp;or&nbsp;
                      <a href="mailto:shashank@scentrev.com" class="footerCopy" style="color:#d4a574;text-decoration:underline;">shashank@scentrev.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:14px;">
                    <p class="footerCopy" style="margin:0;font-size:11px;line-height:16px;font-family:${fontSans};color:#8a8580;">
                      ScentRev &middot; India &middot; &copy; ${YEAR}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:12px;">
                    <p class="footerCopy" style="margin:0;font-size:11px;line-height:16px;font-family:${fontSans};color:#8a8580;">
                      <a href="${storeHref("/privacy")}" class="footerCopy" target="_blank" rel="noopener noreferrer" style="color:#8a8580;text-decoration:underline;">Privacy</a>
                      &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                      <a href="${storeHref("/terms")}" class="footerCopy" target="_blank" rel="noopener noreferrer" style="color:#8a8580;text-decoration:underline;">Terms</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top:14px;">
                    <p class="footerCopy" style="margin:0;font-size:11px;line-height:16px;font-family:${fontSans};color:#6b6560;">
                      You joined the ScentRev waitlist. Reply to either address above with questions.
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
}

/**
 * Plain-text fallback for the same email.
 *
 * Args:
 *   displayName: Greeting name.
 *   couponCode: Coupon code.
 *   discountPercent: Discount percent.
 *
 * Returns:
 *   Multiline plain string.
 */
export function buildWaitlistCouponEmailText(
  displayName: string,
  couponCode: string,
  discountPercent: number = WAITLIST_DISCOUNT,
): string {
  const storeUrl = getWaitlistEmailStoreUrl();
  return `You're on the ScentRev waitlist, ${displayName}.

Early access + launch discount.

Trust signals: 450+ fragrances (samples & full bottles) · From ₹199 micro samples · India-first (heat & humidity).

WHAT WE'RE BUILDING (MVP)
• Micro vials (3ml–10ml), India-first.
• Blind Buy Score 0-5: Reddit, Facebook, web + perfume metrics (weighted pipeline; 0 weak, 5 strong blind buy).
• Climate-aware picks.
• Quiz: your taste profile; Club auto-select uses it only when you enable it.
• Layering Lab (AI/ML-ranked combos): ${storeUrl}/layering-lab
• Club (Essential / Signature / Prestige): one 8ml/mo, your pick or quiz-based auto-select: ${storeUrl}/subscription
• Launch updates only from this signup.

YOUR CODE
${couponCode}

${discountPercent}% off your first order (one use, tied to this email).

When we're live: ${storeUrl}/shop-all · Quiz: ${storeUrl}/quiz · Club: ${storeUrl}/subscription

Support:
support@scentrev.com
shashank@scentrev.com

Privacy: ${storeUrl}/privacy
Terms: ${storeUrl}/terms

ScentRev · India · ${new Date().getFullYear()}`;
}

export { WAITLIST_DISCOUNT };
