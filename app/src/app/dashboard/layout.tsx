import Link from "next/link";
import { Logo } from "@/components/ui";
import { SideNav } from "@/components/client";
import { engineLabel } from "@/lib/offers";
import { dashboardData } from "@/lib/queries";
import { Sparkles } from "lucide-react";
import { DashboardDataProvider } from "@/components/grid/data";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const d = await dashboardData();
  const engine = engineLabel();
  return (
    <div className="flex min-h-screen lg:bg-[linear-gradient(90deg,#0b1220_16rem,transparent_16rem)]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0b1220] px-4 py-5 lg:flex">
        <Link href="/" className="px-2 text-white"><Logo /></Link>
        <div className="mx-2 mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Merchant</p>
          <p className="mt-0.5 text-sm font-semibold text-white">Brightside Yoga</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> PayPal sandbox connected
          </p>
        </div>
        <SideNav counts={{ "/dashboard/subscribers": d.kpis.atRisk }} />
        <div className="mt-auto rounded-xl border border-white/10 p-3 text-xs text-slate-400">
          <p className="flex items-center gap-1.5 font-semibold text-slate-200"><Sparkles className="h-3.5 w-3.5 text-teal-300" /> Offer engine</p>
          <p className="mt-1">{engine}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-10"><DashboardDataProvider>{children}</DashboardDataProvider></div>
      </main>
    </div>
  );
}
