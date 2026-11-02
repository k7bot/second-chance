"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { gridData } from "@/lib/grid-data";

export type DashData = Awaited<ReturnType<typeof gridData>>;
type Ctx = { data: DashData | null; refresh: () => Promise<void>; lastChange: number };
const C = createContext<Ctx>({ data: null, refresh: async () => {}, lastChange: 0 });

/**
 * Lives in the dashboard layout, so data survives page switches. Polls a cheap change token every 2.5s
 * and only refetches the full payload when PayPal webhooks (or the save flow) actually changed something.
 */
export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashData | null>(null);
  const [lastChange, setLastChange] = useState(0);
  const ver = useRef<string>("");
  const busy = useRef(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/dashboard/data", { cache: "no-store" });
    if (r.ok) { setData(await r.json()); setLastChange(Date.now()); }
  }, []);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try {
        const v = (await (await fetch("/api/dashboard/version", { cache: "no-store" })).json()).v as string;
        if (alive && v !== ver.current) { ver.current = v; await load(); }
      } catch {} finally { busy.current = false; }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [load]);
  return <C.Provider value={{ data, refresh: load, lastChange }}>{children}</C.Provider>;
}
export const useDashboard = () => useContext(C);
