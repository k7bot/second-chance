"use client";
import "./ag-setup";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AgCharts } from "ag-charts-react";
import { AgGridReact } from "ag-grid-react";
import type { AgChartOptions } from "ag-charts-enterprise";
import type { ColDef } from "ag-grid-community";
import { ArrowRight, ArrowUpRight, Clock, HeartHandshake, ShieldAlert, TrendingUp } from "lucide-react";
import { chartTheme, gridTheme, KIND_COLORS } from "./ag-setup";
import { useDashboard } from "./data";
import { EventsGrid } from "./events-grid";
import { LiveBadge } from "./toolbar";
import { OfferKindCell, RiskCell, SubscriberCell } from "./renderers";
import { fmtMoney, moneyFmt, relFmt } from "./format";
import type { SubRow } from "@/lib/grid-data";
import { useLiveRows } from "./live";

const KINDS = ["Pause", "Discount", "Downgrade to Lite", "Payment recovery", "Come-back", "Win-back"];
const wk = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function Overview() {
  const { data, lastChange } = useDashboard();
  const k = data?.kpis;
  const delta = k && k.prev30 ? (k.last30 - k.prev30) / k.prev30 : null;

  const timeOptions = useMemo<AgChartOptions>(() => ({
    theme: chartTheme as any,
    data: (data?.series ?? []).map((s: any) => ({ ...Object.fromEntries(KINDS.map((k) => [k, 0])), ...s, label: wk(s.week) })),
    series: [
      ...KINDS.map((kind) => ({ type: "bar" as const, xKey: "label", yKey: kind, yName: kind, stacked: true, fill: KIND_COLORS[kind], cornerRadius: 3,
        tooltip: { renderer: (p: any) => ({ heading: `Week of ${p.datum.label}`, title: kind, data: [{ label: "MRR saved", value: fmtMoney(p.datum[kind] ?? 0, true) }] }) } })),
      { type: "line" as const, xKey: "label", yKey: "cumulative", yName: "Cumulative MRR saved", yKeyAxis: "cum", stroke: "#0f172a", strokeWidth: 2.2, marker: { enabled: false },
        interpolation: { type: "smooth" }, tooltip: { renderer: (p: any) => ({ heading: `Week of ${p.datum.label}`, title: "Cumulative", data: [{ label: "MRR saved", value: fmtMoney(p.datum.cumulative, true) }] }) } },
    ],
    axes: {
      x: { type: "category", position: "bottom", label: { autoRotate: false, avoidCollisions: true } },
      y: { type: "number", position: "left", label: { formatter: (p: any) => `$${p.value}` }, title: { enabled: false } },
      cum: { type: "number", position: "right", label: { formatter: (p: any) => `$${p.value}` }, gridLine: { enabled: false } },
    },
    legend: { position: "bottom", spacing: 16 },
    navigator: { enabled: false },
    zoom: { enabled: true, anchorPointX: "pointer", enableScrolling: true },
    animation: { enabled: true },
  } as AgChartOptions), [data?.series]);

  const donutOptions = useMemo<AgChartOptions>(() => {
    const by = new Map<string, number>();
    for (const o of data?.offers ?? []) if (o.status === "saved") by.set(o.kind, (by.get(o.kind) ?? 0) + o.mrrSaved);
    const rows = [...by.entries()].map(([kind, mrr]) => ({ kind, mrr })).sort((a, b) => b.mrr - a.mrr);
    const total = rows.reduce((a, r) => a + r.mrr, 0);
    return {
      theme: chartTheme as any,
      data: rows,
      series: [{ type: "donut", angleKey: "mrr", legendItemKey: "kind", innerRadiusRatio: 0.72, fills: rows.map((r) => KIND_COLORS[r.kind] ?? "#94a3b8"), strokeWidth: 2, strokes: ["#fff"],
        cornerRadius: 3, sectorSpacing: 2,
        innerLabels: [{ text: fmtMoney(total), fontSize: 24, fontWeight: 650, color: "#0f172a" }, { text: "MRR kept", fontSize: 12, color: "#64748b", spacing: 4 }],
        tooltip: { renderer: (p: any) => ({ title: p.datum.kind, data: [{ label: "MRR saved", value: fmtMoney(p.datum.mrr, true) }, { label: "Share", value: `${Math.round((p.datum.mrr / (total || 1)) * 100)}%` }] }) } }],
      legend: { position: "bottom", spacing: 14 },
      animation: { enabled: true },
    } as AgChartOptions;
  }, [data?.offers]);

  return (
    <div className="rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Brightside Yoga · last 26 weeks</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Retention overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge at={lastChange} />
          <Link href="/dashboard/demo" className="btn-ghost">Demo console</Link>
          <Link href="/store" className="btn-primary">Open store <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} label="MRR saved" value={k ? fmtMoney(k.mrrSaved) : "—"} sub={k ? `${fmtMoney(k.annualised)} annualised${delta !== null ? ` · ${delta >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(delta * 100))}% vs prior 30d` : ""}` : ""} accent />
        <Kpi icon={HeartHandshake} label="Subscribers saved" value={k ? String(k.saves) : "—"} sub={k?.saveRate == null ? "No decisions yet" : `${Math.round(k.saveRate * 100)}% save rate`} />
        <Kpi icon={ShieldAlert} label="At risk now" value={k ? String(k.atRisk) : "—"} sub={k ? `${fmtMoney(k.atRiskMrr)} MRR at stake` : ""} />
        <Kpi icon={Clock} label="Awaiting PayPal consent" value={k ? String(k.pending) : "—"} sub={k ? `${k.members} members · ${fmtMoney(k.activeMrr)} active MRR` : ""} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Revenue saved over time</h2>
            <span className="text-xs text-muted">weekly MRR kept, by offer · AG Charts</span>
          </div>
          <div className="mt-2 h-[310px]">{data && <AgCharts options={timeOptions} style={{ height: "100%" }} />}</div>
        </div>
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">What saved them</h2>
            <Link href="/dashboard/offers" className="inline-flex items-center gap-1 text-xs font-medium text-brand">Pivot it <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-2 h-[310px]">{data && <AgCharts options={donutOptions} style={{ height: "100%" }} />}</div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="font-semibold">Needs attention</h2>
            <Link href="/dashboard/subscribers" className="inline-flex items-center gap-1 text-xs font-medium text-brand">Retention queue <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <AttentionGrid />
        </div>
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="font-semibold">Live PayPal webhooks</h2>
            <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-xs font-medium text-brand">All events <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-2"><EventsGrid compact height="330px" /></div>
        </div>
      </section>
    </div>
  );
}

function AttentionGrid() {
  const { data } = useDashboard();
  const [api, setApi] = useState<any>(null);
  const rows = useMemo(() => data?.subs.filter((s) => s.risk === "at_risk" || s.risk === "pending").sort((a, b) => b.price - a.price), [data]);
  useLiveRows(api, rows);
  const cols = useMemo<ColDef<SubRow>[]>(() => [
    { field: "name", headerName: "Subscriber", cellRenderer: SubscriberCell, flex: 1.3, minWidth: 190 },
    { field: "risk", headerName: "State", cellRenderer: RiskCell, width: 140 },
    { field: "offerKind", headerName: "Offer", cellRenderer: OfferKindCell, flex: 1, minWidth: 170 },
    { field: "price", headerName: "At stake", width: 105, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "updatedAt", headerName: "Since", flex: 0.6, minWidth: 90, valueFormatter: relFmt },
  ], []);
  return (
    <div className="mt-2" style={{ height: 330 }}>
      <AgGridReact<SubRow> theme={gridTheme} columnDefs={cols} getRowId={(p) => p.data.id} onGridReady={(e) => setApi(e.api)} loading={!data}
        defaultColDef={{ sortable: true, resizable: true, enableCellChangeFlash: true }} rowHeight={46} headerHeight={36}
        overlayNoRowsTemplate='<span class="text-sm text-slate-500">Nobody at risk right now.</span>' />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#115e59] p-5 text-white shadow-lg shadow-teal-900/10" : "card p-5"}>
      <div className="flex items-center justify-between">
        <span className={accent ? "text-sm font-medium text-teal-100" : "text-sm font-medium text-muted"}>{label}</span>
        <Icon className={accent ? "h-4 w-4 text-teal-200" : "h-4 w-4 text-muted"} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={accent ? "mt-1 text-xs text-teal-100" : "mt-1 text-xs text-muted"}>{sub}</p>
    </div>
  );
}
