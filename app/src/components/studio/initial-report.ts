// The built-in Studio report: three pages (Retention, Members, PayPal webhooks). Field ids such as
// 'offers.mrrSaved' refer to the sources in ./data.ts; 'save-flow-sankey' is our custom widget.
import type { AgReportState, AgWidgetLayoutState } from "ag-studio";

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string, subtitle?: string) => ({ title: { enabled: true, text }, ...(subtitle && { subtitle: { enabled: true, text: subtitle } }) });
const sum = (id: string) => ({ id, aggregation: "sum" as const });
const countd = (id: string) => ({ id, aggregation: "countd" as const });
const FONT = "Geist, ui-sans-serif, system-ui, sans-serif";
const type = (fontSize: number, fontWeight: "normal" | "bold" = "normal") => ({ fontFamily: FONT, fontSize, fontWeight, fontStyle: "normal" as const });
const kpi = (text: string, value: { id: string; aggregation?: "sum" | "countd" | "avg" }, sparklineX?: string) => ({
  type: "value" as const,
  dataMapping: { value: [value], ...(sparklineX && { sparklineX: [{ id: sparklineX }] }) },
  format: { title: { enabled: true, text, typography: type(13, "bold") }, caption: { enabled: true, text: "", typography: type(0) }, style: { typography: type(24, "bold") } },
});
const legend = { style: { theme: { common: { legend: { enabled: true, position: "bottom" } } } } };

export const studioReport: AgReportState = {
  selectedPageId: "Retention",
  pages: [
    {
      id: "Retention",
      widgets: {
        "offer-date": { type: "date-filter", dataMapping: { value: [{ id: "offers.createdDate" }] }, format: { style: { filterType: "relative" } } },
        "kpi-mrr": kpi("MRR saved", sum("offers.mrrSaved"), "calendar::week"),
        "kpi-saves": kpi("Members saved", sum("offers.saved"), "calendar::week"),
        "kpi-offers": kpi("Offers made", sum("offers.one"), "calendar::week"),
        "save-rate": kpi("Save rate", { id: "saveRate" }, "calendar::week"),
        "save-flow": {
          type: "save-flow-sankey",
          dataMapping: { from: [{ id: "offers.trigger" }], to: [{ id: "offers.kind" }, { id: "offers.outcome" }], value: [sum("offers.one")] },
          format: title("Save flow: trigger → offer → outcome", "Custom AG Studio widget · AG Charts Sankey · click a node to cross-filter"),
        },
        "mrr-by-month": {
          type: "combo-chart-stacked-column-line",
          dataMapping: { categoryKey: [{ id: "calendar::month", showEmpty: false }], valueKey: [sum("offers.mrrSaved")], legendKey: [{ id: "offers.kind" }], secondaryValueKey: [{ id: "saveRate" }] },
          format: { ...title("MRR saved by month and offer, with save rate"), ...legend },
        },
        funnel: {
          type: "funnel-chart", dataMapping: { categoryKey: [{ id: "funnel.stage" }], valueKey: [sum("funnel.count")] },
          format: title("Save funnel"),
        },
        "offer-pivot": {
          type: "pivot-grid",
          dataMapping: { rows: [{ id: "offers.trigger" }, { id: "offers.kind" }], columns: [{ id: "offers.outcome" }], values: [sum("offers.one")] },
          format: { ...title("Offers by trigger and offer × outcome", "Expand a trigger to see each offer"), style: { totalColumns: true, totalColumnsPlacement: "before", grandTotalRow: { enabled: true } } },
        },
        "by-engine": {
          type: "donut-chart", dataMapping: { categoryKey: [{ id: "offers.kind" }], valueKey: [sum("offers.mrrSaved")] },
          format: { ...title("What saved them (MRR)"), style: { custom: { totalLabel: { enabled: true } } } },
        },
      },
      widgetLayout: {
        "kpi-mrr": at(0, 0, 4, 7), "kpi-saves": at(4, 0, 4, 7), "save-rate": at(8, 0, 4, 7), "kpi-offers": at(12, 0, 4, 7), "offer-date": at(16, 0, 8, 7),
        "save-flow": at(0, 7, 16, 21), funnel: at(16, 7, 8, 21),
        "mrr-by-month": at(0, 28, 15, 18), "by-engine": at(15, 28, 9, 18),
        "offer-pivot": at(0, 46, 24, 20),
      },
    },
    {
      id: "Members",
      widgets: {
        plan: { type: "button-filter", dataMapping: { value: [{ id: "subscribers.plan" }] }, format: { ...title("Plan"), style: { selection: { type: "multiple" }, dimensions: { height: 28, minWidth: 48 } } } },
        "kpi-members": kpi("Members", sum("subscribers.one")),
        "kpi-mrr": kpi("Active MRR", sum("subscribers.mrr")),
        "kpi-risk": kpi("MRR at risk now", sum("subscribers.atRiskMrr")),
        "state-treemap": {
          type: "treemap-chart", dataMapping: { categoryKey: [{ id: "subscribers.risk" }, { id: "subscribers.plan" }], valueKey: [sum("subscribers.price")] },
          format: title("Monthly revenue by retention state and plan"),
        },
        "tenure": {
          type: "bar-chart-stacked", dataMapping: { categoryKey: [{ id: "subscribers.latestOffer" }], valueKey: [sum("subscribers.one")], legendKey: [{ id: "subscribers.risk" }] },
          format: { ...title("Members by latest offer and where they ended up"), ...legend },
        },
        members: {
          type: "grid",
          dataMapping: { cols: [{ id: "subscribers.name" }, { id: "subscribers.plan" }, { id: "subscribers.risk" }, { id: "subscribers.latestOffer" }, { id: "subscribers.status" }, { id: "subscribers.tenureMonths" }, sum("subscribers.price"), sum("subscribers.paid12m"), sum("subscribers.mrrSaved")] },
          sort: [{ field: sum("subscribers.price"), direction: "desc" }],
          format: title("Members, highest value first"),
        },
      },
      widgetLayout: {
        "kpi-members": at(0, 0, 5, 7), "kpi-mrr": at(5, 0, 5, 7), "kpi-risk": at(10, 0, 5, 7), plan: at(15, 0, 9, 7),
        "state-treemap": at(0, 7, 12, 18), tenure: at(12, 7, 12, 18), members: at(0, 25, 24, 24),
      },
    },
    {
      id: "PayPal webhooks",
      widgets: {
        "kpi-events": kpi("Webhook events", sum("events.one"), "calendar::week"),
        "kpi-paid": kpi("Payments received", sum("events.amount"), "calendar::week"),
        "kpi-subs": kpi("Subscriptions seen", countd("events.subscriptionId")),
        "event-mix": {
          type: "column-chart-stacked", dataMapping: { categoryKey: [{ id: "calendar::month" }], valueKey: [sum("events.one")], legendKey: [{ id: "events.type" }] },
          format: { ...title("Webhook events by month"), ...legend },
        },
        verification: { type: "donut-chart", dataMapping: { categoryKey: [{ id: "events.verification" }], valueKey: [sum("events.one")] }, format: title("Signature verification") },
      },
      widgetLayout: {
        "kpi-events": at(0, 0, 8, 7), "kpi-paid": at(8, 0, 8, 7), "kpi-subs": at(16, 0, 8, 7),
        "event-mix": at(0, 7, 16, 20), verification: at(16, 7, 8, 20),
      },
    },
  ],
} as AgReportState;
