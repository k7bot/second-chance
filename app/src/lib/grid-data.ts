import { desc } from "drizzle-orm";
import { getDb, schema } from "./db";
import { listSubs, OFFER_LABEL, TRIGGER_LABEL } from "./queries";

const DAY = 86_400_000;
const MONTH_KEYS = (now: number) => Array.from({ length: 12 }, (_, i) => {
  const d = new Date(now); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (11 - i));
  return d.toISOString().slice(0, 7);
});

export type PaymentPoint = { month: string; amount: number; failed: boolean };
export type SubRow = Awaited<ReturnType<typeof gridData>>["subs"][number];
export type OfferRow = Awaited<ReturnType<typeof gridData>>["offers"][number];
export type EventGridRow = Awaited<ReturnType<typeof gridData>>["events"][number];

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
export const sourceLabel = (id: string, source: string) =>
  id.startsWith("SAMPLE-") ? "Sample history" : id.startsWith("DEMO-") ? "Practice member" : source === "simulator" ? "Webhook simulator" : source === "store" ? "Store checkout" : "PayPal sandbox";

/** Everything the AG Grid dashboard needs, flattened into grid-friendly rows (one call, polled by the client). */
export async function gridData() {
  const db = await getDb();
  const [subs, offs, evts] = await Promise.all([
    listSubs(),
    db.select().from(schema.offers).orderBy(desc(schema.offers.createdAt)),
    db.select().from(schema.events).orderBy(desc(schema.events.receivedAt)),
  ]);
  const now = Date.now();
  const months = MONTH_KEYS(now);
  const byId = new Map(subs.map((s) => [s.id, s] as const));

  // Payment history per subscriber, bucketed by month (failed bills shown as a red bar).
  const pay = new Map<string, Map<string, PaymentPoint>>();
  for (const e of evts) {
    const ok = e.type === "PAYMENT.SALE.COMPLETED", bad = e.type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED";
    if ((!ok && !bad) || !e.resourceId) continue;
    const m = new Date(e.receivedAt).toISOString().slice(0, 7);
    if (!months.includes(m)) continue;
    const sub = byId.get(e.resourceId);
    const amt = Number((e.payload as any)?.resource?.amount?.total ?? (e.payload as any)?.resource?.amount?.value ?? sub?.priceMonthly ?? 0);
    const per = pay.get(e.resourceId) ?? new Map();
    const cur = per.get(m);
    if (ok) per.set(m, { month: m, amount: (cur && !cur.failed ? cur.amount : 0) + amt, failed: false });
    else if (!cur) per.set(m, { month: m, amount: sub?.priceMonthly ?? 0, failed: true });
    pay.set(e.resourceId, per);
  }

  const offersBySub = new Map<string, typeof offs>();
  for (const o of offs) offersBySub.set(o.subscriptionId, [...(offersBySub.get(o.subscriptionId) ?? []), o]);

  const subRows = subs.map((s) => {
    const os = offersBySub.get(s.id) ?? [];
    const latest = os[0];
    const per = pay.get(s.id);
    const payments: PaymentPoint[] = months.map((m) => per?.get(m) ?? { month: m, amount: 0, failed: false });
    const paid = [...(per?.values() ?? [])].filter((p) => !p.failed).reduce((a, p) => a + p.amount, 0);
    return {
      id: s.id, name: s.name || s.email || s.id, email: s.email, plan: s.planName || "Unknown plan", price: s.priceMonthly,
      status: s.status, risk: s.risk, riskReason: s.riskReason, source: sourceLabel(s.id, s.source),
      tenureMonths: s.startTime ? Math.max(0, Math.round((now - new Date(s.startTime).getTime()) / (30.44 * DAY))) : null,
      startTime: iso(s.startTime), nextBillingAt: iso(s.nextBillingAt), lastPaymentAt: iso(s.lastPaymentAt), pausedUntil: iso(s.pausedUntil), graceUntil: iso(s.graceUntil),
      failedPayments: s.failedPayments, payments, paid12m: paid,
      offerKind: latest ? OFFER_LABEL[latest.kind] ?? latest.kind : null, offerTrigger: latest ? TRIGGER_LABEL[latest.trigger] ?? latest.trigger : null,
      offerStatus: latest?.status ?? null, offerEngine: latest?.engine ?? null, offers: os.length,
      mrr: ["ACTIVE"].includes(s.status) ? s.priceMonthly : 0,
      mrrSaved: os.filter((o) => o.status === "saved").reduce((a, o) => a + o.mrrSaved, 0),
      updatedAt: iso(s.updatedAt),
    };
  });

  const offerRows = offs.map((o) => {
    const s = byId.get(o.subscriptionId);
    const created = new Date(o.createdAt);
    return {
      id: o.id, subscriptionId: o.subscriptionId, name: s?.name || s?.email || o.subscriptionId, plan: s?.planName ?? "—",
      trigger: TRIGGER_LABEL[o.trigger] ?? o.trigger, kind: OFFER_LABEL[o.kind] ?? o.kind, status: o.status, engine: o.engine, reason: o.reason,
      headline: o.headline, message: o.message, rationale: o.rationale, priceMonthly: o.priceMonthly, months: o.months,
      mrrSaved: o.mrrSaved, arrSaved: o.mrrSaved * 12, saved: o.status === "saved" ? 1 : 0,
      decided: ["saved", "declined", "lost"].includes(o.status) ? 1 : 0,
      createdAt: created.toISOString(), month: created.toISOString().slice(0, 7), week: weekStart(created),
      resolvedAt: iso(o.resolvedAt), hoursToResolve: o.resolvedAt ? (new Date(o.resolvedAt).getTime() - created.getTime()) / 3_600_000 : null,
      source: s ? sourceLabel(s.id, s.source) : "—",
    };
  });

  const eventRows = evts.slice(0, 1500).map((e) => {
    const s = e.resourceId ? byId.get(e.resourceId) : undefined;
    return {
      id: e.id, type: e.type, resourceId: e.resourceId, subscriber: s?.name ?? null, verification: e.verification, origin: e.origin,
      note: e.note, summary: e.summary, receivedAt: new Date(e.receivedAt).toISOString(), payload: e.payload,
      amount: e.type === "PAYMENT.SALE.COMPLETED" ? Number((e.payload as any)?.resource?.amount?.total ?? 0) : null,
    };
  });

  // Weekly "revenue saved" series by offer kind (for the AG Charts time-series).
  const weeks = new Map<string, Record<string, number | string>>();
  for (let t = now - 26 * 7 * DAY; t <= now; t += 7 * DAY) weeks.set(weekStart(new Date(t)), { week: weekStart(new Date(t)) });
  for (const o of offerRows) {
    if (o.status !== "saved") continue;
    const w = weeks.get(o.week); if (!w) continue;
    w[o.kind] = ((w[o.kind] as number) ?? 0) + o.mrrSaved;
  }
  let cum = 0;
  const series = [...weeks.values()].sort((a, b) => String(a.week).localeCompare(String(b.week))).map((w) => {
    const total = Object.entries(w).filter(([k]) => k !== "week").reduce((a, [, v]) => a + (v as number), 0);
    cum += total;
    return { ...w, total, cumulative: cum, date: new Date(String(w.week)).getTime() };
  });

  const saved = offerRows.filter((o) => o.status === "saved");
  const decided = offerRows.filter((o) => o.decided);
  const mrrSaved = saved.reduce((a, o) => a + o.mrrSaved, 0);
  const last30 = saved.filter((o) => now - new Date(o.createdAt).getTime() < 30 * DAY).reduce((a, o) => a + o.mrrSaved, 0);
  const prev30 = saved.filter((o) => { const a = now - new Date(o.createdAt).getTime(); return a >= 30 * DAY && a < 60 * DAY; }).reduce((a, o) => a + o.mrrSaved, 0);
  const kpis = {
    mrrSaved, annualised: mrrSaved * 12, last30, prev30,
    saves: saved.length, saveRate: decided.length ? saved.length / decided.length : null,
    atRisk: subRows.filter((s) => s.risk === "at_risk" || s.risk === "pending").length,
    atRiskMrr: subRows.filter((s) => s.risk === "at_risk" || s.risk === "pending").reduce((a, s) => a + s.price, 0),
    pending: offerRows.filter((o) => o.status === "pending_consent").length,
    activeMrr: subRows.reduce((a, s) => a + s.mrr, 0), members: subRows.length,
  };
  return { subs: subRows, offers: offerRows, events: eventRows, series, kpis, generatedAt: new Date(now).toISOString() };
}

function weekStart(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
