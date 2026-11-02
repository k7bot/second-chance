"use client";
import "./ag-setup";
import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GetContextMenuItems, GridApi, GridReadyEvent, GridStateKey, IRowNode } from "ag-grid-community";
import { gridTheme } from "./ag-setup";
import { useDashboard } from "./data";
import { useLiveRows } from "./live";
import { AskGrid, ExportButtons, LiveBadge, QuickFilter, ViewChips, type View } from "./toolbar";
import { EngineCell, OfferKindCell, OfferStatusCell, RiskCell, SourceCell, StatusCell, SubscriberCell, offerStatusLabel, riskLabel, statusLabel } from "./renderers";
import { SubscriberDetail } from "./subscriber-detail";
import { dateFmt, isoDateComparator, moneyFmt, relFmt } from "./format";
import type { SubRow } from "@/lib/grid-data";

const RISK_ORDER = ["at_risk", "pending", "saved", "healthy", "lost"];
const OTHER: GridStateKey[] = ["aggregation", "columnGroup", "columnOrder", "columnPinning", "columnSizing", "columnVisibility", "columnHeaderName", "focusedCell", "pagination", "rowPinning", "pivot", "cellSelection", "rowSelection", "scroll", "sideBar", "showValuesAs", "quickFilter"];
const view = (rowGroup: string[], filterModel: any = {}, sortModel: any[] = []) => (api: GridApi) => {
  api.setState({ rowGroup: { groupColIds: rowGroup }, filter: { filterModel }, sort: { sortModel } }, OTHER);
  api.setGridOption("pivotMode", false);
};
const VIEWS: View[] = [
  { id: "queue", label: "Retention queue", apply: view(["risk"], {}, [{ colId: "price", sort: "desc" }]) },
  { id: "all", label: "All members", apply: view([], {}, [{ colId: "updatedAt", sort: "desc" }]) },
  { id: "offer", label: "By offer", apply: view(["offerKind"], { offerKind: { filterType: "set", values: ["Pause", "Discount", "Downgrade to Lite", "Win-back", "Payment recovery", "Come-back", "Let go"] } }, [{ colId: "mrrSaved", sort: "desc" }]) },
  { id: "plan", label: "Plan × status", apply: view(["plan", "status"]) },
  { id: "failed", label: "Payment failures", apply: view([], { offerTrigger: { filterType: "set", values: ["Payment failed", "Suspended"] } }, [{ colId: "updatedAt", sort: "desc" }]) },
];

export function SubscribersGrid({ height = "calc(100vh - 260px)" }: { height?: string }) {
  const { data, lastChange } = useDashboard();
  const [api, setApi] = useState<GridApi<SubRow> | null>(null);
  const [active, setActive] = useState<string | null>("queue");
  const [toast, setToast] = useState<string | null>(null);

  useLiveRows(api, data?.subs, (rows) => {
    setToast(`${rows.length === 1 ? rows[0].name : `${rows.length} subscribers`} just arrived from PayPal`);
    setTimeout(() => setToast(null), 4000);
  });

  const columnDefs = useMemo<ColDef<SubRow>[]>(() => [
    { field: "name", headerName: "Subscriber", cellRendererSelector: (p) => (p.api.getRowGroupColumns().length ? { component: SubscriberCell } : { component: "agGroupCellRenderer", params: { innerRenderer: SubscriberCell, suppressCount: true } }), minWidth: 240, flex: 1.4, pinned: "left", filter: "agTextColumnFilter" },
    { field: "risk", headerName: "Retention", cellRenderer: RiskCell, width: 150, filter: "agSetColumnFilter", enableRowGroup: true, valueFormatter: (p) => riskLabel(p.value), filterParams: { valueFormatter: (p: any) => riskLabel(p.value) } },
    { field: "offerKind", headerName: "Latest offer", cellRenderer: OfferKindCell, width: 190, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter" },
    { field: "offerStatus", headerName: "Offer status", cellRenderer: OfferStatusCell, width: 180, enableRowGroup: true, filter: "agSetColumnFilter", valueFormatter: (p) => (p.value ? offerStatusLabel(p.value) : ""), filterParams: { valueFormatter: (p: any) => (p.value ? offerStatusLabel(p.value) : "(none)") } },
    { field: "payments", headerName: "Payments · 12 mo", width: 170, sortable: false, filter: false, suppressHeaderMenuButton: true,
      cellRenderer: "agSparklineCellRenderer",
      cellRendererParams: { sparklineOptions: { type: "bar", direction: "vertical", xKey: "month", yKey: "amount", padding: { top: 9, bottom: 9 },
        itemStyler: (p: any) => ({ fill: p.datum.failed ? "#e11d48" : p.datum.amount ? "#14b8a6" : "#e7e5e4" }),
        tooltip: { renderer: (p: any) => ({ heading: p.datum.month, title: p.datum.failed ? "Payment failed" : p.datum.amount ? "Paid" : "No bill", data: [{ label: "Amount", value: `$${p.datum.amount}` }] }) } } } },
    { field: "price", headerName: "MRR", width: 110, type: "numericColumn", aggFunc: "sum", enableValue: true, valueFormatter: moneyFmt, filter: "agNumberColumnFilter" },
    { field: "mrrSaved", headerName: "MRR saved", width: 125, type: "numericColumn", aggFunc: "sum", enableValue: true, valueFormatter: moneyFmt, filter: "agNumberColumnFilter",
      cellClassRules: { "font-semibold text-emerald-700": (p) => (p.value ?? 0) > 0 } },
    { field: "riskReason", headerName: "Why", width: 190, tooltipField: "riskReason", valueFormatter: (p) => (p.value ?? "").replace(/_/g, " ") },
    { field: "status", headerName: "PayPal status", cellRenderer: StatusCell, width: 140, enableRowGroup: true, filter: "agSetColumnFilter", valueFormatter: (p) => statusLabel(p.value), filterParams: { valueFormatter: (p: any) => statusLabel(p.value) } },
    { field: "plan", headerName: "Plan", width: 150, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter" },
    { field: "tenureMonths", headerName: "Tenure", width: 105, type: "numericColumn", aggFunc: "avg", enableValue: true, valueFormatter: (p) => (p.value == null ? "" : `${Math.round(p.value)} mo`), filter: "agNumberColumnFilter" },
    { field: "nextBillingAt", headerName: "Next bill", width: 130, valueFormatter: dateFmt, filter: "agDateColumnFilter", filterParams: { comparator: isoDateComparator } },
    { field: "source", headerName: "Source", cellRenderer: SourceCell, width: 150, enableRowGroup: true, filter: "agSetColumnFilter" },
    { field: "updatedAt", headerName: "Last activity", width: 130, valueFormatter: relFmt, sort: "desc", filter: "agDateColumnFilter", filterParams: { comparator: isoDateComparator } },
    { field: "offerTrigger", headerName: "Trigger", width: 160, hide: true, enableRowGroup: true, filter: "agSetColumnFilter" },
    { field: "offerEngine", headerName: "Decided by", cellRenderer: EngineCell, width: 170, hide: true, enableRowGroup: true, filter: "agSetColumnFilter" },
    { field: "paid12m", headerName: "Paid · 12 mo", width: 125, type: "numericColumn", aggFunc: "sum", enableValue: true, valueFormatter: moneyFmt, hide: true },
    { field: "email", headerName: "Email", hide: true, filter: "agTextColumnFilter" },
    { field: "id", headerName: "PayPal subscription ID", hide: true, filter: "agTextColumnFilter" },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({ sortable: true, resizable: true, filter: true, enableCellChangeFlash: true, menuTabs: ["filterMenuTab", "generalMenuTab", "columnsMenuTab"] }), []);
  const autoGroupColumnDef = useMemo<ColDef<SubRow>>(() => ({ headerName: "Group", minWidth: 190, width: 200, pinned: "left", cellRendererParams: { suppressCount: false } }), []);

  const getContextMenuItems = useCallback<GetContextMenuItems<SubRow>>((p) => {
    const s = p.node?.data;
    return [
      ...(s ? [
        { name: `Open ${s.name.split(" ")[0]}'s timeline`, action: () => p.node?.setExpanded(true), icon: "<span>↧</span>" },
        { name: "Copy PayPal subscription ID", action: () => navigator.clipboard.writeText(s.id) },
        "separator" as const,
      ] : []),
      "copy", "copyWithHeaders", "separator", "chartRange", "pivotChart", "separator", "export",
    ];
  }, []);

  const onGridReady = useCallback((e: GridReadyEvent<SubRow>) => { setApi(e.api); (window as any).__subsGrid = e.api; /* used by scripts/shots-grid.mjs */ }, []);
  const schemaOptions = useMemo(() => ({
    exclude: ["columnSizing"],
    columns: {
      risk: { description: "Retention state. Values: at_risk (needs attention), pending (awaiting buyer's PayPal consent), saved (an offer worked), healthy, lost (churned).", includeSetValues: true },
      status: { description: "PayPal subscription status (ACTIVE, SUSPENDED, CANCELLED…)", includeSetValues: true },
      plan: { description: "Membership plan", includeSetValues: true },
      offerKind: { description: "Latest retention offer type", includeSetValues: true },
      offerTrigger: { description: "What triggered the latest offer", includeSetValues: true },
      offerStatus: { description: "Outcome of the latest offer: proposed, pending_consent, saved, declined, lost", includeSetValues: true },
      source: { description: "Where the subscriber came from; 'Sample history' rows are synthetic demo data", includeSetValues: true },
      price: { description: "Monthly recurring revenue in USD" },
      mrrSaved: { description: "Monthly revenue kept by Second Chance offers, USD" },
      tenureMonths: { description: "Months since the subscription started" },
    },
  }), []);

  return (
    <div className="flex flex-col gap-3">
      <AskGrid api={api} schemaOptions={schemaOptions} onApplied={() => setActive(null)}
        context="Subscribers of Brightside Yoga (a PayPal Subscriptions merchant) and the retention offers Second Chance made to them."
        suggestions={["Who's at risk right now, highest MRR first?", "Group by plan and offer, total MRR saved", "Members over 12 months tenure that we lost", "Only discount offers still awaiting PayPal consent"]} />
      <div className="flex flex-wrap items-center gap-2">
        <ViewChips api={api} views={VIEWS} active={active} onChange={setActive} />
        <div className="ml-auto flex items-center gap-2">
          <LiveBadge at={lastChange} />
          <QuickFilter api={api} />
          <ExportButtons api={api} name="subscribers" />
        </div>
      </div>
      <div className="card relative overflow-hidden" style={{ height }}>
        {toast && <div className="rise absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">{toast}</div>}
        <AgGridReact<SubRow>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          onColumnRowGroupChanged={(e) => e.api.refreshCells({ columns: ["name"], force: true })}
          getRowId={(p) => p.data.id}
          onGridReady={onGridReady}
          loading={!data}
          initialState={{ rowGroup: { groupColIds: ["risk"] }, sort: { sortModel: [{ colId: "price", sort: "desc" }] } }}
          initialGroupOrderComparator={(p) => {
            const a = RISK_ORDER.indexOf(p.nodeA.key ?? ""), b = RISK_ORDER.indexOf(p.nodeB.key ?? "");
            return a >= 0 && b >= 0 && p.nodeA.field === "risk" ? a - b : String(p.nodeA.key).localeCompare(String(p.nodeB.key));
          }}
          isGroupOpenByDefault={(p) => p.field !== "risk" || ["at_risk", "pending"].includes(p.key ?? "")}
          grandTotalRow="bottom"
          rowGroupPanelShow="always"
          groupHideOpenParents={false}
          suppressAggFuncInHeader
          masterDetail
          isRowMaster={(d) => !!d}
          detailCellRenderer={SubscriberDetail}
          detailRowHeight={340}
          cellSelection
          enableCharts
          rowSelection={{ mode: "multiRow", checkboxes: false, headerCheckbox: false, enableClickSelection: true }}
          sideBar={{ toolPanels: ["columns", "filters"], hiddenByDefault: false, defaultToolPanel: undefined }}
          statusBar={{ statusPanels: [
            { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
            { statusPanel: "agSelectedRowCountComponent", align: "left" },
            { statusPanel: "agAggregationComponent", align: "right" },
          ] }}
          getContextMenuItems={getContextMenuItems}
          animateRows
          tooltipShowDelay={400}
          rowClassRules={{ "sc-row-risk": (p: { data?: SubRow }) => p.data?.risk === "at_risk" }}
          onRowGroupOpened={(e) => { if (e.node.master && e.expanded) setTimeout(() => e.api.ensureNodeVisible(e.node as IRowNode<SubRow>, "top"), 0); }}
          popupParent={typeof document !== "undefined" ? document.body : undefined}
        />
      </div>
    </div>
  );
}
