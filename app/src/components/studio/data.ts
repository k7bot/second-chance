// AG Studio data sources for Second Chance: subscribers, retention offers, PayPal webhook events and a
// save-funnel table, joined by subscription id and laid on a shared calendar. Built from the same
// /api/dashboard/data payload the AG Grid pages use, so every view agrees.
import type { AgDataSourcesDefinition, AgExpressionFieldDefinition, AgFieldDefinition, AgFormat, AgRelationDefinition } from "ag-studio";
import type { DashData } from "@/components/grid/data";

const CALENDAR_ID = "calendar";
type FieldSpec = [id: string, name: string, format: AgFormat, hide?: boolean];
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fields = (specs: FieldSpec[]): AgFieldDefinition[] =>
  specs.map(([id, name, format, hide]) => ({ id, name, format, ...(format === "currencyFormat" && { formatOptions: { format: USD } }), ...(hide && { hide }) }));
const manyToOne = (id: string, source: string, target: string): AgRelationDefinition => {
  const [st, sf] = source.split("."); const [tt, tf] = target.split(".");
  return { id, source: { tableId: st, fieldId: sf }, target: { tableId: tt, fieldId: tf }, type: "many-to-one" };
};
const onCalendar = (tableId: string, fieldId: string): AgRelationDefinition => ({
  id: `${tableId}-${fieldId}-calendar`, source: { tableId, fieldId }, target: { calendarId: CALENDAR_ID }, truncate: "day",
});
const sumOf = (id: string) => ({ id, aggregation: "sum" as const });
const ratio = (id: string, name: string, description: string, num: string, den: string): AgExpressionFieldDefinition => ({
  id, name, description, format: "percentageFormat", isMeasure: true, expression: { operator: "divide", inputs: [sumOf(num), sumOf(den)] },
});

export const RISK_LABEL: Record<string, string> = { healthy: "Healthy", at_risk: "At risk", pending: "Awaiting consent", saved: "Saved", lost: "Lost" };
export const STATUS_LABEL: Record<string, string> = { saved: "Saved", pending_consent: "Awaiting PayPal consent", proposed: "Offered", declined: "Declined", lost: "Lost" };
const OUTCOME: Record<string, string> = { saved: "Saved", pending_consent: "In progress", proposed: "In progress", declined: "Churned", lost: "Churned" };
const EVENT_LABEL = (t: string) => t.replace(/^BILLING\.SUBSCRIPTION\./, "Subscription ").replace("PAYMENT.SALE.COMPLETED", "Payment completed").replace(/\./g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function buildStudioData(d: DashData): AgDataSourcesDefinition {
  const subs = d.subs.map((s) => ({
    id: s.id, name: s.name, plan: s.plan, price: s.price, status: s.status, risk: RISK_LABEL[s.risk] ?? s.risk,
    riskReason: s.riskReason ?? "", source: s.source, tenureMonths: s.tenureMonths ?? 0, failedPayments: s.failedPayments,
    paid12m: s.paid12m, mrr: s.mrr, mrrSaved: s.mrrSaved, atRiskMrr: s.risk === "at_risk" || s.risk === "pending" ? s.price : 0,
    startDate: s.startTime?.slice(0, 10) ?? null, latestOffer: s.offerKind ?? "No offer yet", one: 1,
  }));
  const offers = d.offers.map((o) => ({
    id: o.id, subscriptionId: o.subscriptionId, trigger: o.trigger, kind: o.kind, status: STATUS_LABEL[o.status] ?? o.status,
    outcome: OUTCOME[o.status] ?? o.status, engine: /rule/i.test(o.engine ?? "") ? "Rules" : "AI-written", reason: o.reason ?? "",
    priceMonthly: o.priceMonthly, mrrSaved: o.mrrSaved, arrSaved: o.arrSaved, saved: o.saved, decided: o.decided, one: 1,
    hoursToResolve: o.hoursToResolve, createdAt: o.createdAt, createdDate: o.createdAt.slice(0, 10),
  }));
  const events = d.events.map((e) => ({
    id: e.id, type: EVENT_LABEL(e.type), subscriptionId: e.resourceId, verification: e.verification, origin: e.origin,
    amount: e.amount ?? 0, receivedAt: e.receivedAt, receivedDate: e.receivedAt.slice(0, 10), one: 1,
  }));
  const k = d.kpis;
  const funnel = [
    { stage: "Caught", count: offers.length },
    { stage: "Responded", count: d.offers.filter((o) => o.status !== "proposed").length },
    { stage: "Accepted", count: d.offers.filter((o) => o.status === "saved" || o.status === "pending_consent").length },
    { stage: "Saved", count: k.saves },
  ];
  // The calendar spans the offer history, so monthly charts have no empty leading months.
  const dates = offers.map((o) => o.createdDate).sort();
  const today = d.generatedAt.slice(0, 10);
  return {
    description:
      "Second Chance retention data for Brightside Yoga, a PayPal Subscriptions merchant. When a member tries to cancel, a PayPal payment fails, " +
      "or PayPal suspends/cancels a subscription, Second Chance makes a retention offer (pause, discount, downgrade, payment recovery, win-back). " +
      "A 'save' keeps the member's monthly recurring revenue (MRR, USD). Offers whose PayPal change needs the subscriber's approval sit in 'Awaiting PayPal consent'.",
    sources: [
      { id: "subscribers", description: "One row per PayPal subscription (member). MRR is monthly price for active members.", data: subs,
        fields: fields([
          ["id", "Subscription ID", "textFormat", true], ["name", "Member", "textFormat"], ["plan", "Plan", "textFormat"],
          ["price", "Monthly Price", "currencyFormat"], ["status", "PayPal Status", "textFormat"], ["risk", "Retention State", "textFormat"],
          ["riskReason", "Risk Reason", "textFormat"], ["source", "Data Source", "textFormat"], ["tenureMonths", "Tenure (months)", "integerFormat"],
          ["failedPayments", "Failed Payments", "integerFormat"], ["paid12m", "Paid Last 12m", "currencyFormat"], ["mrr", "Active MRR", "currencyFormat"],
          ["mrrSaved", "Member MRR Saved", "currencyFormat"], ["atRiskMrr", "MRR At Risk", "currencyFormat"], ["startDate", "Member Since", "dateFormat"],
          ["latestOffer", "Latest Offer", "textFormat"], ["one", "Members", "integerFormat", true],
        ]) },
      { id: "offers", description: "One row per retention offer. Saved=1 when it kept the member; Decided=1 once resolved (saved, declined or lost). MRR Saved is the monthly revenue kept.", data: offers,
        fields: fields([
          ["id", "Offer ID", "textFormat", true], ["subscriptionId", "Offer Subscription ID", "textFormat", true], ["trigger", "Trigger", "textFormat"],
          ["kind", "Offer", "textFormat"], ["status", "Offer Status", "textFormat"], ["outcome", "Outcome", "textFormat"], ["engine", "Written By", "textFormat"],
          ["reason", "Cancel Reason", "textFormat"], ["priceMonthly", "Offer Monthly Price", "currencyFormat"], ["mrrSaved", "MRR Saved", "currencyFormat"],
          ["arrSaved", "ARR Saved", "currencyFormat"], ["saved", "Saves", "integerFormat"], ["decided", "Decided Offers", "integerFormat"],
          ["one", "Offers", "integerFormat"], ["hoursToResolve", "Hours To Resolve", "decimalFormat"], ["createdAt", "Offered At", "dateTimeFormat", true],
          ["createdDate", "Offer Date", "dateFormat"],
        ]) },
      { id: "events", description: "PayPal webhook events received (signature-verified or sample history). Amount is set for completed payments.", data: events,
        fields: fields([
          ["id", "Event ID", "textFormat", true], ["type", "Event", "textFormat"], ["subscriptionId", "Event Subscription ID", "textFormat", true],
          ["verification", "Verification", "textFormat"], ["origin", "Origin", "textFormat"], ["amount", "Payment Amount", "currencyFormat"],
          ["receivedAt", "Received At", "dateTimeFormat", true], ["receivedDate", "Event Date", "dateFormat"], ["one", "Events", "integerFormat"],
        ]) },
      { id: "funnel", name: "Save Funnel", description: "Stages from at-risk moment to saved member.", data: funnel,
        fields: fields([["stage", "Stage", "textFormat"], ["count", "Members In Stage", "integerFormat"]]) },
    ],
    relationships: [
      manyToOne("offer-subscriber", "offers.subscriptionId", "subscribers.id"),
      manyToOne("event-subscriber", "events.subscriptionId", "subscribers.id"),
      onCalendar("offers", "createdDate"),
      onCalendar("events", "receivedDate"),
    ],
    calendars: [{ id: CALENDAR_ID, label: "Calendar", range: { from: { type: "date", value: dates[0] ?? today }, to: { type: "date", value: dates.at(-1) ?? today } }, fragments: ["year", "quarter", "month", "week", "day", "dayOfWeek"] }],
    expressions: [
      ratio("saveRate", "Save Rate", "Saves / decided offers.", "offers.saved", "offers.decided"),
    ],
  };
}
