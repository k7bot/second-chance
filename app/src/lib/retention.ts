import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { cfg, planInfo } from "./config";
import { approveLink, subs } from "./paypal";
import { deliverOutbox } from "./email";
import { ctaFor } from "./email/templates";
import { getEngine, type CancelReason, type OfferContext, type OfferDecision, type Trigger } from "./offers";

const { subscribers, events, offers, outbox } = schema;
export const SIM_SUB_PREFIXES = ["I-BW452GLLEP1G", "I-PE7JWXKGVN0R"]; // canned simulator subscription ids (PAYMENT.FAILED uses the first; SUSPENDED/CANCELLED the second)
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
const DAY = 86400000;

export type Sub = typeof subscribers.$inferSelect;

/* ---------------- Subscribers ---------------- */

export async function getSub(id: string): Promise<Sub | undefined> {
  const db = await getDb();
  return (await db.select().from(subscribers).where(eq(subscribers.id, id)))[0];
}

async function patchSub(id: string, patch: Partial<Sub>) {
  const db = await getDb();
  await db.update(subscribers).set({ ...patch, updatedAt: new Date() }).where(eq(subscribers.id, id));
}

/** Upsert a subscriber from a PayPal subscription resource (webhook or GET). */
/** Simulator payload ids plus local practice members ("DEMO-…") never touch PayPal. */
export const DEMO_PREFIX = "DEMO-";
export const isSimId = (id: string) => SIM_SUB_PREFIXES.includes(id) || id.startsWith(DEMO_PREFIX) || id.startsWith("SAMPLE-");

export async function upsertFromResource(r: any, source: "paypal" | "simulator" | "store" = "paypal"): Promise<Sub> {
  const db = await getDb();
  const id: string = r.id;
  const plan = planInfo(r.plan_id);
  const name = [r.subscriber?.name?.given_name, r.subscriber?.name?.surname].filter(Boolean).join(" ") || (isSimId(r.id) ? "Jordan Rivera" : null);
  const overridePrice = Number(r.plan?.billing_cycles?.find((c: any) => c.pricing_scheme)?.pricing_scheme?.fixed_price?.value);
  const lastAmt = Number(r.billing_info?.last_payment?.amount?.value);
  const price = plan.key !== "unknown" ? plan.price : Number.isFinite(lastAmt) && lastAmt > 0 ? lastAmt : Number.isFinite(overridePrice) && overridePrice > 0 ? overridePrice : 29;
  const row = {
    id,
    email: r.subscriber?.email_address ?? (isSimId(r.id) ? "simulator@example.com" : null),
    name,
    planId: r.plan_id ?? null,
    planName: plan.name,
    priceMonthly: price,
    status: r.status ?? "UNKNOWN",
    startTime: r.start_time ? new Date(r.start_time) : null,
    lastPaymentAt: r.billing_info?.last_payment?.time ? new Date(r.billing_info.last_payment.time) : null,
    nextBillingAt: r.billing_info?.next_billing_time ? new Date(r.billing_info.next_billing_time) : null,
    customId: r.custom_id ?? null,
  };
  const existing = await getSub(id);
  if (!existing) {
    await db.insert(subscribers).values({ ...row, source: isSimId(id) ? "simulator" : source });
  } else {
    // keep known values when the payload is sparse
    const merged = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined));
    await patchSub(id, merged as Partial<Sub>);
  }
  return (await getSub(id))!;
}

/** Pull the latest state from PayPal (no-op for simulator ids). */
export async function syncFromPayPal(id: string, source: "paypal" | "store" = "paypal"): Promise<Sub | undefined> {
  if (isSimId(id)) return getSub(id);
  const r = await subs.get(id);
  if (!r.ok) return getSub(id);
  return upsertFromResource(r.data, source);
}

function tenureMonths(s: Sub): number {
  const start = s.startTime?.getTime() ?? s.createdAt.getTime();
  return Math.max(0, Math.floor((Date.now() - start) / (30.44 * DAY)));
}

async function context(s: Sub, trigger: Trigger, reason?: CancelReason, reasonText?: string): Promise<OfferContext> {
  const db = await getDb();
  const prior = await db.select({ n: sql<number>`count(*)` }).from(offers)
    .where(and(eq(offers.subscriptionId, s.id), eq(offers.status, "saved")));
  return {
    trigger,
    reason,
    reasonText,
    subscriber: {
      firstName: (s.name || "").split(" ")[0] || "there",
      planName: s.planName || "Brightside Pro",
      priceMonthly: s.priceMonthly,
      tenureMonths: tenureMonths(s),
      failedPayments: s.failedPayments,
      status: s.status,
      priorSaves: Number(prior[0]?.n ?? 0),
    },
  };
}

async function recordOffer(s: Sub, trigger: Trigger, d: OfferDecision, extra: Partial<typeof offers.$inferInsert> = {}) {
  const db = await getDb();
  const id = uid("off");
  await db.insert(offers).values({
    id, subscriptionId: s.id, trigger, kind: d.kind, headline: d.headline, message: d.message, rationale: d.rationale,
    engine: d.engine, priceMonthly: d.priceMonthly ?? null, months: d.months ?? null, ...extra,
  });
  return (await db.select().from(offers).where(eq(offers.id, id)))[0];
}

type OutboxTrigger = Trigger | "confirmation";

/** Record a message in the outbox, then email it for real when allowed (see lib/email). */
async function sendOutbox(s: Sub, offerId: string | null, trigger: OutboxTrigger, subject: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  const db = await getDb();
  const id = uid("msg");
  await db.insert(outbox).values({
    id, subscriptionId: s.id, offerId, toEmail: s.email, toName: s.name, subject, body,
    ctaLabel: ctaLabel ?? null, ctaUrl: ctaUrl ?? null, trigger,
  });
  const row = (await db.select().from(outbox).where(eq(outbox.id, id)))[0];
  try { await deliverOutbox(row, s); } catch (e) { console.error(`[email] ${id}: ${(e as Error).message}`); }
  return row;
}

/** The outbox message for a save offer made in the cancel flow (created on demand, e.g. for "Send it to me"). */
export async function outboxForOffer(offerId: string) {
  const db = await getDb();
  const off = (await db.select().from(offers).where(eq(offers.id, offerId)))[0];
  if (!off) return { error: "Offer not found" as const };
  const s = await getSub(off.subscriptionId);
  if (!s) return { error: "Offer not found" as const };
  const existing = (await db.select().from(outbox).where(and(eq(outbox.offerId, off.id), eq(outbox.trigger, off.trigger))).orderBy(desc(outbox.createdAt)))[0];
  if (existing) return { row: existing, sub: s, offer: off };
  if (off.kind === "let_go") return { error: "There's no offer to send for this one." as const };
  const id = uid("msg");
  await db.insert(outbox).values({
    id, subscriptionId: s.id, offerId: off.id, toEmail: s.email, toName: s.name, subject: off.headline || "An offer from Brightside Yoga",
    body: off.message || "", ctaLabel: ctaFor(off.kind), ctaUrl: `${cfg.appUrl}/store/welcome-back/${off.id}`, trigger: off.trigger,
    deliveryDetail: isSim(s) || isSimId(s.id) ? "practice member (placeholder address)" : "shown on site",
  });
  return { row: (await db.select().from(outbox).where(eq(outbox.id, id)))[0], sub: s, offer: off };
}

/** Confirmation email after a customer acts on an offer (saved, waiting on PayPal, or cancelled). */
export async function confirmOutcome(offerId: string, r: AcceptResult) {
  if (r.state === "error") return;
  const db = await getDb();
  const off = (await db.select().from(offers).where(eq(offers.id, offerId)))[0];
  if (!off || (off.kind === "winback" && r.state === "pending_consent")) return;
  const s = await getSub(off.subscriptionId);
  if (!s) return;
  const first = (s.name || "").split(" ")[0] || "there";
  const account = `${cfg.appUrl}/store/account`;
  let m: { subject: string; body: string; cta?: string; url?: string };
  if (r.state === "pending_consent") {
    m = { subject: "One last step: confirm in PayPal", body: `Hi ${first}, your new price is ready. PayPal just needs you to confirm it, which takes about ten seconds.\n\nUntil you confirm, nothing changes and nothing extra is charged.`, cta: "Confirm in PayPal", url: r.approveUrl };
  } else if (r.state === "lost") {
    m = { subject: "Your membership is cancelled", body: `Hi ${first}, your cancellation is confirmed and you won't be charged again.\n\nThank you for practising with us. If you ever want to come back, your mat is waiting.`, cta: "Rejoin Brightside", url: `${cfg.appUrl}/store` };
  } else {
    const subject = off.kind === "pause" ? "Your membership is paused"
      : off.kind === "comeback" || off.kind === "recovery" ? `Welcome back, ${first}!`
      : "Your new price is locked in";
    m = { subject, body: `Hi ${first}, it's done. ${r.detail}\n\nYour classes, streaks and saved sessions are all right where you left them.`,
      ...(r.approveUrl ? { cta: "Confirm your discounted month", url: r.approveUrl } : { cta: "View my membership", url: account }) };
  }
  const dupe = (await db.select({ id: outbox.id }).from(outbox).where(and(eq(outbox.offerId, off.id), eq(outbox.trigger, "confirmation"), eq(outbox.subject, m.subject))))[0];
  if (dupe) return;
  await sendOutbox(s, off.id, "confirmation", m.subject, m.body, m.cta, m.url);
}

async function resolveOffer(id: string, status: string, mrrSaved = 0, extra: Partial<typeof offers.$inferInsert> = {}) {
  const db = await getDb();
  await db.update(offers).set({ status, mrrSaved, resolvedAt: new Date(), ...extra }).where(eq(offers.id, id));
}

/* ---------------- PayPal actions behind offers ---------------- */

const isSim = (s: Sub) => s.source === "simulator" || s.source === "sample";

/** Discounts use revise -> Save 50% plan with a per-subscriber price override (the buyer consents in PayPal). */
async function reviseToDiscount(s: Sub, price: number, months: number, returnPath: string) {
  return subs.revise(s.id, {
    plan_id: cfg.plans.save50,
    plan: { billing_cycles: [{ sequence: 1, total_cycles: Math.max(1, months), pricing_scheme: { fixed_price: { value: price.toFixed(2), currency_code: "USD" } } }] },
    application_context: { brand_name: "Brightside Yoga", return_url: `${cfg.appUrl}${returnPath}`, cancel_url: `${cfg.appUrl}${returnPath}&declined=1` },
  });
}

async function reviseToLite(s: Sub, returnPath: string) {
  return subs.revise(s.id, {
    plan_id: cfg.plans.lite,
    application_context: { brand_name: "Brightside Yoga", return_url: `${cfg.appUrl}${returnPath}`, cancel_url: `${cfg.appUrl}${returnPath}&declined=1` },
  });
}

/** Win-back: a brand-new subscription on the Win-back plan, with the offer pre-applied as a price override. */
async function createWinback(s: Sub, d: OfferDecision, offerId: string) {
  const free = (d.priceMonthly ?? 0) === 0;
  const body: any = {
    plan_id: cfg.plans.winback,
    custom_id: `winback:${s.id}:${offerId}`.slice(0, 127),
    application_context: {
      brand_name: "Brightside Yoga", user_action: "SUBSCRIBE_NOW",
      return_url: `${cfg.appUrl}/store/welcome-back/${offerId}?done=1`, cancel_url: `${cfg.appUrl}/store/welcome-back/${offerId}`,
    },
  };
  if (s.email && !s.email.endsWith("@example.com")) body.subscriber = { email_address: s.email };
  if (!free) body.plan = { billing_cycles: [{ sequence: 1, total_cycles: Math.max(1, d.months ?? 1), pricing_scheme: { fixed_price: { value: d.priceMonthly!.toFixed(2), currency_code: "USD" } } }] };
  return subs.create(body);
}

/* ---------------- Case handlers (webhooks) ---------------- */

export async function handleEvent(evt: any): Promise<string> {
  const type: string = evt.event_type;
  const r = evt.resource || {};
  if (type === "PAYMENT.SALE.COMPLETED") return onPaymentCompleted(r);
  if (!type.startsWith("BILLING.SUBSCRIPTION.") || !r.id) return "ignored";
  const before = await getSub(r.id);
  const s = await upsertFromResource(r, before?.source === "store" ? "store" : "paypal");

  switch (type) {
    case "BILLING.SUBSCRIPTION.CREATED":
      return "subscriber recorded";
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      return onActivated(s, before);
    case "BILLING.SUBSCRIPTION.UPDATED":
      return onUpdated(s);
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      return onPaymentFailed(s);
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      if (s.expectStatus === "SUSPENDED") { await patchSub(s.id, { expectStatus: null }); return "pause we initiated, no action"; }
      return onSuspended(s);
    case "BILLING.SUBSCRIPTION.CANCELLED":
      if (s.expectStatus === "CANCELLED") { await patchSub(s.id, { expectStatus: null }); return "cancelled via merchant save flow, no win-back now"; }
      return onPayPalCancelled(s);
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await patchSub(s.id, { risk: "lost", riskReason: "expired" });
      return "marked lost (expired)";
  }
  return "recorded";
}

async function openOffers(subId: string, statuses = ["proposed", "pending_consent"]) {
  const db = await getDb();
  return db.select().from(offers).where(and(eq(offers.subscriptionId, subId), inArray(offers.status, statuses))).orderBy(desc(offers.createdAt));
}

async function onActivated(s: Sub, before?: Sub) {
  const db = await getDb();
  if (s.expectStatus === "ACTIVE") await patchSub(s.id, { expectStatus: null });
  // win-back: the new subscription's custom_id points to the offer
  const m = s.customId?.match(/^winback:([^:]+):(.+)$/);
  if (m) {
    const off = (await db.select().from(offers).where(eq(offers.id, m[2])))[0];
    if (off && off.status !== "saved") {
      await resolveOffer(off.id, "saved", s.priceMonthly, { newSubscriptionId: s.id });
      await patchSub(off.subscriptionId, { risk: "saved", riskReason: "won back" });
      await patchSub(s.id, { risk: "saved", riskReason: "won back" });
      return `win-back accepted (offer ${off.id})`;
    }
  }
  const pend = (await openOffers(s.id)).find((o) => o.kind === "comeback" || o.kind === "recovery");
  if (before?.status === "SUSPENDED" && pend) {
    await resolveOffer(pend.id, "saved", s.priceMonthly);
    await patchSub(s.id, { risk: "saved", riskReason: "came back", graceUntil: null });
    return `came back (offer ${pend.id})`;
  }
  if (s.risk === "at_risk" && s.riskReason === "suspended") await patchSub(s.id, { risk: "healthy" });
  return "active";
}

async function onUpdated(s: Sub) {
  const pend = (await openOffers(s.id, ["pending_consent"])).find((o) => o.kind === "discount" || o.kind === "downgrade" || o.kind === "comeback");
  if (pend && pend.targetPlanId && s.planId === pend.targetPlanId) {
    await resolveOffer(pend.id, "saved", pend.priceMonthly ?? s.priceMonthly);
    await patchSub(s.id, { risk: "saved", riskReason: `accepted ${pend.kind}` });
    return `plan switch confirmed by buyer (offer ${pend.id})`;
  }
  return "updated";
}

async function onPaymentFailed(s: Sub) {
  const failed = s.failedPayments + 1;
  const grace = new Date(Date.now() + 7 * DAY);
  await patchSub(s.id, { failedPayments: failed, risk: "at_risk", riskReason: "payment failed", graceUntil: grace });
  const fresh = (await getSub(s.id))!;
  const d = await getEngine().decide(await context(fresh, "payment_failed"));
  const off = await recordOffer(fresh, "payment_failed", d, { status: "proposed", months: 0 });
  await sendOutbox(fresh, off.id, "payment_failed", d.headline,
    `${d.message}\n\nGrace period: your access stays on until ${grace.toDateString()}. PayPal will retry the payment automatically.`,
    "Update payment method", `${cfg.appUrl}/store/welcome-back/${off.id}`);
  return `recovery message sent, grace until ${grace.toISOString().slice(0, 10)}`;
}

async function onPaymentCompleted(r: any) {
  const subId = r.billing_agreement_id;
  if (!subId) return "sale (not a subscription)";
  const s = await getSub(subId);
  if (!s) return "sale for unknown subscription";
  await patchSub(subId, { lastPaymentAt: new Date(), failedPayments: 0, graceUntil: null });
  const pend = (await openOffers(subId)).find((o) => o.kind === "recovery");
  if (pend) {
    await resolveOffer(pend.id, "saved", s.priceMonthly);
    await patchSub(subId, { risk: "saved", riskReason: "payment recovered" });
    return `payment recovered (offer ${pend.id})`;
  }
  return "payment recorded";
}

async function onSuspended(s: Sub) {
  await patchSub(s.id, { risk: "at_risk", riskReason: "suspended", ...(s.status === "UNKNOWN" || !s.status ? { status: "SUSPENDED" } : {}) });
  const d = await getEngine().decide(await context(s, "suspended"));
  const off = await recordOffer(s, "suspended", d);
  await sendOutbox(s, off.id, "suspended", d.headline, d.message, "Reactivate my membership", `${cfg.appUrl}/store/welcome-back/${off.id}`);
  return `come-back offer sent (${d.kind})`;
}

async function onPayPalCancelled(s: Sub) {
  await patchSub(s.id, { risk: "at_risk", riskReason: "cancelled in PayPal", ...(s.status === "UNKNOWN" || !s.status ? { status: "CANCELLED" } : {}) });
  const d = await getEngine().decide(await context(s, "paypal_cancelled"));
  if (d.kind === "let_go") {
    await recordOffer(s, "paypal_cancelled", d, { status: "lost" });
    await patchSub(s.id, { risk: "lost" });
    return "let go";
  }
  const off = await recordOffer(s, "paypal_cancelled", d);
  const created = await createWinback(s, d, off.id);
  const link = approveLink(created.data);
  const db = await getDb();
  await db.update(offers).set({
    status: created.ok ? "pending_consent" : "proposed",
    approveUrl: link ?? null, newSubscriptionId: created.data?.id ?? null, targetPlanId: cfg.plans.winback,
    rationale: created.ok ? d.rationale : `${d.rationale} (PayPal create failed: ${created.status})`,
  }).where(eq(offers.id, off.id));
  await sendOutbox(s, off.id, "paypal_cancelled", d.headline, d.message, "Rejoin in one tap", `${cfg.appUrl}/store/welcome-back/${off.id}`);
  return created.ok ? `win-back sent, new subscription ${created.data.id}` : `win-back sent, PayPal create failed (${created.status})`;
}

/* ---------------- Merchant-site save flow ---------------- */

export async function proposeSave(subId: string, reason: CancelReason, reasonText?: string, clientKey?: string) {
  const s = await getSub(subId);
  if (!s) throw new Error("unknown subscription");
  const db = await getDb();
  // supersede earlier, unanswered proposals
  await db.update(offers).set({ status: "declined", resolvedAt: new Date() })
    .where(and(eq(offers.subscriptionId, subId), eq(offers.trigger, "merchant_cancel"), eq(offers.status, "proposed")));
  await patchSub(subId, { risk: "at_risk", riskReason: `cancel intent: ${reason}` });
  const d = await getEngine().decide({ ...(await context(s, "merchant_cancel", reason, reasonText)), clientKey });
  return recordOffer(s, "merchant_cancel", d, { reason: reasonText ? `${reason}: ${reasonText}` : reason });
}

/**
 * The member chose "cancel without an offer" on the cancel page: no engine call, no offer shown.
 * Recorded as a let_go so the merchant still sees the cancel (and the reason, if given).
 */
export async function cancelWithoutOffer(subId: string, reason?: CancelReason, reasonText?: string): Promise<AcceptResult & { offerId?: string }> {
  const s = await getSub(subId);
  if (!s) return { state: "error", detail: "unknown subscription" };
  const db = await getDb();
  await db.update(offers).set({ status: "declined", resolvedAt: new Date() })
    .where(and(eq(offers.subscriptionId, subId), eq(offers.trigger, "merchant_cancel"), eq(offers.status, "proposed")));
  const off = await recordOffer(s, "merchant_cancel", {
    kind: "let_go", headline: "Cancelled without an offer", message: "The member chose to cancel straight away, so no offer was shown.",
    rationale: "Member skipped the save offer and cancelled directly.", engine: "none (member skipped the offer)",
  }, { reason: reason ? (reasonText ? `${reason}: ${reasonText}` : reason) : "skipped" });
  const r = await declineOffer(off.id);
  return { ...r, offerId: off.id };
}

export type AcceptResult = { state: "saved" | "pending_consent" | "lost" | "error"; approveUrl?: string; detail: string };

export async function acceptOffer(offerId: string): Promise<AcceptResult> {
  const db = await getDb();
  const off = (await db.select().from(offers).where(eq(offers.id, offerId)))[0];
  if (!off) return { state: "error", detail: "Offer not found" };
  const s = (await getSub(off.subscriptionId))!;
  const ret = `/store/account?offer=${off.id}`;

  if (off.kind === "pause") {
    const months = off.months || 1;
    // PayPal quirk: while a revise is awaiting buyer consent, /activate fails with SESSION_STATE_NOT_VALID,
    // so a pause taken now could not be resumed. Ask the buyer to finish (or let expire) the pending change first.
    const pendingRevise = (await openOffers(s.id, ["pending_consent"])).find((o) => o.id !== off.id && (o.kind === "discount" || o.kind === "downgrade"));
    if (pendingRevise && !isSim(s)) return { state: "error", detail: "You have a price change waiting for confirmation in PayPal. Please confirm it first." };
    const until = new Date(Date.now() + months * 30 * DAY);
    if (!isSim(s)) {
      await patchSub(s.id, { expectStatus: "SUSPENDED" });
      const r = await subs.suspend(s.id, `Paused for ${months} month(s) via Second Chance`);
      if (!r.ok) return { state: "error", detail: `PayPal suspend failed (${r.status})` };
    }
    await patchSub(s.id, { status: "SUSPENDED", pausedUntil: until, risk: "saved", riskReason: "paused" });
    await resolveOffer(off.id, "saved", s.priceMonthly);
    return { state: "saved", detail: `Your membership is paused until ${until.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. No charges until then.` };
  }

  if (off.kind === "discount" || off.kind === "downgrade") {
    if (isSim(s)) {
      await resolveOffer(off.id, "saved", off.priceMonthly ?? 0);
      await patchSub(s.id, { risk: "saved", riskReason: `accepted ${off.kind}` });
      const fmt = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
      return { state: "saved", detail: off.kind === "downgrade"
        ? `You're on Lite at ${fmt(off.priceMonthly ?? 15)}/month from your next bill.`
        : `You'll pay ${fmt(off.priceMonthly ?? 0)}/month for the next ${off.months ?? 1} month${(off.months ?? 1) > 1 ? "s" : ""}, then ${fmt(s.priceMonthly)}.` };
    }
    const r = off.kind === "discount"
      ? await reviseToDiscount(s, off.priceMonthly ?? s.priceMonthly * 0.5, off.months ?? 3, ret)
      : await reviseToLite(s, ret);
    const link = approveLink(r.data);
    if (!r.ok || !link) return { state: "error", detail: `PayPal revise failed (${r.status}${r.data?.details?.[0]?.issue ? `: ${r.data.details[0].issue}` : ""})` };
    await db.update(offers).set({ status: "pending_consent", approveUrl: link, targetPlanId: off.kind === "discount" ? cfg.plans.save50 : cfg.plans.lite }).where(eq(offers.id, off.id));
    await patchSub(s.id, { risk: "pending", riskReason: `${off.kind} awaiting PayPal confirmation` });
    return { state: "pending_consent", approveUrl: link, detail: "Confirm the new price in PayPal" };
  }

  if (off.kind === "comeback" || off.kind === "recovery") {
    if (!isSim(s) && s.status === "SUSPENDED") {
      await patchSub(s.id, { expectStatus: "ACTIVE" });
      const r = await subs.activate(s.id, "Reactivated via Second Chance");
      if (!r.ok) return { state: "error", detail: `PayPal activate failed (${r.status})` };
    }
    await patchSub(s.id, { status: s.status === "SUSPENDED" ? "ACTIVE" : s.status, risk: "saved", riskReason: off.kind === "comeback" ? "came back" : "payment recovered", graceUntil: null, pausedUntil: null });
    if (off.kind === "comeback" && off.priceMonthly && !isSim(s)) {
      const r = await reviseToDiscount(s, off.priceMonthly, off.months ?? 1, ret);
      const link = approveLink(r.data);
      await resolveOffer(off.id, "saved", s.priceMonthly, { approveUrl: link ?? null });
      return { state: "saved", approveUrl: link, detail: "Membership reactivated. Confirm your discounted month in PayPal." };
    }
    await resolveOffer(off.id, "saved", s.priceMonthly);
    return { state: "saved", detail: "Membership reactivated" };
  }

  if (off.kind === "winback") {
    if (off.approveUrl) return { state: "pending_consent", approveUrl: off.approveUrl, detail: "Finish rejoining in PayPal" };
    return { state: "error", detail: "No win-back link available" };
  }

  // let_go = the customer confirms cancellation
  return declineOffer(offerId);
}

export async function declineOffer(offerId: string): Promise<AcceptResult> {
  const db = await getDb();
  const off = (await db.select().from(offers).where(eq(offers.id, offerId)))[0];
  if (!off) return { state: "error", detail: "Offer not found" };
  const s = (await getSub(off.subscriptionId))!;
  if (off.trigger === "merchant_cancel") {
    if (!isSim(s) && !["CANCELLED", "EXPIRED"].includes(s.status)) {
      await patchSub(s.id, { expectStatus: "CANCELLED" });
      const r = await subs.cancel(s.id, `Cancelled by customer (${off.reason ?? "no reason"})`);
      if (!r.ok) return { state: "error", detail: `PayPal cancel failed (${r.status})` };
    }
    await patchSub(s.id, { status: "CANCELLED", risk: "lost", riskReason: off.reason ?? "cancelled" });
  }
  await resolveOffer(off.id, off.kind === "let_go" ? "lost" : "declined");
  return { state: "lost", detail: "Membership cancelled" };
}

export async function resumeNow(subId: string) {
  const s = await getSub(subId);
  if (!s) throw new Error("unknown subscription");
  if (!isSim(s) && s.status === "SUSPENDED") {
    await patchSub(s.id, { expectStatus: "ACTIVE" });
    const r = await subs.activate(s.id, "Resumed early via Second Chance");
    if (!r.ok) {
      await patchSub(s.id, { expectStatus: null });
      const issue = r.data?.details?.[0]?.issue;
      throw new Error(issue === "SESSION_STATE_NOT_VALID"
        ? "PayPal won't resume this subscription while a plan change is waiting for the buyer's consent"
        : `PayPal activate failed (${r.status}${issue ? `: ${issue}` : ""})`);
    }
  }
  await patchSub(s.id, { status: "ACTIVE", pausedUntil: null });
}

/** Re-check pending plan switches against PayPal (when the buyer returns from the approve page). */
export async function reconcile(subId: string) {
  const s = await syncFromPayPal(subId);
  if (s) await onUpdated(s);
  return getSub(subId);
}
