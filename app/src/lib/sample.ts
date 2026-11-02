import { like } from "drizzle-orm";
import { getDb, schema } from "./db";
import { cfg } from "./config";

/**
 * Sample history: a clearly-labelled synthetic book of business for Brightside Yoga
 * (ids "SAMPLE-…", source "sample", event verification "SAMPLE"). It never touches PayPal.
 * It exists so the analytics have six months of shape to show; live sandbox data sits on top.
 */
export const SAMPLE_PREFIX = "SAMPLE-";
const DAY = 86_400_000;

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FIRST = ["Olivia", "Liam", "Emma", "Noah", "Amara", "Mateo", "Sofia", "Kenji", "Priya", "Lucas", "Isla", "Diego", "Hana", "Ethan", "Zara", "Omar", "Chloe", "Arjun", "Mia", "Theo", "Leila", "Sam", "Nora", "Felix", "Ines", "Ravi", "Grace", "Jonah", "Elena", "Kai", "Ruby", "Malik", "Aisha", "Ben", "Freya", "Tomas", "Yara", "Caleb", "Lena", "Marcus"];
const LAST = ["Nguyen", "Okafor", "Silva", "Kowalski", "Haddad", "Tanaka", "Murphy", "Patel", "Rossi", "Johansson", "Garcia", "Kim", "Mensah", "Novak", "Fischer", "Ali", "Dubois", "Moreau", "Santos", "Reyes", "Clarke", "Brennan", "Ibrahim", "Lindqvist", "Costa", "Walsh", "Sato", "Bauer"];

type Kind = "pause" | "discount" | "downgrade" | "winback" | "recovery" | "comeback" | "let_go";
const SAVE_RATE: Record<Kind, number> = { pause: 0.74, discount: 0.63, downgrade: 0.57, recovery: 0.82, comeback: 0.48, winback: 0.29, let_go: 0 };
const REASONS = ["too_expensive", "not_using", "taking_break", "missing_features", "technical", "switching"] as const;
const REASON_KIND: Record<string, Kind[]> = {
  too_expensive: ["discount", "discount", "downgrade"], not_using: ["pause", "downgrade", "discount"], taking_break: ["pause", "pause"],
  missing_features: ["discount", "let_go"], technical: ["discount", "pause"], switching: ["let_go", "discount"],
};
const COPY: Record<Kind, (p: number) => { headline: string; message: string; rationale: string }> = {
  pause: () => ({ headline: "Pause instead of cancelling", message: "Keep your spot and your streak. We'll pause billing for 2 months.", rationale: "Break-type reason; pause keeps the relationship at no cost." }),
  discount: (p) => ({ headline: `Stay for $${(p / 2).toFixed(2).replace(/\.00$/, "")}/month`, message: "Half price for the next 3 months, then back to normal.", rationale: "Price-sensitive reason with healthy tenure." }),
  downgrade: () => ({ headline: "Switch to Lite for $15/month", message: "Keep live classes on weekends at a lower price.", rationale: "Low usage; a cheaper plan fits better than leaving." }),
  recovery: () => ({ headline: "Your payment didn't go through", message: "Update your PayPal funding source and we'll retry. Classes stay open for 7 days.", rationale: "Involuntary churn; give a grace period and a retry." }),
  comeback: () => ({ headline: "Pick up where you left off", message: "Your membership is on hold. Reactivate in one click.", rationale: "Suspended after retries; reactivation link." }),
  winback: () => ({ headline: "Your first month back is on us", message: "Come back free for a month, then $29.", rationale: "Cancelled in PayPal; win-back with a free month." }),
  let_go: () => ({ headline: "Sorry to see you go", message: "Your membership will end at the close of this billing period.", rationale: "Switching reason; respect the decision and keep the door open." }),
};

export async function clearSample() {
  const db = await getDb();
  await db.delete(schema.events).where(like(schema.events.id, `${SAMPLE_PREFIX}%`));
  for (const t of [schema.offers, schema.outbox] as const) await db.delete(t).where(like(t.subscriptionId, `${SAMPLE_PREFIX}%`));
  await db.delete(schema.subscribers).where(like(schema.subscribers.id, `${SAMPLE_PREFIX}%`));
}

export async function seedSample({ members = 240, seed = 7 } = {}) {
  await clearSample();
  const db = await getDb();
  const r = rng(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const now = Date.now();
  const subs: (typeof schema.subscribers.$inferInsert)[] = [];
  const offs: (typeof schema.offers.$inferInsert)[] = [];
  const evts: (typeof schema.events.$inferInsert)[] = [];
  let ev = 0;
  const event = (type: string, subId: string, at: number, note: string | null, resource: Record<string, unknown> = {}) => {
    const id = `${SAMPLE_PREFIX}WH-${(++ev).toString().padStart(5, "0")}`;
    evts.push({ id, type, resourceId: subId, summary: null, verification: "SAMPLE", origin: "local", note, receivedAt: new Date(at),
      payload: { id, event_type: type, create_time: new Date(at).toISOString(), resource: { id: subId, ...resource } } });
  };

  for (let i = 1; i <= members; i++) {
    const id = `${SAMPLE_PREFIX}${i.toString().padStart(4, "0")}`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const lite = r() < 0.24;
    let price = lite ? 15 : 29;
    const tenureDays = Math.floor(20 + Math.pow(r(), 0.8) * 720);
    const start = now - tenureDays * DAY;
    const anchor = start % (30 * DAY);
    let status = "ACTIVE", risk = "healthy", riskReason: string | null = null, failed = 0;
    let pausedUntil: Date | null = null, graceUntil: Date | null = null;
    // One retention case for ~48% of members, skewed toward the last few weeks as the merchant adopts Second Chance.
    let caseAt: number | null = null;
    if (r() < 0.48) {
      const back = Math.floor(Math.pow(r(), 1.35) * 178) + 0.2;
      caseAt = now - back * DAY - Math.floor(r() * DAY);
      if (caseAt < start + 25 * DAY) caseAt = null;
    }
    // Monthly payment history (up to 12 bills); a failed bill precedes payment-failure cases.
    const trig = caseAt ? (() => { const x = r(); return x < 0.5 ? "merchant_cancel" : x < 0.8 ? "payment_failed" : x < 0.88 ? "suspended" : "paypal_cancelled"; })() : null;
    let lastPay: number | null = null;
    for (let m = 12; m >= 0; m--) {
      const t = now - m * 30 * DAY - anchor;
      if (t < start || t > now) continue;
      if (caseAt && t > caseAt + 2 * DAY && (trig === "paypal_cancelled" || trig === "suspended")) break;
      const failThis = (caseAt && trig === "payment_failed" && Math.abs(t - caseAt) < 15 * DAY) || r() < 0.02;
      if (failThis) event("BILLING.SUBSCRIPTION.PAYMENT.FAILED", id, t, null, { status: "ACTIVE", failed_payments_count: 1 });
      else { event("PAYMENT.SALE.COMPLETED", id, t, null, { billing_agreement_id: id, amount: { total: price.toFixed(2), currency: "USD" }, state: "completed" }); lastPay = t; }
    }

    if (caseAt && trig) {
      const reason = trig === "merchant_cancel" ? pick(REASONS) : null;
      const kind: Kind = trig === "merchant_cancel" ? pick(REASON_KIND[reason!]) : trig === "payment_failed" ? "recovery" : trig === "suspended" ? "comeback" : "winback";
      const ageDays = (now - caseAt) / DAY;
      const open = ageDays < 2.5 && kind !== "let_go";
      const saved = !open && r() < SAVE_RATE[kind];
      const oStatus = open ? (["discount", "downgrade", "winback"].includes(kind) && r() < 0.6 ? "pending_consent" : "proposed") : kind === "let_go" ? "lost" : saved ? "saved" : r() < 0.55 ? "declined" : "lost";
      const resolvedAt = open ? null : caseAt + (0.05 + r() * (kind === "winback" ? 6 : 1.5)) * DAY;
      const newPrice = kind === "discount" ? price / 2 : kind === "downgrade" ? 15 : kind === "winback" ? 0 : null;
      const mrrSaved = oStatus !== "saved" ? 0 : kind === "discount" ? price / 2 : kind === "downgrade" ? 15 : kind === "winback" ? 29 : price;
      const c = COPY[kind](price);
      const oid = `${SAMPLE_PREFIX}OF-${i.toString().padStart(4, "0")}`;
      offs.push({ id: oid, subscriptionId: id, trigger: trig, kind, ...c, engine: r() < 0.85 ? "Nebius · Qwen3-30B" : "Rules", reason, priceMonthly: newPrice,
        months: kind === "discount" ? 3 : kind === "pause" ? 2 : kind === "winback" ? 1 : null, status: oStatus, mrrSaved, createdAt: new Date(caseAt), resolvedAt: resolvedAt ? new Date(resolvedAt) : null });
      const caseType = { payment_failed: null, suspended: "BILLING.SUBSCRIPTION.SUSPENDED", paypal_cancelled: "BILLING.SUBSCRIPTION.CANCELLED", merchant_cancel: null }[trig];
      if (caseType) event(caseType, id, caseAt - 60_000, `${kind === "comeback" ? "Come-back" : "Win-back"} offer prepared`, { status: trig === "suspended" ? "SUSPENDED" : "CANCELLED" });
      if (oStatus === "saved" && resolvedAt) {
        const t = resolvedAt;
        if (kind === "pause") { event("BILLING.SUBSCRIPTION.SUSPENDED", id, t, "Expected: paused by Second Chance", { status: "SUSPENDED" }); }
        else if (kind === "discount" || kind === "downgrade") event("BILLING.SUBSCRIPTION.UPDATED", id, t, `Buyer approved the ${kind === "discount" ? "discount" : "switch to Lite"}`, { status: "ACTIVE" });
        else if (kind === "recovery") event("PAYMENT.SALE.COMPLETED", id, t, "Payment recovered", { billing_agreement_id: id, amount: { total: price.toFixed(2), currency: "USD" }, state: "completed" });
        else if (kind === "comeback") event("BILLING.SUBSCRIPTION.ACTIVATED", id, t, "Member came back", { status: "ACTIVE" });
        else if (kind === "winback") event("BILLING.SUBSCRIPTION.ACTIVATED", id, t, "Win-back subscription activated", { status: "ACTIVE" });
      }
      // Current state follows the outcome.
      if (open) { risk = oStatus === "pending_consent" ? "pending" : "at_risk"; riskReason = trig === "merchant_cancel" ? `cancel intent: ${reason}` : trig === "payment_failed" ? "payment failed" : trig === "suspended" ? "suspended" : "cancelled in PayPal"; if (trig === "payment_failed") { failed = 1; graceUntil = new Date(caseAt + 7 * DAY); } if (trig === "suspended") status = "SUSPENDED"; if (trig === "paypal_cancelled") status = "CANCELLED"; }
      else if (oStatus === "saved") {
        risk = "saved"; riskReason = kind === "pause" ? "paused" : kind === "recovery" ? "payment recovered" : kind === "comeback" ? "came back" : kind === "winback" ? "won back" : `accepted ${kind}`;
        if (kind === "downgrade") price = 15;
        if (kind === "pause" && resolvedAt && resolvedAt + 60 * DAY > now) { status = "SUSPENDED"; pausedUntil = new Date(resolvedAt + 60 * DAY); }
      } else { risk = "lost"; riskReason = reason ?? (trig === "payment_failed" ? "payment failed" : "cancelled"); status = "CANCELLED"; }
    }
    subs.push({
      id, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, planId: lite || price === 15 ? cfg.plans.lite : cfg.plans.pro, planName: price === 15 ? "Brightside Lite" : "Brightside Pro",
      priceMonthly: price, status, startTime: new Date(start), lastPaymentAt: lastPay ? new Date(lastPay) : null,
      nextBillingAt: status === "CANCELLED" ? null : new Date((lastPay ?? now) + 30 * DAY), failedPayments: failed, source: "sample", risk, riskReason,
      graceUntil, pausedUntil, createdAt: new Date(start), updatedAt: new Date(caseAt ?? start),
    });
  }
  const chunk = async <T,>(rows: T[], f: (b: T[]) => Promise<unknown>) => { for (let i = 0; i < rows.length; i += 250) await f(rows.slice(i, i + 250)); };
  await chunk(subs, (b) => db.insert(schema.subscribers).values(b));
  await chunk(offs, (b) => db.insert(schema.offers).values(b));
  await chunk(evts, (b) => db.insert(schema.events).values(b));
  return { members: subs.length, offers: offs.length, events: evts.length };
}
