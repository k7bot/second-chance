import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";

const { subscribers, events, offers, outbox } = schema;

export const OFFER_LABEL: Record<string, string> = {
  pause: "Pause", discount: "Discount", downgrade: "Downgrade to Lite", winback: "Win-back",
  recovery: "Payment recovery", comeback: "Come-back", let_go: "Let go",
};
export const TRIGGER_LABEL: Record<string, string> = {
  merchant_cancel: "Cancel on site", payment_failed: "Payment failed", suspended: "Suspended", paypal_cancelled: "Cancelled in PayPal",
};

export async function dashboardData() {
  const db = await getDb();
  const [subs, offs, evts] = await Promise.all([
    listSubs(),
    db.select().from(offers).orderBy(desc(offers.createdAt)),
    db.select().from(events).orderBy(desc(events.receivedAt)).limit(40),
  ]);
  const saved = offs.filter((o) => o.status === "saved");
  const byKind = new Map<string, { kind: string; mrr: number; count: number }>();
  for (const o of saved) {
    const k = byKind.get(o.kind) || { kind: o.kind, mrr: 0, count: 0 };
    k.mrr += o.mrrSaved; k.count += 1; byKind.set(o.kind, k);
  }
  const decided = offs.filter((o) => ["saved", "declined", "lost"].includes(o.status));
  const mrrSaved = saved.reduce((a, o) => a + o.mrrSaved, 0);
  const atRisk = subs.filter((s) => s.risk === "at_risk" || s.risk === "pending");
  const pendingMrr = offs.filter((o) => o.status === "pending_consent").reduce((a, o) => a + (o.priceMonthly ?? 0), 0);
  return {
    subs, offers: offs, events: evts,
    kpis: {
      mrrSaved,
      annualised: mrrSaved * 12,
      saveRate: decided.length ? saved.length / decided.length : null,
      saves: saved.length,
      atRisk: atRisk.length,
      pending: offs.filter((o) => o.status === "pending_consent").length,
      pendingMrr,
    },
    byKind: [...byKind.values()].sort((a, b) => b.mrr - a.mrr),
    atRisk,
    savedSubs: subs.filter((s) => s.risk === "saved"),
  };
}

export async function latestOfferBySub(): Promise<Map<string, typeof offers.$inferSelect>> {
  const db = await getDb();
  const all = await db.select().from(offers).orderBy(desc(offers.createdAt));
  const m = new Map();
  for (const o of all) if (!m.has(o.subscriptionId)) m.set(o.subscriptionId, o);
  return m;
}

export async function allEvents(limit = 200) {
  const db = await getDb();
  return db.select().from(events).orderBy(desc(events.receivedAt)).limit(limit);
}
export async function allOutbox() {
  const db = await getDb();
  return db.select().from(outbox).orderBy(desc(outbox.createdAt));
}
export async function offerById(id: string) {
  const db = await getDb();
  return (await db.select().from(offers).where(eq(offers.id, id)))[0];
}
export async function offersForSub(id: string) {
  const db = await getDb();
  return db.select().from(offers).where(eq(offers.subscriptionId, id)).orderBy(desc(offers.createdAt));
}
export async function subsByIds(ids: string[]) {
  const db = await getDb();
  return ids.length ? db.select().from(subscribers).where(inArray(subscribers.id, ids)) : [];
}
/** Hides win-back subscriptions that were offered but never approved (they're shown on the offer instead). */
const visible = (s: typeof subscribers.$inferSelect) => !(s.status === "APPROVAL_PENDING" && s.customId?.startsWith("winback:"));
export async function listSubs() {
  const db = await getDb();
  return (await db.select().from(subscribers).orderBy(desc(subscribers.updatedAt))).filter(visible);
}
