"use client";
// Custom AG Studio widget: a "save flow" Sankey (trigger → offer → outcome) rendered with AG Charts
// Enterprise's sankey series. It reads data through Studio's widget API, so page filters, date filters and
// cross-filters all apply, and clicking a link cross-filters the rest of the dashboard.
import { useEffect, useMemo, useState } from "react";
import { AgCharts } from "ag-charts-react";
import { getChartTheme, type AgWidgetParams } from "ag-studio";
import type { AgChartOptions } from "ag-charts-enterprise";

type Link = { from: string; to: string; size: number; stage: number };
const OUTCOME_FILL: Record<string, string> = { Saved: "#0f766e", Churned: "#e11d48", "In progress": "#f59e0b" };

export function SaveFlowSankey(props: AgWidgetParams<any>) {
  const { api, widgetApi, dataMapping } = props;
  const [links, setLinks] = useState<Link[]>([]);
  const stages = useMemo(() => [...(dataMapping.from ?? []), ...(dataMapping.to ?? [])] as any[], [dataMapping]);
  const value = (dataMapping.value ?? [])[0] as any;

  useEffect(() => {
    let alive = true;
    if (stages.length < 2 || !value) { widgetApi.setDisplayState?.("noData"); return; }
    widgetApi.setDisplayState?.("loading");
    widgetApi.getData({ fields: [...stages, value] }).then((res: any) => {
      if (!alive) return;
      const rows: Record<string, any>[] = res?.results?.rows ?? [];
      // Each adjacent pair of mapped stages becomes one band of links.
      const acc = new Map<string, Link>();
      for (const r of rows) {
        const v = Number(r[value.key] ?? 0); if (!v) continue;
        for (let i = 0; i < stages.length - 1; i++) {
          const a = String(r[stages[i].key] ?? "—"), b = String(r[stages[i + 1].key] ?? "—");
          const k = `${i}|${a}|${b}`;
          const l = acc.get(k) ?? { from: a, to: b, size: 0, stage: i } as Link;
          l.size += v; acc.set(k, l);
        }
      }
      const out = [...acc.values()];
      setLinks(out);
      widgetApi.setDisplayState?.(out.length ? "displayed" : "noData");
    }).catch(() => alive && widgetApi.setDisplayState?.("noData"));
    return () => { alive = false; };
  }, [widgetApi, stages, value]);

  const options = useMemo<AgChartOptions>(() => {
    const base = getChartTheme(api as any);
    const label = (id: string) => id;
    // Which mapped stage a node belongs to, for colouring outcomes and for cross-filtering on click.
    const stageOf = new Map<string, number>();
    for (const l of links) { if (!stageOf.has(l.from)) stageOf.set(l.from, l.stage); stageOf.set(l.to, l.stage + 1); }
    const lastStage = stages.length - 1;
    return {
      theme: { ...base, params: { ...(base as any).params, backgroundColor: "transparent" } } as any,
      background: { visible: false },
      data: links,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      series: [{
        type: "sankey", fromKey: "from", toKey: "to", sizeKey: "size", sizeName: value?.name ?? "Value",
        node: {
          spacing: 14, width: 10, cornerRadius: 3,
          itemStyler: (p: any) => {
            const id = String(p.label ?? p.datum?.id ?? "");
            return stageOf.get(id) === lastStage && OUTCOME_FILL[id] ? { fill: OUTCOME_FILL[id], stroke: OUTCOME_FILL[id] } : undefined;
          },
        },
        link: { fillOpacity: 0.32 },
        label: { fontSize: 12, fontWeight: 500 },
        tooltip: {
          renderer: ({ datum }: any) => datum?.from
            ? { heading: `${label(datum.from)} → ${label(datum.to)}`, data: [{ label: value?.name ?? "Value", value: Number(datum.size).toLocaleString("en-US") }] }
            : undefined,
        },
        listeners: {
          seriesNodeClick: ({ datum }: any) => {
            const id = String(datum?.id ?? datum?.label ?? "");
            const i = stageOf.get(id); const field = i == null ? undefined : stages[i];
            if (field) widgetApi.toggleCrossFilter({ type: "multiValue", values: [{ field, value: label(id) }], group: 0 } as any);
          },
        },
      } as any],
    } as AgChartOptions;
  }, [api, links, stages, value, widgetApi]);

  return <div style={{ width: "100%", height: "100%" }}><AgCharts options={options} style={{ width: "100%", height: "100%" }} /></div>;
}
