import { Badge, ago, cx } from "./ui";
import type { EventRow } from "@/lib/db/schema";
import { AlertTriangle, CheckCircle2, CreditCard, PauseCircle, PlayCircle, PlusCircle, RefreshCw, XCircle } from "lucide-react";

const META: Record<string, { label: string; icon: any; tone: string }> = {
  "BILLING.SUBSCRIPTION.CREATED": { label: "Subscription created", icon: PlusCircle, tone: "text-sky-600 bg-sky-50" },
  "BILLING.SUBSCRIPTION.ACTIVATED": { label: "Subscription activated", icon: PlayCircle, tone: "text-emerald-600 bg-emerald-50" },
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": { label: "Subscription re-activated", icon: PlayCircle, tone: "text-emerald-600 bg-emerald-50" },
  "BILLING.SUBSCRIPTION.UPDATED": { label: "Subscription updated", icon: RefreshCw, tone: "text-violet-600 bg-violet-50" },
  "BILLING.SUBSCRIPTION.SUSPENDED": { label: "Subscription suspended", icon: PauseCircle, tone: "text-amber-600 bg-amber-50" },
  "BILLING.SUBSCRIPTION.CANCELLED": { label: "Cancelled in PayPal", icon: XCircle, tone: "text-rose-600 bg-rose-50" },
  "BILLING.SUBSCRIPTION.EXPIRED": { label: "Subscription expired", icon: XCircle, tone: "text-slate-600 bg-slate-100" },
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": { label: "Payment failed", icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
  "PAYMENT.SALE.COMPLETED": { label: "Payment received", icon: CreditCard, tone: "text-emerald-600 bg-emerald-50" },
};

export function Timeline({ events, compact }: { events: EventRow[]; compact?: boolean }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const m = META[e.type] || { label: e.type, icon: CheckCircle2, tone: "text-slate-600 bg-slate-100" };
        const Icon = m.icon;
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-line" />}
            <span className={cx("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.tone)}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{m.label}</span>
                {e.verification === "SUCCESS" ? <Badge tone="green">Signature verified</Badge>
                  : e.verification === "LOCAL_REPLAY" ? <Badge tone="violet">Local replay</Badge>
                  : e.verification === "SAMPLE" ? <Badge tone="slate">Sample history</Badge>
                  : <Badge tone="red">{e.verification}</Badge>}
                <span className="ml-auto text-xs text-muted">{ago(e.receivedAt)}</span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{e.resourceId} · {e.id}</p>
              {!compact && e.note && <p className="mt-1 text-sm text-ink-2">→ {e.note}</p>}
              {compact && e.note && <p className="mt-0.5 truncate text-xs text-ink-2">→ {e.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
