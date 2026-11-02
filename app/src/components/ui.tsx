import clsx from "clsx";

export const cx = clsx;

export function money(n: number | null | undefined, opts: { cents?: boolean } = {}) {
  const v = n ?? 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: opts.cents || v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function ago(d: Date | string | null | undefined) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-brand-soft text-brand ring-teal-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "slate", children, dot, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  return ({ ACTIVE: "green", SUSPENDED: "amber", CANCELLED: "red", EXPIRED: "slate", APPROVAL_PENDING: "blue" } as Record<string, Tone>)[status] || "slate";
}
export function riskTone(risk: string): Tone {
  return ({ healthy: "slate", at_risk: "red", pending: "amber", saved: "green", lost: "slate" } as Record<string, Tone>)[risk] || "slate";
}
export const RISK_LABEL: Record<string, string> = { healthy: "Healthy", at_risk: "At risk", pending: "Awaiting buyer", saved: "Saved", lost: "Lost" };
export function offerStatusTone(s: string): Tone {
  return ({ saved: "green", pending_consent: "amber", proposed: "blue", declined: "slate", lost: "slate" } as Record<string, Tone>)[s] || "slate";
}
export const OFFER_STATUS_LABEL: Record<string, string> = { saved: "Saved", pending_consent: "Awaiting PayPal consent", proposed: "Offered", declined: "Declined", lost: "Let go" };

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initials = ((name || "?").match(/\p{L}+/gu) || ["?"]).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const hues = ["bg-teal-100 text-teal-800", "bg-orange-100 text-orange-800", "bg-indigo-100 text-indigo-800", "bg-rose-100 text-rose-800", "bg-lime-100 text-lime-800"];
  const h = hues[(name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return <span className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", h, className)}>{initials}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0f766e" />
        <path d="M22.5 11.5a7.5 7.5 0 1 0 1.2 7.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M24.6 8.6v4.6H20" fill="none" stroke="#5eead4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Second Chance
    </span>
  );
}

export function SunLogo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-serif text-xl tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx="16" cy="18" r="7" fill="#e8743b" />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = Math.PI + (i * Math.PI) / 4;
          return <line key={i} x1={16 + Math.cos(a) * 10} y1={18 + Math.sin(a) * 10} x2={16 + Math.cos(a) * 13.5} y2={18 + Math.sin(a) * 13.5} stroke="#f4a261" strokeWidth="2.4" strokeLinecap="round" />;
        })}
        <rect x="4" y="24" width="24" height="3" rx="1.5" fill="#2a2018" />
      </svg>
      Brightside Yoga
    </span>
  );
}
