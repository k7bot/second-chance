"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LayoutDashboard, Users, Activity, Mail, FlaskConical, Store, Table2, Sparkles } from "lucide-react";
import clsx from "clsx";

export function AutoRefresh({ ms = 4000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/subscribers", label: "Subscribers", icon: Users },
  { href: "/dashboard/offers", label: "Offers & revenue", icon: Table2 },
  { href: "/dashboard/studio", label: "Studio · AI analyst", icon: Sparkles },
  { href: "/dashboard/events", label: "Event timeline", icon: Activity },
  { href: "/dashboard/outbox", label: "Outbox", icon: Mail },
  { href: "/dashboard/demo", label: "Demo console", icon: FlaskConical },
];

export function SideNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="mt-6 flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={clsx("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
            <Icon className={clsx("h-4 w-4", active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300")} />
            <span className="flex-1">{label}</span>
            {counts[href] ? <span className="rounded-full bg-teal-400/15 px-1.5 text-[11px] font-semibold text-teal-200">{counts[href]}</span> : null}
          </Link>
        );
      })}
      <div className="my-3 h-px bg-white/10" />
      <Link href="/store" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
        <Store className="h-4 w-4 text-slate-500" /> Merchant store
      </Link>
    </nav>
  );
}

/** Small POST-and-refresh button. */
export function ActionButton({ url, body, method = "POST", children, className, confirm: confirmText, onDone }: {
  url: string; body?: unknown; method?: "POST" | "DELETE"; children: React.ReactNode; className?: string; confirm?: string; onDone?: (j: any) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button className={className} disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          start(async () => {
            const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
            const j = await r.json().catch(() => ({}));
            setMsg(r.ok ? j.note || j.detail || null : j.error || `Failed (${r.status})`);
            onDone?.(j);
            router.refresh();
          });
        }}>
        {pending ? <Spinner /> : null}
        {children}
      </button>
      {msg && <span className="max-w-xs text-xs text-muted">{msg}</span>}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx("inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}
