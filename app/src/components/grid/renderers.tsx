"use client";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Avatar, Badge, OFFER_STATUS_LABEL, RISK_LABEL, offerStatusTone, riskTone, statusTone, type Tone } from "@/components/ui";
import { KIND_COLORS } from "./ag-setup";
import { AlertTriangle, CheckCircle2, CreditCard, PauseCircle, PlayCircle, PlusCircle, RefreshCw, XCircle, Sparkles, Cpu } from "lucide-react";

/** Cell renderers that reuse the dashboard's own Avatar and Badge components, so the grid looks native. */

export function SubscriberCell(p: CustomCellRendererProps) {
  if (!p.data) return <span className="font-semibold">{p.value}</span>;
  return (
    <span className="flex h-full items-center gap-2.5">
      <Avatar name={p.data.name} className="h-7 w-7 text-[10px]" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold text-ink">{p.data.name}</span>
        <span className="block truncate text-[11px] text-muted">{p.data.email ?? p.data.id}</span>
      </span>
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", SUSPENDED: "Suspended", CANCELLED: "Cancelled", EXPIRED: "Expired", APPROVAL_PENDING: "Approval pending", UNKNOWN: "Unknown" };
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;
export const riskLabel = (s: string) => RISK_LABEL[s] ?? s;
export const offerStatusLabel = (s: string) => OFFER_STATUS_LABEL[s] ?? s;

function pill(value: string | null | undefined, tone: Tone, label: string, dot = false) {
  if (!value) return <span className="text-muted">—</span>;
  return <Badge tone={tone} dot={dot} className="leading-4">{label}</Badge>;
}
export const StatusCell = (p: CustomCellRendererProps) => p.node.group ? <span>{p.valueFormatted ?? p.value}</span> : pill(p.value, statusTone(p.value), statusLabel(p.value));
export const RiskCell = (p: CustomCellRendererProps) => p.node.group ? <span>{p.valueFormatted ?? p.value}</span> : pill(p.value, riskTone(p.value), riskLabel(p.value), true);
export const OfferStatusCell = (p: CustomCellRendererProps) => p.node.group ? <span>{p.valueFormatted ?? p.value}</span> : pill(p.value, offerStatusTone(p.value), offerStatusLabel(p.value));

export function OfferKindCell(p: CustomCellRendererProps) {
  if (p.node?.group && !p.value) return null;
  if (!p.value) return <span className="text-muted">—</span>;
  const sub = p.data?.offerTrigger ?? p.data?.trigger;
  return (
    <span className="flex h-full items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLORS[p.value] ?? "#94a3b8" }} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-medium">{p.value}</span>
        {sub && !p.node.group && p.colDef?.field === "offerKind" && <span className="block truncate text-[11px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}

export function EngineCell(p: CustomCellRendererProps) {
  if (!p.value) return <span className="text-muted">—</span>;
  const ai = !/rules/i.test(p.value);
  return <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">{ai ? <Sparkles className="h-3.5 w-3.5 text-teal-600" /> : <Cpu className="h-3.5 w-3.5 text-slate-400" />}{p.value.replace(/^llm:/, "AI · ")}</span>;
}

export function SourceCell(p: CustomCellRendererProps) {
  if (!p.value) return null;
  const tone: Tone = p.value === "PayPal sandbox" || p.value === "Store checkout" ? "blue" : p.value === "Sample history" ? "slate" : "violet";
  return <Badge tone={tone} className="leading-4">{p.value}</Badge>;
}

export const EVENT_META: Record<string, { label: string; icon: any; tone: string }> = {
  "BILLING.SUBSCRIPTION.CREATED": { label: "Subscription created", icon: PlusCircle, tone: "text-sky-600 bg-sky-50" },
  "BILLING.SUBSCRIPTION.ACTIVATED": { label: "Subscription activated", icon: PlayCircle, tone: "text-emerald-600 bg-emerald-50" },
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": { label: "Subscription re-activated", icon: PlayCircle, tone: "text-emerald-600 bg-emerald-50" },
  "BILLING.SUBSCRIPTION.UPDATED": { label: "Subscription updated", icon: RefreshCw, tone: "text-violet-600 bg-violet-50" },
  "BILLING.SUBSCRIPTION.SUSPENDED": { label: "Subscription suspended", icon: PauseCircle, tone: "text-amber-600 bg-amber-50" },
  "BILLING.SUBSCRIPTION.CANCELLED": { label: "Cancelled in PayPal", icon: XCircle, tone: "text-rose-600 bg-rose-50" },
  "BILLING.SUBSCRIPTION.EXPIRED": { label: "Subscription expired", icon: XCircle, tone: "text-slate-600 bg-slate-100" },
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": { label: "Payment failed", icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
  "PAYMENT.SALE.COMPLETED": { label: "Payment received", icon: CreditCard, tone: "text-emerald-600 bg-emerald-50" },
};
export const eventLabel = (t: string) => EVENT_META[t]?.label ?? t;

export function EventTypeCell(p: CustomCellRendererProps) {
  if (p.node.group || !p.data) return <span>{eventLabel(p.value)}</span>;
  const m = EVENT_META[p.value] ?? { label: p.value, icon: CheckCircle2, tone: "text-slate-600 bg-slate-100" };
  const Icon = m.icon;
  return (
    <span className="flex h-full items-center gap-2.5">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.tone}`}><Icon className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold">{m.label}</span>
        <span className="block truncate font-mono text-[10.5px] text-muted">{p.value}</span>
      </span>
    </span>
  );
}

export function VerificationCell(p: CustomCellRendererProps) {
  if (!p.value || p.node.group) return <span>{p.value}</span>;
  if (p.value === "SUCCESS") return <Badge tone="green" className="leading-4">Signature verified</Badge>;
  if (p.value === "LOCAL_REPLAY") return <Badge tone="violet" className="leading-4">Local replay</Badge>;
  if (p.value === "SAMPLE") return <Badge tone="slate" className="leading-4">Sample history</Badge>;
  return <Badge tone="red" className="leading-4">{p.value}</Badge>;
}
