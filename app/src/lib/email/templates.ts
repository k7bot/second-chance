/**
 * Brightside Yoga transactional email templates (HTML + plain text).
 * Table layout with inline styles so it renders in Gmail, Apple Mail and Outlook; 600px column that
 * collapses to full width on phones; one clear call-to-action button per email.
 */

export type EmailKind = "payment_failed" | "merchant_cancel" | "suspended" | "paypal_cancelled" | "confirmation";

export interface EmailInput {
  kind: EmailKind;
  firstName: string;
  headline: string;
  /** Paragraphs separated by blank lines. */
  body: string;
  /** Offer terms shown in a highlighted box, e.g. "$19/month for 3 months, then $29". */
  terms?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  /** Small print under the button. */
  note?: string | null;
  appUrl: string;
  /** Where /email/brightside-logo.png is served from (defaults to appUrl). */
  assetBase?: string;
  /** Show "just reply to this email" (only when replies reach someone, i.e. EMAIL_REPLY_TO is set). */
  replyHint?: boolean;
}

const C = {
  cream: "#fffaf4", card: "#ffffff", ink: "#2a2018", body: "#4a3b2f", muted: "#8a7868", line: "#f3e3d3",
  sun: "#e8743b", sunDark: "#c75a24", peach: "#fde7d3", soft: "#fdf0e6", green: "#047857", greenSoft: "#ecfdf5",
};
const SERIF = `'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif`;
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

const CHIP: Record<EmailKind, { label: string; bg: string; fg: string }> = {
  payment_failed: { label: "Quick fix needed", bg: "#fff1f2", fg: "#be123c" },
  merchant_cancel: { label: "An offer just for you", bg: C.soft, fg: C.sunDark },
  suspended: { label: "Welcome back", bg: C.soft, fg: C.sunDark },
  paypal_cancelled: { label: "We saved your spot", bg: "#f5f3ff", fg: "#6d28d9" },
  confirmation: { label: "You're all set", bg: C.greenSoft, fg: C.green },
};

const PREHEADER: Record<EmailKind, string> = {
  payment_failed: "Your classes stay open while you update your payment method.",
  merchant_cancel: "Before you go: an option picked for you.",
  suspended: "One tap brings your membership back.",
  paypal_cancelled: "Rejoin in one tap, with your offer already applied.",
  confirmation: "Your membership change is confirmed.",
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paras = (body: string) => body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

export function renderEmail(i: EmailInput): { subject: string; html: string; text: string } {
  const chip = CHIP[i.kind];
  const asset = (i.assetBase || i.appUrl).replace(/\/$/, "");
  const app = i.appUrl.replace(/\/$/, "");
  const subject = i.headline;
  const ps = paras(i.body);

  const button = i.ctaUrl && i.ctaLabel ? `
        <tr><td style="padding:8px 40px 8px 40px" class="px">
          <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr>
            <td align="center" bgcolor="${C.sun}" style="border-radius:999px;background:${C.sun}">
              <a href="${esc(i.ctaUrl)}" target="_blank" style="display:block;padding:16px 28px;font-family:${SANS};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px">${esc(i.ctaLabel)}&nbsp;&rarr;</a>
            </td></tr></table>
        </td></tr>` : "";

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>
  body{margin:0;padding:0;background:${C.cream}}
  a{color:${C.sunDark}}
  @media (max-width:620px){
    .wrap{width:100%!important}
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:28px!important;line-height:34px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(PREHEADER[i.kind])}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${C.cream}" style="background:${C.cream}">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" class="wrap" width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px">
      <tr><td style="padding:0 8px 18px 8px">
        <a href="${esc(app)}/store" style="text-decoration:none;color:${C.ink}">
          <img src="${esc(asset)}/email/brightside-logo.png" width="32" height="32" alt="" style="vertical-align:middle;border:0;display:inline-block">
          <span style="vertical-align:middle;font-family:${SERIF};font-size:21px;color:${C.ink};padding-left:6px">Brightside Yoga</span>
        </a>
      </td></tr>
      <tr><td bgcolor="${C.card}" style="background:${C.card};border-radius:24px;border:1px solid ${C.line};overflow:hidden">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr><td bgcolor="${C.peach}" style="background:${C.peach};background-image:linear-gradient(135deg,#fde7d3 0%,#fff1e3 60%,#ffffff 100%);border-radius:24px 24px 0 0;padding:32px 40px 26px 40px" class="px">
            <span style="display:inline-block;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:.4px;color:${chip.fg};background:${chip.bg};border-radius:999px;padding:5px 12px">${esc(chip.label)}</span>
            <h1 class="h1" style="margin:16px 0 0 0;font-family:${SERIF};font-weight:400;font-size:32px;line-height:38px;color:${C.ink}">${esc(i.headline)}</h1>
          </td></tr>
          <tr><td style="padding:26px 40px 6px 40px" class="px">
            ${ps.map((p) => `<p style="margin:0 0 16px 0;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body}">${esc(p)}</p>`).join("\n            ")}
          </td></tr>
          ${i.terms ? `<tr><td style="padding:0 40px 18px 40px" class="px">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>
              <td bgcolor="${C.soft}" style="background:${C.soft};border-radius:16px;padding:14px 18px;font-family:${SANS};font-size:15px;font-weight:700;line-height:22px;color:#8c3b2a">${esc(i.terms)}</td>
            </tr></table>
          </td></tr>` : ""}
          ${button}
          ${i.note ? `<tr><td style="padding:6px 40px 0 40px;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};text-align:center" class="px">${esc(i.note)}</td></tr>` : ""}
          <tr><td style="padding:26px 40px 30px 40px" class="px">
            <p style="margin:0;font-family:${SANS};font-size:15px;line-height:24px;color:${C.body}">See you on the mat,<br><span style="font-family:${SERIF};font-size:17px;color:${C.ink}">The Brightside Yoga team</span></p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 16px 0 16px;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};text-align:center">
        Billing is handled securely by PayPal.${i.replyHint ? " Questions? Just reply to this email." : ""}<br>
        Brightside Yoga is a demo studio for <a href="${esc(app)}" style="color:${C.muted};text-decoration:underline">Second Chance</a>, a PayPal Subscriptions retention agent. Sandbox only: no real money moves.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Brightside Yoga · ${chip.label}`,
    "",
    i.headline,
    "",
    ...ps.flatMap((p) => [p, ""]),
    ...(i.terms ? [`> ${i.terms}`, ""] : []),
    ...(i.ctaUrl && i.ctaLabel ? [`${i.ctaLabel}: ${i.ctaUrl}`, ""] : []),
    ...(i.note ? [i.note, ""] : []),
    "See you on the mat,",
    "The Brightside Yoga team",
    "",
    "--",
    `Billing is handled securely by PayPal.${i.replyHint ? " Questions? Just reply to this email." : ""}`,
    `Brightside Yoga is a demo studio for Second Chance (${app}). Sandbox only: no real money moves.`,
  ].join("\n");

  return { subject, html, text };
}

const fmt = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

/** Human terms for an offer, shared by the emails and the welcome-back page. */
export function offerTerms(o: { kind: string; priceMonthly: number | null; months: number | null }, listPrice: number): string {
  const m = o.months ?? 1;
  switch (o.kind) {
    case "pause": return `$0 for ${m} month${m > 1 ? "s" : ""}, then it picks back up on its own`;
    case "discount": return `${fmt(o.priceMonthly ?? listPrice)}/month for ${m} month${m > 1 ? "s" : ""}, then ${fmt(listPrice)}`;
    case "downgrade": return `Lite at ${fmt(o.priceMonthly ?? 15)}/month · switch back anytime`;
    case "winback": return o.priceMonthly === 0 ? `First month free, then ${fmt(listPrice)}/month` : `${fmt(o.priceMonthly ?? listPrice)}/month for ${m} month${m > 1 ? "s" : ""}, then ${fmt(listPrice)}`;
    case "comeback": return o.priceMonthly ? `Next month ${fmt(o.priceMonthly)}, then ${fmt(listPrice)}` : `Same plan, same ${fmt(listPrice)}/month`;
    case "recovery": return "Your classes stay open during the 7-day grace period";
    default: return "";
  }
}

/** Button label for an offer kind (email CTA and the welcome-back page). */
export function ctaFor(kind: string): string {
  return ({
    pause: "Pause my membership", discount: "Keep my membership at this price", downgrade: "Switch to Lite",
    comeback: "Reactivate my membership", winback: "Rejoin in one tap", recovery: "Update payment method",
  } as Record<string, string>)[kind] || "Open my offer";
}
