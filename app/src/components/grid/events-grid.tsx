"use client";
import "./ag-setup";
import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { gridTheme } from "./ag-setup";
import { useDashboard } from "./data";
import { useLiveRows } from "./live";
import { ExportButtons, LiveBadge, QuickFilter, ViewChips, type View } from "./toolbar";
import { EventTypeCell, VerificationCell, eventLabel } from "./renderers";
import { dateTimeFmt, isoDateComparator, moneyFmt, relFmt } from "./format";
import type { EventGridRow } from "@/lib/grid-data";

function PayloadDetail(p: CustomCellRendererProps<EventGridRow>) {
  const e = p.data!;
  return (
    <div className="grid h-full gap-4 whitespace-normal leading-normal bg-stone-50/70 px-6 py-4 lg:grid-cols-[1fr_2fr]">
      <div className="card space-y-2 p-4 text-sm">
        <p className="eyebrow">Webhook</p>
        <p className="font-semibold">{eventLabel(e.type)}</p>
        <p className="font-mono text-[11px] text-muted">{e.id}</p>
        {e.note && <p className="text-ink-2">→ {e.note}</p>}
        <p className="text-xs text-muted">{e.verification === "SUCCESS" ? "PayPal verify-webhook-signature returned SUCCESS before this event was processed." : e.verification === "SAMPLE" ? "Synthetic sample history (never sent by PayPal)." : `Verification: ${e.verification}`}</p>
      </div>
      <pre className="card min-h-0 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-ink-2">{JSON.stringify(e.payload, null, 2)}</pre>
    </div>
  );
}

const OTHER = ["aggregation", "columnGroup", "columnOrder", "columnPinning", "columnSizing", "columnVisibility", "columnHeaderName", "focusedCell", "pagination", "rowPinning", "pivot", "cellSelection", "rowSelection", "scroll", "sideBar", "showValuesAs", "quickFilter"] as any[];
const v = (groupColIds: string[], filterModel: any = {}) => (api: GridApi) => api.setState({ rowGroup: { groupColIds }, filter: { filterModel }, sort: { sortModel: [{ colId: "receivedAt", sort: "desc" }] } }, OTHER);
const VIEWS: View[] = [
  { id: "all", label: "All events", apply: v([]) },
  { id: "live", label: "Live PayPal only", apply: v([], { verification: { filterType: "set", values: ["SUCCESS", "LOCAL_REPLAY"] } }) },
  { id: "type", label: "By event type", apply: v(["type"]) },
  { id: "churn", label: "Churn signals", apply: v([], { type: { filterType: "set", values: ["BILLING.SUBSCRIPTION.PAYMENT.FAILED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.CANCELLED"] } }) },
];

export function EventsGrid({ compact = false, height = "calc(100vh - 230px)" }: { compact?: boolean; height?: string }) {
  const { data, lastChange } = useDashboard();
  const [api, setApi] = useState<GridApi<EventGridRow> | null>(null);
  const [active, setActive] = useState<string | null>("all");
  const rows = useMemo(() => (compact ? data?.events.slice(0, 60) : data?.events), [data, compact]);
  useLiveRows(api, rows);

  const columnDefs = useMemo<ColDef<EventGridRow>[]>(() => [
    { field: "type", headerName: "Event", minWidth: 250, flex: 1.3, cellRenderer: "agGroupCellRenderer", cellRendererParams: { innerRenderer: EventTypeCell, suppressCount: true }, enableRowGroup: true, filter: "agSetColumnFilter", valueFormatter: (p) => eventLabel(p.value), filterParams: { valueFormatter: (p: any) => eventLabel(p.value) } },
    { field: "subscriber", headerName: "Subscriber", width: 170, enableRowGroup: true, hide: compact },
    { field: "resourceId", headerName: "Subscription", width: 170, cellClass: "font-mono text-[11.5px] text-muted", hide: compact },
    { field: "verification", headerName: "Signature", width: 160, cellRenderer: VerificationCell, enableRowGroup: true, filter: "agSetColumnFilter" },
    { field: "note", headerName: "What Second Chance did", flex: 1.4, minWidth: 220, tooltipField: "note", valueFormatter: (p) => (p.value ? `→ ${p.value}` : "") },
    { field: "amount", headerName: "Amount", width: 110, type: "numericColumn", valueFormatter: moneyFmt, aggFunc: "sum", hide: compact },
    { field: "receivedAt", headerName: "Received", width: compact ? 110 : 170, sort: "desc", valueFormatter: compact ? relFmt : dateTimeFmt, filter: "agDateColumnFilter", filterParams: { comparator: isoDateComparator } },
    { field: "origin", hide: true, enableRowGroup: true },
    { field: "id", headerName: "Event ID", hide: true },
  ], [compact]);

  const onGridReady = useCallback((e: GridReadyEvent<EventGridRow>) => setApi(e.api), []);
  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <ViewChips api={api} views={VIEWS} active={active} onChange={setActive} />
          <div className="ml-auto flex items-center gap-2">
            <LiveBadge at={lastChange} />
            <QuickFilter api={api} placeholder="Search events, IDs, notes…" />
            <ExportButtons api={api} name="events" />
          </div>
        </div>
      )}
      <div className={compact ? "overflow-hidden" : "card overflow-hidden"} style={{ height }}>
        <AgGridReact<EventGridRow>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: true, enableCellChangeFlash: true }}
          getRowId={(p) => p.data.id}
          onGridReady={onGridReady}
          loading={!data}
          masterDetail={!compact}
          detailCellRenderer={PayloadDetail}
          detailRowHeight={300}
          rowGroupPanelShow={compact ? "never" : "onlyWhenGrouping"}
          sideBar={compact ? undefined : { toolPanels: ["columns", "filters"] }}
          statusBar={compact ? undefined : { statusPanels: [{ statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" }, { statusPanel: "agAggregationComponent" }] }}
          cellSelection={!compact}
          suppressAggFuncInHeader
          animateRows
          rowHeight={compact ? 46 : 50}
          headerHeight={compact ? 36 : 42}
          popupParent={typeof document !== "undefined" ? document.body : undefined}
        />
      </div>
    </div>
  );
}
