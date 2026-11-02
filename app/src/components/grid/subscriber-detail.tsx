"use client";
import { useEffect, useState } from "react";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Timeline } from "@/components/timeline";
import { Badge, OFFER_STATUS_LABEL, offerStatusTone, fmtDate } from "@/components/ui";
import { ActionButton } from "@/components/client";
import { useDashboard } from "./data";
import { KIND_COLORS } from "./ag-setup";
import { fmtMoney } from "./format";
import { Mail, PlayCircle } from "lucide-react";

/** Master/detail: the full-width detail row under a subscriber — PayPal webhook timeline + every offer we made. */
export function SubscriberDetail(p: CustomCellRendererProps) {
  const s = p.data;
  const { lastChange } = useDashboard();
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/dashboard/subscriber/${encodeURIComponent(s.id)}`).then((r) => r.json()).then((j) => alive && setD(j)).catch(() => {});
    return () => { alive = false; };
  }, [s.id, lastChange]);
  return (
    <div className="h-full overflow-hidden whitespace-normal bg-stone-50/70 px-6 py-5 leading-normal">
      <div className="grid h-full gap-5 lg:grid-cols-[1.1fr_1fr_0.7fr]">
        <section className="card min-h-0 overflow-auto p-4">
          <h4 className="eyebrow">PayPal event timeline</h4>
          <div className="mt-3">{d ? (d.events.length ? <Timeline events={d.events.slice(0, 8)} compact /> : <p className="text-sm text-muted">No webhooks for this subscription yet.</p>) : <p className="text-sm text-muted">Loading…</p>}</div>
        </section>
        <section className="card min-h-0 overflow-auto p-4">
          <h4 className="eyebrow">Offer history</h4>
          <ul className="mt-3 space-y-3">
            {d?.offers?.length === 0 && <li className="text-sm text-muted">No retention offers yet.</li>}
            {d?.offers?.map((o: any) => (
              <li key={o.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLORS[o.kindLabel] ?? "#94a3b8" }} />
                  <span className="text-sm font-semibold">{o.kindLabel}</span>
                  <span className="text-xs text-muted">· {o.triggerLabel}</span>
                  <Badge tone={offerStatusTone(o.status)} className="ml-auto">{OFFER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                </div>
                {o.headline && <p className="mt-1.5 text-sm font-medium text-ink">“{o.headline}”</p>}
                {o.rationale && <p className="mt-0.5 text-xs text-muted">{o.rationale}</p>}
                <p className="mt-1.5 text-[11px] text-muted">{fmtDate(o.createdAt)} · {o.engine?.replace(/^llm:/, "AI · ") ?? "—"}{o.mrrSaved ? ` · ${fmtMoney(o.mrrSaved, true)}/mo kept` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card flex min-h-0 flex-col gap-3 overflow-auto p-4">
          <h4 className="eyebrow">Member</h4>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Plan</dt><dd className="font-medium">{s.plan}</dd>
            <dt className="text-muted">Price</dt><dd className="font-medium tabular-nums">{fmtMoney(s.price, true)}/mo</dd>
            <dt className="text-muted">Member since</dt><dd className="font-medium">{fmtDate(s.startTime)}</dd>
            <dt className="text-muted">Paid (12 mo)</dt><dd className="font-medium tabular-nums">{fmtMoney(s.paid12m, true)}</dd>
            {s.pausedUntil && <><dt className="text-muted">Paused until</dt><dd className="font-medium">{fmtDate(s.pausedUntil)}</dd></>}
            {s.graceUntil && <><dt className="text-muted">Grace until</dt><dd className="font-medium">{fmtDate(s.graceUntil)}</dd></>}
          </dl>
          <p className="truncate font-mono text-[11px] text-muted">{s.id}</p>
          {d?.outbox?.[0] && <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2"><Mail className="h-3.5 w-3.5 shrink-0 text-muted" /> <span className="truncate">Last email: {d.outbox[0].subject}</span> <span className={d.outbox[0].deliveryStatus === "sent" ? "shrink-0 font-semibold text-emerald-700" : d.outbox[0].deliveryStatus === "failed" ? "shrink-0 font-semibold text-rose-700" : "shrink-0 text-muted"}>· {d.outbox[0].deliveryStatus === "sent" ? "Sent" : d.outbox[0].deliveryStatus === "failed" ? "Failed" : "Outbox only"}</span></p>}
          {s.status === "SUSPENDED" && s.pausedUntil && (
            <ActionButton url="/api/subscribers/resume" body={{ id: s.id }} className="btn-ghost mt-auto h-9 py-0 text-xs"><PlayCircle className="h-3.5 w-3.5" /> Resume now</ActionButton>
          )}
        </section>
      </div>
    </div>
  );
}
