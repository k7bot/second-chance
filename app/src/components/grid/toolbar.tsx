"use client";
import { useEffect, useState } from "react";
import type { GridApi } from "ag-grid-community";
import { Download, FileSpreadsheet, Search, Sparkles, Undo2, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/client";
import clsx from "clsx";

export function QuickFilter({ api, placeholder = "Search everything…" }: { api: GridApi | null; placeholder?: string }) {
  const [v, setV] = useState("");
  useEffect(() => { api?.setGridOption("quickFilterText", v); }, [api, v]);
  return (
    <label className="relative flex items-center">
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
        className="h-9 w-56 rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-teal-600/15" />
    </label>
  );
}

export function ExportButtons({ api, name }: { api: GridApi | null; name: string }) {
  const stamp = () => new Date().toISOString().slice(0, 10);
  return (
    <div className="flex gap-1.5">
      <button className="btn-ghost h-9 px-3 py-0 text-xs" onClick={() => api?.exportDataAsCsv({ fileName: `second-chance-${name}-${stamp()}.csv` })}><Download className="h-3.5 w-3.5" /> CSV</button>
      <button className="btn-ghost h-9 px-3 py-0 text-xs" onClick={() => api?.exportDataAsExcel({ fileName: `second-chance-${name}-${stamp()}.xlsx`, sheetName: name })}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
    </div>
  );
}

export type View = { id: string; label: string; apply: (api: GridApi) => void };
export function ViewChips({ api, views, active, onChange }: { api: GridApi | null; views: View[]; active: string | null; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100/80 p-1">
      {views.map((v) => (
        <button key={v.id} onClick={() => { if (api) { v.apply(api); onChange(v.id); } }}
          className={clsx("rounded-lg px-3 py-1.5 text-xs font-semibold transition", active === v.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
          {v.label}
        </button>
      ))}
    </div>
  );
}

/**
 * "Ask the grid": AG Grid's AI Toolkit. We send the grid's own structured schema (api.getStructuredSchema)
 * plus its current state to the LLM; the reply is a GridState that goes straight into api.setState.
 */
export function AskGrid({ api, schemaOptions, context, suggestions, onApplied }: {
  api: GridApi | null; schemaOptions?: any; context: string; suggestions: string[]; onApplied?: () => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ prompt: string; text: string; error?: boolean } | null>(null);
  const [undo, setUndo] = useState<any>(null);
  async function ask(prompt: string) {
    if (!api || !prompt.trim()) return;
    setBusy(true); setReply(null);
    const before = api.getState();
    try {
      const schema = (api as any).getStructuredSchema(schemaOptions);
      const sample = api.getDisplayedRowCount() ? [0, 1, 2].map((i) => api.getDisplayedRowAtIndex(i)?.data).filter(Boolean) : [];
      const r = await fetch("/api/ai/grid", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, state: before, schema, sample }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      if (j.gridState && Object.keys(j.gridState).length) {
        api.setState(j.gridState, j.propertiesToIgnore ?? []);
        // Open small groupings so the answer is visible straight away.
        setTimeout(() => { let n = 0; api.forEachNode((x) => { if (x.group && x.level === 0) n++; }); if (n > 0 && n <= 6 && !api.isPivotMode()) api.forEachNode((x) => { if (x.group && x.level === 0) x.setExpanded(true); }); }, 60);
      }
      setUndo(before); setQ("");
      setReply({ prompt, text: j.explanation || "Done." });
      onApplied?.();
    } catch (e) {
      setReply({ prompt, text: (e as Error).message, error: true });
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50/80 via-white to-white p-2">
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><Sparkles className="h-4 w-4" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
          placeholder="Ask the grid… e.g. “group by offer and show MRR saved, biggest first”"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        {undo && !busy && <button type="button" className="btn-link inline-flex items-center gap-1 text-xs" onClick={() => { api?.setState(undo); setUndo(null); setReply(null); }}><Undo2 className="h-3.5 w-3.5" /> Undo</button>}
        <button className="btn-brand h-9 px-3 py-0 text-xs" disabled={busy || !q.trim()}>{busy ? <Spinner /> : <ArrowRight className="h-4 w-4" />} Ask</button>
      </form>
      {(reply || !undo) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-0.5 pt-2">
          {reply ? (
            <p className={clsx("text-xs", reply.error ? "text-rose-600" : "text-ink-2")}><span className="font-semibold">{reply.error ? "Couldn't apply: " : "AG Grid AI Toolkit: "}</span>{reply.text}</p>
          ) : suggestions.map((s) => (
            <button key={s} type="button" onClick={() => { setQ(s); ask(s); }} disabled={busy}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-2 transition hover:border-brand hover:text-brand">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveBadge({ at }: { at: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const s = at ? Math.round((Date.now() - at) / 1000) : null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live · {s === null ? "connecting" : s < 5 ? "just updated" : `updated ${s < 60 ? `${s}s` : `${Math.round(s / 60)}m`} ago`}
    </span>
  );
}
