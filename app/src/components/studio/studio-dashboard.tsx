"use client";
// AG Studio, embedded: a self-serve analytics workspace over the same live Second Chance data as the AG Grid
// pages. Custom theme, custom Sankey widget, a three-page starter report and an AI analyst (AG Studio Agent
// Framework) that can answer questions and build widgets. View/Edit toggles Studio's drag-and-drop editor.
import { useMemo, useRef, useState } from "react";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import { AgStudioAiModule, type AgStudioApi } from "ag-studio";
import { Eye, PencilRuler, RotateCcw, Sparkles } from "lucide-react";
import { useDashboard, type DashData } from "@/components/grid/data";
import { buildStudioData } from "./data";
import { studioReport } from "./initial-report";
import { secondChanceStudioTheme } from "./theme";
import { buildWidgets } from "./widgets";
import { buildAi } from "./ai";

// AG Studio has its own licence (the AG Grid + Charts trial key does not cover it). Without one, Studio runs
// locally with a watermark; set NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY to remove it.
const LICENSE = process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY || undefined;

export function StudioDashboard({ models }: { models: string[] }) {
  const { data } = useDashboard();
  const dataRef = useRef<DashData | null>(null);
  dataRef.current = data;
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [rev, setRev] = useState(0);
  const apiRef = useRef<AgStudioApi | null>(null);
  const [pages, setPages] = useState<string[]>(studioReport.pages?.map((p: any) => p.id) ?? []);
  const [page, setPage] = useState<string>(studioReport.selectedPageId ?? "");
  const goTo = (id: string) => { const api = apiRef.current; if (!api) return; api.setState({ ...api.getState(), selectedPageId: id } as any); setPage(id); };
  // Studio reads `data` once per data version: rebuild only when the dashboard payload actually changes.
  const studioData = useMemo(() => (data ? buildStudioData(data) : null), [data]);
  const ai = useMemo(() => (models.length ? buildAi(models, () => dataRef.current) : undefined), [models]);

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">AG Studio · AI analyst</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Retention studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Self-serve analytics over your live PayPal data. Ask the analyst a question, or switch to Edit to drag in widgets — including the Second Chance save-flow Sankey.</p>
        </div>
        <div className="flex items-center gap-2">
          {!models.length && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">AI analyst off: no LLM key on the server</span>}
          {models.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"><Sparkles className="h-3.5 w-3.5" /> AI analyst ready</span>}
          <div className="inline-flex rounded-xl border border-line bg-white p-1 text-sm">
            {(["view", "edit"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                {m === "view" ? <Eye className="h-4 w-4" /> : <PencilRuler className="h-4 w-4" />} {m === "view" ? "Dashboard" : "Build · Ask AI"}
              </button>
            ))}
          </div>
          <button className="btn-ghost !px-3 !py-2" title="Reset to the starter report" onClick={() => setRev((r) => r + 1)}><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1">
        {pages.map((id) => (
          <button key={id} onClick={() => goTo(id)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${page === id ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-white hover:text-ink"}`}>{id}</button>
        ))}
      </div>
      <div className="mt-3 h-[calc(100vh-230px)] min-h-[720px] overflow-hidden rounded-2xl border border-line bg-canvas">
        {studioData ? (
          <AgStudioProvider licenseKey={LICENSE} modules={ai ? [AgStudioAiModule] : undefined}>
            <AgStudio
              key={rev}
              style={{ height: "100%", width: "100%" }}
              theme={secondChanceStudioTheme}
              layout={{ widgetBorderEnabled: true } as any}
              data={studioData}
              widgets={buildWidgets as any}
              ai={ai}
              initialState={studioReport as any}
              mode={mode}
              onApiReady={(e: any) => { apiRef.current = e.api; }}
              onStateUpdated={(e: any) => { const st = e.state; if (st?.pages) setPages(st.pages.map((p: any) => p.id)); if (st?.selectedPageId) setPage(st.selectedPageId); }}
            />
          </AgStudioProvider>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">Loading your PayPal data…</div>
        )}
      </div>
    </div>
  );
}
