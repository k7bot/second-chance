"use client";
import dynamic from "next/dynamic";
// AG Studio touches window/DOM on import, so it renders client-only.
const StudioDashboard = dynamic(() => import("@/components/studio/studio-dashboard").then((m) => m.StudioDashboard), {
  ssr: false,
  loading: () => <div className="grid h-[70vh] place-items-center text-sm text-muted">Loading AG Studio…</div>,
});
export function StudioClient({ models }: { models: string[] }) { return <StudioDashboard models={models} />; }
