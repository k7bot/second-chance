/** Render every email template to HTML (for screenshots / review):  npx tsx scripts/render-emails.ts <outDir> */
import fs from "node:fs";
import path from "node:path";
import { renderEmail, offerTerms, ctaFor, type EmailInput } from "../src/lib/email/templates";

const out = process.argv[2] || "../shots/email";
fs.mkdirSync(out, { recursive: true });
const appUrl = "https://second-chance-k12-4d00.vercel.app";
const assetBase = `file://${path.resolve("public")}`;
const wb = `${appUrl}/store/welcome-back/off_demo123`;
const cases: Record<string, EmailInput> = {
  "1-payment-failed-recovery": { kind: "payment_failed", firstName: "Maya", headline: "Your payment didn't go through, Maya", body: "Hi Maya, PayPal couldn't take this month's $29 for Brightside Pro. It happens, and it's an easy fix.\n\nGrace period: your access stays on until Mon Nov 09 2026. PayPal will retry the payment automatically.", ctaLabel: "Update payment method", ctaUrl: wb, note: "PayPal retries the payment automatically once your card is updated.", appUrl, assetBase, replyHint: true },
  "2-save-offer": { kind: "merchant_cancel", firstName: "Maya", headline: "Stay for less: $14.50 a month", body: "Hi Maya, you've practised with us for 14 months and we'd love to keep you on the mat. If money is tight right now, here's half price for the next three months.\n\nSame classes, same teachers, no strings.", terms: offerTerms({ kind: "discount", priceMonthly: 14.5, months: 3 }, 29), ctaLabel: ctaFor("discount"), ctaUrl: wb, note: "Not for you? You can still cancel any time from your account page.", appUrl, assetBase, replyHint: true },
  "3-suspended-comeback": { kind: "suspended", firstName: "Jordan", headline: "Your mat misses you, Jordan", body: "Your Brightside membership is on hold. Bring it back with one tap and pick up right where you left off: your streak, your saved classes, all of it.", terms: offerTerms({ kind: "comeback", priceMonthly: 19, months: 1 }, 29), ctaLabel: "Reactivate my membership", ctaUrl: wb, appUrl, assetBase, replyHint: true },
  "4-winback-after-paypal-cancel": { kind: "paypal_cancelled", firstName: "Jordan", headline: "Come back with your first month free", body: "We noticed you cancelled in PayPal. No hard feelings. If you'd like to give it another go, your first month back is on us.", terms: offerTerms({ kind: "winback", priceMonthly: 0, months: 1 }, 29), ctaLabel: "Rejoin in one tap", ctaUrl: wb, note: "You'll confirm in PayPal. Nothing is charged until you do.", appUrl, assetBase, replyHint: true },
  "5-confirmation-paused": { kind: "confirmation", firstName: "Maya", headline: "Your membership is paused", body: "Hi Maya, it's done. Your membership is paused until December 2. No charges until then.\n\nYour classes, streaks and saved sessions are all right where you left them.", ctaLabel: "View my membership", ctaUrl: `${appUrl}/store/account`, appUrl, assetBase, replyHint: true },
  "6-confirmation-pending-paypal": { kind: "confirmation", firstName: "Riley", headline: "One last step: confirm in PayPal", body: "Hi Riley, your new price is ready. PayPal just needs you to confirm it, which takes about ten seconds.\n\nUntil you confirm, nothing changes and nothing extra is charged.", ctaLabel: "Confirm in PayPal", ctaUrl: "https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-DEMO", appUrl, assetBase, replyHint: true },
};
for (const [name, input] of Object.entries(cases)) {
  const m = renderEmail(input);
  fs.writeFileSync(path.join(out, `${name}.html`), m.html);
  fs.writeFileSync(path.join(out, `${name}.txt`), `Subject: ${m.subject}\n\n${m.text}\n`);
}
console.log(Object.keys(cases).join("\n"));
