import { listSubs } from "@/lib/queries";
import { SAMPLE_PREFIX } from "@/lib/sample";
import { ActionButton } from "@/components/client";
import { Badge, statusTone } from "@/components/ui";
import { AlertTriangle, PauseCircle, XCircle, CreditCard, RotateCcw, Radio, Zap, Users, Database, Trash2 } from "lucide-react";
import { ImportForm } from "./import-form";
import Link from "next/link";
import { Mail } from "lucide-react";
import { emailOn } from "@/lib/email";

export const dynamic = "force-dynamic";

const CASES = [
  { type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED", n: 1, title: "Payment failed", desc: "Recovery message plus a 7-day grace period, on top of PayPal's own retries.", icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
  { type: "BILLING.SUBSCRIPTION.SUSPENDED", n: 3, title: "Subscription suspended", desc: "A come-back offer with one-tap reactivation.", icon: PauseCircle, tone: "text-amber-600 bg-amber-50" },
  { type: "BILLING.SUBSCRIPTION.CANCELLED", n: 4, title: "Cancelled inside PayPal", desc: "A win-back message with a new subscription link, offer pre-applied.", icon: XCircle, tone: "text-violet-600 bg-violet-50" },
  { type: "PAYMENT.SALE.COMPLETED", n: 0, title: "Payment received", desc: "Closes a recovery: the failed payment went through.", icon: CreditCard, tone: "text-emerald-600 bg-emerald-50" },
];

export default async function Demo() {
  const subs = (await listSubs()).filter((s) => s.source !== "simulator");
  const practice = (await listSubs()).filter((s) => s.id.startsWith("DEMO-"));
  const sampleCount = (await listSubs()).filter((s) => s.id.startsWith(SAMPLE_PREFIX)).length;
  return (
    <div className="rise">
      <p className="eyebrow">For the demo video</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Demo console</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Fire PayPal events at Second Chance. <b>Via PayPal</b> uses PayPal&apos;s webhook simulator for a real, signed round trip. PayPal reuses one event id per type, so repeats are de-duplicated. <b>Replay</b> injects the same payload with a fresh id so you can run it again.</p>
      {emailOn() && (
        <p className="mt-3 inline-flex max-w-2xl items-start gap-2 rounded-xl bg-orange-50/70 px-3.5 py-2.5 text-sm text-ink-2 ring-1 ring-orange-100">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#e8743b]" />
          <span>Want to see the real email? Simulated and practice members have placeholder addresses, so use <b>Email this to me</b> on any message in the <Link href="/dashboard/outbox" className="font-medium underline underline-offset-2">Outbox</Link>, or on the offer in the practice cancel flow.</span>
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {CASES.map((c) => (
          <div key={c.type} className="card flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}><c.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-semibold">{c.n ? <span className="text-muted">Case {c.n} · </span> : null}{c.title}</p>
                <p className="mt-0.5 text-sm text-muted">{c.desc}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">{c.type}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-start gap-2">
              <ActionButton url="/api/demo/simulate" body={{ type: c.type, mode: "paypal" }} className="btn-primary"><Radio className="h-4 w-4" /> Via PayPal</ActionButton>
              <ActionButton url="/api/demo/simulate" body={{ type: c.type, mode: "local" }} className="btn-ghost"><Zap className="h-4 w-4" /> Replay</ActionButton>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Case 2 · Cancel on the merchant site</p>
            <p className="mt-0.5 text-sm text-muted">Sign in to the store as a member and press Cancel. Real sandbox subscribers go through PayPal; practice members ({practice.length ? practice.map((p) => p.name?.split(" ")[0]).join(", ") : "none yet"}) run the same flow without PayPal calls.</p>
          </div>
          <span className="flex gap-2">
            <ActionButton url="/api/demo/seed" className="btn-ghost"><Users className="h-4 w-4" /> {practice.length ? "Reset practice members" : "Add practice members"}</ActionButton>
            <a href="/store/account" className="btn-brand">Open account page</a>
          </span>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <p className="font-semibold">Real sandbox subscriptions</p>
        <p className="mt-0.5 text-sm text-muted">Drive a real subscription from outside the save flow, the way PayPal or the buyer would. Cancelling can&apos;t be undone.</p>
        <ul className="mt-4 divide-y divide-line">
          {subs.length === 0 && <li className="py-4 text-sm text-muted">None yet. Subscribe in the store or import one by id below.</li>}
          {subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-mono text-xs">{s.id}</span>
              <span className="text-sm">{s.name || s.email}</span>
              <Badge tone={statusTone(s.status)}>{s.status}</Badge>
              <span className="ml-auto flex gap-2">
                <ActionButton url="/api/demo/real" body={{ id: s.id, action: "suspend" }} className="btn-ghost !py-1.5 text-xs">Suspend in PayPal</ActionButton>
                <ActionButton url="/api/subscribers/resume" body={{ id: s.id }} className="btn-ghost !py-1.5 text-xs">Reactivate</ActionButton>
                <ActionButton url="/api/demo/real" body={{ id: s.id, action: "cancel" }} confirm={`Cancel ${s.id} in PayPal? This cannot be undone.`} className="btn-ghost !py-1.5 text-xs text-rose-700">Cancel as buyer</ActionButton>
              </span>
            </li>
          ))}
        </ul>
        <ImportForm />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-line p-5">
        <div>
          <p className="font-semibold">Sample history {sampleCount ? <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{sampleCount} members loaded</span> : null}</p>
          <p className="text-sm text-muted">A clearly labelled synthetic book of business (ids <code>SAMPLE-…</code>) so the grids, pivots and AG Studio have months of history to show. It never touches PayPal.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <ActionButton url="/api/demo/history" className="btn-ghost"><Database className="h-4 w-4" /> {sampleCount ? "Reload" : "Load"} sample history</ActionButton>
          {sampleCount ? <ActionButton url="/api/demo/history" method="DELETE" confirm="Remove all sample history? Live sandbox data stays." className="btn-ghost text-rose-700"><Trash2 className="h-4 w-4" /> Clear</ActionButton> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-line p-5">
        <div>
          <p className="font-semibold">Reset simulator data</p>
          <p className="text-sm text-muted">Removes simulator and replay events, practice members, and their offers and messages. Real sandbox subscribers stay.</p>
        </div>
        <ActionButton url="/api/demo/reset" className="btn-ghost"><RotateCcw className="h-4 w-4" /> Reset</ActionButton>
      </div>
    </div>
  );
}
