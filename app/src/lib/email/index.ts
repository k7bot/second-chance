import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { cfg, env } from "../config";
import { renderEmail, offerTerms, type EmailKind } from "./templates";
import type { OutboxRow, Offer, Subscriber } from "../db/schema";

/**
 * Real email via Resend's REST API (no SDK). Switched on only when RESEND_API_KEY and EMAIL_FROM are set;
 * otherwise every message stays in the outbox exactly as before. Every message is always recorded in the
 * outbox with its delivery status (sent | failed | outbox_only).
 *
 * Safety: practice (DEMO-), sample (SAMPLE-) and simulator members only have placeholder addresses and
 * never get real email. Sandbox buyers on @example.* style addresses stay outbox-only too. A judge can
 * still receive a practice member's email at their own address via the rate-limited "Send it to me".
 */

export const emailOn = () => Boolean(process.env.RESEND_API_KEY && env("EMAIL_FROM"));
export const emailFrom = () => env("EMAIL_FROM");

const RESEND_URL = "https://api.resend.com/emails";
const PLACEHOLDER_DOMAIN = /@(?:[a-z0-9-]+\.)*(?:example\.(?:com|org|net)|example|test|invalid|localhost)$/i;
const SIM_IDS = ["I-BW452GLLEP1G", "I-PE7JWXKGVN0R"];

export const isPlaceholderSub = (s: Pick<Subscriber, "id" | "source">) =>
  s.source === "simulator" || s.source === "sample" || SIM_IDS.includes(s.id) || s.id.startsWith("DEMO-") || s.id.startsWith("SAMPLE-");

/** Basic but strict-enough address check for user-entered emails. */
export function validEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/.test(e)) return null;
  if (e.split("@")[0].length > 64 || e.includes("..") || PLACEHOLDER_DOMAIN.test(e)) return null;
  return e;
}

/** "kiran@gmail.com" -> "k••••@gmail.com" (the outbox page is public, so never show full addresses). */
export function maskEmail(e: string): string {
  const [user, domain] = e.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(2, user.length - 1)))}@${domain}`;
}

/** Who a subscriber's message may really go to, or why it stays in the outbox. */
export function recipientFor(s: Pick<Subscriber, "id" | "source" | "email">): { to: string } | { skip: string } {
  if (isPlaceholderSub(s)) return { skip: s.id.startsWith("DEMO-") ? "practice member (placeholder address)" : s.id.startsWith("SAMPLE-") || s.source === "sample" ? "sample member (no real address)" : "simulator (placeholder address)" };
  if (!s.email) return { skip: "no email on file" };
  if (PLACEHOLDER_DOMAIN.test(s.email)) return { skip: "sandbox placeholder address" };
  if (!validEmail(s.email)) return { skip: "invalid address" };
  if (!emailOn()) return { skip: "email not switched on" };
  return { to: s.email };
}

export type SendResult = { status: "sent"; id: string } | { status: "failed"; error: string };

/** POST https://api.resend.com/emails. Never throws; never logs the key. Tests can stub globalThis.fetch. */
export async function sendEmail(m: { to: string; subject: string; html: string; text: string; tag?: string; idempotencyKey?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = emailFrom();
  if (!key || !from) return { status: "failed", error: "email not configured" };
  const replyTo = env("EMAIL_REPLY_TO");
  try {
    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from, to: [m.to], subject: m.subject, html: m.html, text: m.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(m.tag ? { tags: [{ name: "trigger", value: m.tag.replace(/[^A-Za-z0-9_-]/g, "_") }] } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (r.ok && j.id) return { status: "sent", id: j.id };
    return { status: "failed", error: `Resend ${r.status}${j.name ? ` ${j.name}` : ""}${j.message ? `: ${j.message}` : ""}`.slice(0, 300) };
  } catch (e) {
    return { status: "failed", error: `Resend request failed: ${(e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message}`.slice(0, 300) };
  }
}

/** Render an outbox row (plus its offer, for the terms box) into the branded email. */
export async function composeOutbox(row: OutboxRow) {
  const db = await getDb();
  const off: Offer | undefined = row.offerId ? (await db.select().from(schema.offers).where(eq(schema.offers.id, row.offerId)))[0] : undefined;
  const sub: Subscriber | undefined = row.subscriptionId ? (await db.select().from(schema.subscribers).where(eq(schema.subscribers.id, row.subscriptionId)))[0] : undefined;
  const kind = (["payment_failed", "merchant_cancel", "suspended", "paypal_cancelled", "confirmation"].includes(row.trigger ?? "") ? row.trigger : "confirmation") as EmailKind;
  const terms = off && kind !== "confirmation" && kind !== "payment_failed" ? offerTerms(off, sub?.priceMonthly ?? 29) || null : null;
  const note = kind === "payment_failed" ? "PayPal retries the payment automatically once your card is updated."
    : kind === "paypal_cancelled" ? "You'll confirm in PayPal. Nothing is charged until you do."
    : kind === "merchant_cancel" ? "Not for you? You can still cancel any time from your account page."
    : null;
  return renderEmail({
    kind, firstName: (row.toName || "").split(" ")[0] || "there", headline: row.subject, body: row.body, terms,
    ctaLabel: row.ctaLabel, ctaUrl: row.ctaUrl, note, appUrl: cfg.appUrl, replyHint: Boolean(env("EMAIL_REPLY_TO")),
  });
}

async function mark(id: string, patch: Partial<OutboxRow>) {
  const db = await getDb();
  await db.update(schema.outbox).set(patch).where(eq(schema.outbox.id, id));
}

/** Try to deliver an outbox row to its own subscriber (respecting the placeholder rules). */
export async function deliverOutbox(row: OutboxRow, sub: Pick<Subscriber, "id" | "source" | "email">): Promise<OutboxRow["deliveryStatus"]> {
  const who = recipientFor(sub);
  if ("skip" in who) { await mark(row.id, { deliveryStatus: "outbox_only", deliveryDetail: who.skip }); return "outbox_only"; }
  return deliverTo(row, who.to, "subscriber");
}

/** Deliver an outbox row to a specific address (used by "Send it to me" for practice members). */
export async function deliverTo(row: OutboxRow, to: string, why: "subscriber" | "requested"): Promise<OutboxRow["deliveryStatus"]> {
  const mail = await composeOutbox(row);
  const r = await sendEmail({
    to, ...mail, tag: row.trigger ?? "message",
    idempotencyKey: `${row.id}:${createHash("sha256").update(to).digest("hex").slice(0, 16)}`,
  });
  if (r.status === "sent") {
    await mark(row.id, { deliveryStatus: "sent", providerMessageId: r.id, deliveredTo: maskEmail(to), sentAt: new Date(), deliveryDetail: why === "requested" ? "sent to the address a visitor entered" : null });
  } else {
    console.error(`[email] ${row.id} failed: ${r.error}`);
    await mark(row.id, { deliveryStatus: "failed", deliveryDetail: r.error, deliveredTo: maskEmail(to) });
  }
  return r.status;
}
