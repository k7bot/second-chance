"use client";
import "./ag-setup";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ChartRef, ColDef, FirstDataRenderedEvent, GridApi, GridReadyEvent, GridStateKey } from "ag-grid-community";
import { chartThemeOverrides, gridTheme, KIND_COLORS, PALETTE } from "./ag-setup";
import { useDashboard } from "./data";
import { useLiveRows } from "./live";
import { AskGrid, ExportButtons, LiveBadge, QuickFilter, ViewChips, type View } from "./toolbar";
import { EngineCell, OfferKindCell, OfferStatusCell, SourceCell, offerStatusLabel } from "./renderers";
import { dateFmt, isoDateComparator, moneyFmt } from "./format";
import type { OfferRow } from "@/lib/grid-data";
import clsx from "clsx";

const KIND_ORDER = ["Pause", "Discount", "Downgrade to Lite", "Payment recovery", "Come-back", "Win-back", "Let go"];
const ALL: GridStateKey[] = ["aggregation", "columnGroup", "columnOrder", "columnPinning", "columnSizing", "columnVisibility", "columnHeaderName", "focusedCell", "pagination", "rowPinning", "pivot", "cellSelection", "rowSelection", "scroll", "sideBar", "showValuesAs", "quickFilter", "filter", "sort", "rowGroup"];
const keep = (...set: GridStateKey[]) => ALL.filter((k) => !set.includes(k));

/** Custom aggregation: save rate = saved / decided, carried as an object so it re-aggregates correctly up the tree. */
const saveRateAgg = (p: any) => {
  let s = 0, d = 0;
  for (const v of p.values) { if (v && typeof v === "object") { s += v.s; d += v.d; } }
  return { s, d, value: d ? s / d : null, toString: () => (d ? `${Math.round((s / d) * 100)}%` : "—"), valueOf: () => (d ? s / d : 0) };
};

const pivotView = (values: { colId: string; aggFunc: string }[], svA?: string) => (api: GridApi) => {
  api.setGridOption("pivotMode", true);
  api.setState({
    rowGroup: { groupColIds: ["trigger"] },
    pivot: { pivotMode: true, pivotColIds: ["kind"] },
    aggregation: { aggregationModel: values },
    showValuesAs: { showValuesAsModel: svA ? values.map((v) => ({ colId: v.colId, showValuesAs: svA })) : [] },
  }, keep("rowGroup", "pivot", "aggregation", "showValuesAs"));
  // Show Values As (new in v36) is a column-state property; apply it once the pivot result columns exist.
  const sva = () => api.applyColumnState({ state: [{ colId: "mrrSaved", showValuesAs: svA ?? null }, ...(api.getPivotResultColumns() ?? []).map((c) => ({ colId: c.getColId(), showValuesAs: svA ?? null }))] });
  sva(); setTimeout(sva, 30);
};
const PIVOT_VIEWS: View[] = [
  { id: "mrr", label: "MRR saved", apply: pivotView([{ colId: "mrrSaved", aggFunc: "sum" }]) },
  { id: "count", label: "Offers made", apply: pivotView([{ colId: "id", aggFunc: "count" }]) },
  { id: "rate", label: "Save rate", apply: pivotView([{ colId: "saveRate", aggFunc: "saveRate" }]) },
  { id: "share", label: "% of trigger", apply: pivotView([{ colId: "mrrSaved", aggFunc: "sum" }], "percentOfRowTotal") },
];

export function OffersGrid() {
  const { data, lastChange } = useDashboard();
  const [api, setApi] = useState<GridApi<OfferRow> | null>(null);
  const [mode, setMode] = useState<"pivot" | "log">("pivot");
  const [measure, setMeasure] = useState<string | null>("mrr");
  const chartEl = useRef<HTMLDivElement>(null);
  const measureRef = useRef<string | null>("mrr");
  const share = mode === "pivot" && measure === "share";
  const chart = useRef<ChartRef | undefined>(undefined);
  useLiveRows(api, data?.offers);

  const columnDefs = useMemo<ColDef<OfferRow>[]>(() => [
    { field: "trigger", headerName: "Trigger", enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter", width: 170 },
    { field: "kind", headerName: "Offer", enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter", cellRenderer: OfferKindCell, width: 190,
      pivotComparator: (a: string, b: string) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b) },
    { field: "name", headerName: "Subscriber", width: 170, filter: "agTextColumnFilter" },
    { field: "headline", headerName: "What we offered", flex: 1.6, minWidth: 240, tooltipField: "message", cellClass: "font-medium" },
    { field: "status", headerName: "Outcome", cellRenderer: OfferStatusCell, width: 180, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter", valueFormatter: (p) => offerStatusLabel(p.value), filterParams: { valueFormatter: (p: any) => offerStatusLabel(p.value) } },
    { field: "mrrSaved", headerName: "MRR saved", type: "numericColumn", enableValue: true, defaultAggFunc: "sum", enableShowValuesAs: true, showValuesAsDef: { precision: 0 },
      // A custom valueFormatter takes precedence over Show Values As, so drop it while a "% of" mode is active.
      ...(share ? { showValuesAs: "percentOfRowTotal" as const } : { valueFormatter: moneyFmt, showValuesAs: null }), width: 130 },
    { field: "arrSaved", headerName: "ARR saved", type: "numericColumn", enableValue: true, defaultAggFunc: "sum", valueFormatter: moneyFmt, width: 130, hide: true },
    { colId: "saveRate", headerName: "Save rate", enableValue: true, valueGetter: (p) => (p.data ? { s: p.data.saved, d: p.data.decided, value: p.data.decided ? p.data.saved : null, toString: () => (p.data!.decided ? (p.data!.saved ? "Saved" : "Not saved") : "Open") } : null),
      defaultAggFunc: "saveRate", width: 120, type: "numericColumn", hide: true, comparator: (a: any, b: any) => (a?.value ?? -1) - (b?.value ?? -1) },
    { field: "id", headerName: "Offers", enableValue: true, hide: true, defaultAggFunc: "count" },
    { field: "engine", headerName: "Decided by", cellRenderer: EngineCell, width: 170, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter" },
    { field: "reason", headerName: "Cancel reason", width: 160, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter", valueFormatter: (p) => (p.value ?? "").replace(/_/g, " "), hide: true },
    { field: "plan", headerName: "Plan", width: 140, enableRowGroup: true, enablePivot: true, filter: "agSetColumnFilter", hide: true },
    { field: "month", headerName: "Month", width: 110, enableRowGroup: true, enablePivot: true, hide: true },
    { field: "hoursToResolve", headerName: "Hours to decide", type: "numericColumn", enableValue: true, defaultAggFunc: "avg", width: 140, valueFormatter: (p) => (p.value == null ? "" : `${Number(p.value).toFixed(1)} h`), hide: true },
    { field: "source", cellRenderer: SourceCell, width: 150, enableRowGroup: true, filter: "agSetColumnFilter", hide: true },
    { field: "createdAt", headerName: "Offered", width: 130, sort: "desc", valueFormatter: dateFmt, filter: "agDateColumnFilter", filterParams: { comparator: isoDateComparator } },
  ], [share]);

  const makeChart = useCallback((gridApi: GridApi) => {
    if (!chartEl.current) return;
    chart.current?.destroyChart();
    chart.current = gridApi.createPivotChart({
      chartType: measureRef.current === "rate" ? "groupedBar" : measureRef.current === "share" ? "normalizedBar" : "stackedBar", chartContainer: chartEl.current, chartThemeName: "secondChance",
      chartThemeOverrides: {
        ...chartThemeOverrides,
        common: { ...chartThemeOverrides.common, title: { enabled: false }, axes: { ...chartThemeOverrides.common?.axes, category: { label: { autoRotate: false, rotation: 0, color: "#475569", fontSize: 12 }, line: { stroke: "#e7e5e4" } } }, legend: { position: "right", item: { label: { fontSize: 12, color: "#334155" } } } },
        bar: { series: { cornerRadius: 4, strokeWidth: 0 }, axes: { category: { label: { autoRotate: false, rotation: 0, color: "#475569", fontSize: 12 } }, "grouped-category": { label: { rotation: 0, color: "#475569", fontSize: 12 } } } as any },
      },
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    if (mode === "pivot") { PIVOT_VIEWS.find((v) => v.id === (measure ?? "mrr"))!.apply(api); setTimeout(() => makeChart(api), 50); }
    else {
      chart.current?.destroyChart(); chart.current = undefined;
      api.setGridOption("pivotMode", false);
      api.setState({ rowGroup: { groupColIds: [] }, pivot: { pivotMode: false, pivotColIds: [] }, sort: { sortModel: [{ colId: "createdAt", sort: "desc" }] }, filter: { filterModel: {} }, showValuesAs: { showValuesAsModel: [] } }, keep("rowGroup", "pivot", "sort", "filter", "showValuesAs"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, mode]);

  const onGridReady = useCallback((e: GridReadyEvent<OfferRow>) => { setApi(e.api); }, []);
  const onFirstData = useCallback((e: FirstDataRenderedEvent<OfferRow>) => { if (e.api.isPivotMode()) makeChart(e.api); }, [makeChart]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-ink p-1">
          {(["pivot", "log"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={clsx("rounded-lg px-3.5 py-1.5 text-xs font-semibold transition", mode === m ? "bg-white text-ink" : "text-slate-300 hover:text-white")}>
              {m === "pivot" ? "Pivot · trigger × offer" : "Offer log"}
            </button>
          ))}
        </div>
        {mode === "pivot" && <ViewChips api={api} views={PIVOT_VIEWS} active={measure} onChange={(id) => { setMeasure(id); measureRef.current = id; setTimeout(() => api && makeChart(api), 50); }} />}
        <div className="ml-auto flex items-center gap-2">
          <LiveBadge at={lastChange} />
          {mode === "log" && <QuickFilter api={api} placeholder="Search offers…" />}
          <ExportButtons api={api} name={mode === "pivot" ? "offers-pivot" : "offers"} />
        </div>
      </div>
      {mode === "log" && (
        <AskGrid api={api} context="Every retention offer Second Chance made (trigger, offer type, AI-written headline, outcome, MRR saved)."
          suggestions={["Saved offers this month, biggest MRR first", "Group by engine and outcome", "Declined discounts"]} />
      )}
      <div className={clsx("card overflow-hidden p-4", mode === "pivot" ? "block" : "hidden")}>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Integrated pivot chart</h2>
          <span className="text-xs text-muted">Live-linked to the pivot below · open the menu ☰ to change chart type</span>
        </div>
        <div ref={chartEl} className="mt-2 h-[300px]" />
      </div>
      <div className="card overflow-hidden" style={{ height: mode === "pivot" ? 330 : "calc(100vh - 300px)" }}>
        <AgGridReact<OfferRow>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: true, enableCellChangeFlash: true }}
          autoGroupColumnDef={{ headerName: "Trigger", minWidth: 210, pinned: "left" }}
          aggFuncs={{ saveRate: saveRateAgg }}
          getRowId={(p) => p.data.id}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstData}
          loading={!data}
          pivotMode
          initialState={{ rowGroup: { groupColIds: ["trigger"] }, pivot: { pivotMode: true, pivotColIds: ["kind"] }, aggregation: { aggregationModel: [{ colId: "mrrSaved", aggFunc: "sum" }] } }}
          processPivotResultColDef={(c) => { c.minWidth = 128; c.flex = 1; c.suppressHeaderFilterButton = true; }}
          grandTotalRow="bottom"
          suppressAggFuncInHeader
          removePivotHeaderRowWhenSingleValueColumn
          cellSelection
          enableCharts
          customChartThemes={{ secondChance: { baseTheme: "ag-default", palette: { fills: KIND_ORDER.map((k) => KIND_COLORS[k]).concat(PALETTE), strokes: KIND_ORDER.map((k) => KIND_COLORS[k]).concat(PALETTE) } } }}
          chartThemes={["secondChance", "ag-default", "ag-vivid"]}
          sideBar={{ toolPanels: ["columns", "filters"] }}
          statusBar={{ statusPanels: [{ statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" }, { statusPanel: "agAggregationComponent" }] }}
          rowGroupPanelShow={mode === "log" ? "always" : "never"}
          animateRows
          tooltipShowDelay={300}
          popupParent={typeof document !== "undefined" ? document.body : undefined}
        />
      </div>
    </div>
  );
}
