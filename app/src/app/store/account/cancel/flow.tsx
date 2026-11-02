"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Heart, Loader2, PauseCircle, Percent, ArrowDownCircle, ExternalLink, Sparkles } from "lucide-react";
import clsx from "clsx";

type Reason = { id: string; label: string; hint: string };
type Offer = { id: string; kind: string; headline: string; message: string; priceMonthly: number | null; months: number | null; engine: string };
type Result = { state: string; approveUrl?: string; detail: string };

const KIND = {
  pause: { icon: PauseCircle, cta: "Pause my membership", chip: "Pause" },
  discount: { icon: Percent, cta: "Keep my membership at this price", chip: "Special price" },
  downgrade: { icon: ArrowDownCircle, cta: "Switch to Lite", chip: "Lighter plan" },
  let_go: { icon: Heart, cta: "Confirm cancellation", chip: "Goodbye for now" },
} as Record<string, { icon: any; cta: string; chip: string }>;

const fmt = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

export function CancelFlow({ reasons, sub }: { reasons: Reason[]; sub: { name: string; plan: string; price: number; nextBill: string | null } }) {
  const [step, setStep] = useState<"reason" | "thinking" | "offer" | "working" | "result">("reason");
  const [reason, setReason] = useState<string>("");
  const [text, setText] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  async function getOffer() {
    setStep("thinking"); setErr("");
    const t0 = Date.now();
    const r = await fetch("/api/save/offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, reasonText: text || undefined }) });
    const j = await r.json();
    await new Promise((res) => setTimeout(res, Math.max(0, 1100 - (Date.now() - t0))));
    if (!r.ok) { setErr(j.error || "Something went wrong"); setStep("reason"); return; }
    setOffer(j.offer); setStep("offer");
  }
  async function act(kind: "accept" | "decline") {
    setStep("working");
    const r = await fetch(`/api/save/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: offer!.id }) });
    const j: Result = await r.json();
    if (j.state === "error") { setErr(j.detail); setStep("offer"); return; }
    setResult(j); setStep("result");
  }

  return (
    <div>
      <Link href="/store/account" className="inline-flex items-center gap-1.5 text-sm text-[#8a7868] hover:text-[#2a2018]"><ArrowLeft className="h-4 w-4" /> Back to my membership</Link>
      <Steps step={step} />

      {step === "reason" && (
        <section className="rise mt-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-orange-100">
          <h1 className="font-serif text-3xl">We&apos;re sorry to see you go, {sub.name}</h1>
          <p className="mt-2 text-[#6b5a4c]">Mind telling us why? It helps us find something that works for you, or do better next time.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {reasons.map((r) => (
              <button key={r.id} onClick={() => setReason(r.id)}
                className={clsx("rounded-2xl p-4 text-left ring-1 transition", reason === r.id ? "bg-sun-soft ring-2 ring-sun" : "ring-orange-100 hover:bg-orange-50/50 hover:ring-orange-200")}>
                <span className="flex items-center justify-between font-semibold">{r.label}{reason === r.id && <Check className="h-4 w-4 text-sun" />}</span>
                <span className="text-sm text-[#8a7868]">{r.hint}</span>
              </button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Anything else? (optional)"
            className="mt-4 w-full resize-none rounded-2xl border-0 bg-[#fffaf4] p-4 text-sm ring-1 ring-orange-100 outline-none focus:ring-2 focus:ring-sun" />
          {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
          <div className="mt-6 flex items-center justify-between">
            <Link href="/store/account" className="btn-link">Never mind, keep my membership</Link>
            <button disabled={!reason} onClick={getOffer} className="btn-primary !bg-[#2a2018]">Continue</button>
          </div>
        </section>
      )}

      {step === "thinking" && (
        <section className="rise mt-6 flex flex-col items-center rounded-3xl bg-white p-14 text-center shadow-sm ring-1 ring-orange-100">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sun-soft"><Sparkles className="h-6 w-6 text-sun" /><span className="absolute inset-0 animate-ping rounded-full bg-orange-200/50" /></span>
          <p className="mt-5 font-serif text-2xl">Finding the best option for you…</p>
          <p className="mt-1 text-sm text-[#8a7868]">Looking at your plan and history</p>
        </section>
      )}

      {(step === "offer" || step === "working") && offer && (
        <OfferCard offer={offer} sub={sub} working={step === "working"} err={err} onAccept={() => act("accept")} onDecline={() => act("decline")} />
      )}

      {step === "result" && result && <ResultCard result={result} offer={offer!} />}
    </div>
  );
}

function Steps({ step }: { step: string }) {
  const idx = step === "reason" ? 0 : step === "result" ? 2 : 1;
  return (
    <ol className="mt-6 flex items-center gap-2 text-xs font-medium text-[#8a7868]">
      {["Tell us why", "Your options", "Done"].map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full text-[10px]", i <= idx ? "bg-[#2a2018] text-white" : "bg-orange-100")}>{i + 1}</span>
          <span className={i === idx ? "text-[#2a2018]" : ""}>{l}</span>
          {i < 2 && <span className="mx-1 h-px w-8 bg-orange-200" />}
        </li>
      ))}
    </ol>
  );
}

function OfferCard({ offer, sub, working, err, onAccept, onDecline }: { offer: Offer; sub: { price: number }; working: boolean; err: string; onAccept: () => void; onDecline: () => void }) {
  const k = KIND[offer.kind] || KIND.discount;
  const Icon = k.icon;
  const isLetGo = offer.kind === "let_go";
  return (
    <section className="rise mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-orange-900/10 ring-1 ring-orange-100">
      <div className="bg-gradient-to-br from-[#fde7d3] via-[#fff1e3] to-white px-8 pb-6 pt-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-sun ring-1 ring-orange-200"><Icon className="h-3.5 w-3.5" /> {k.chip}</span>
        <h2 className="mt-4 font-serif text-3xl leading-tight">{offer.headline}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#4a3b2f]">{offer.message}</p>
      </div>
      {!isLetGo && (
        <div className="grid grid-cols-2 gap-px bg-orange-100">
          <div className="bg-white px-8 py-5"><p className="text-xs text-[#8a7868]">Today</p><p className="mt-0.5 text-lg font-semibold">{fmt(sub.price)}<span className="text-sm font-normal text-[#8a7868]"> / month</span></p></div>
          <div className="bg-white px-8 py-5">
            <p className="text-xs text-[#8a7868]">With this offer</p>
            <p className="mt-0.5 text-lg font-semibold text-sun">
              {offer.kind === "pause" ? `$0 for ${offer.months || 1} month${(offer.months || 1) > 1 ? "s" : ""}` : `${fmt(offer.priceMonthly ?? sub.price)} / month`}
            </p>
            {offer.kind === "discount" && offer.months ? <p className="text-xs text-[#8a7868]">for {offer.months} months, then {fmt(sub.price)}</p> : null}
            {offer.kind === "downgrade" ? <p className="text-xs text-[#8a7868]">switch back anytime</p> : null}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 px-8 py-6">
        {err && <p className="text-sm text-rose-700">{err}</p>}
        <button onClick={onAccept} disabled={working} className={isLetGo ? "btn-primary !bg-[#2a2018] !py-3" : "btn-sun !py-3 text-base"}>
          {working && <Loader2 className="h-4 w-4 animate-spin" />} {k.cta}
        </button>
        {!isLetGo && <button onClick={onDecline} disabled={working} className="btn-link self-center">No thanks, cancel my membership</button>}
        {(offer.kind === "discount" || offer.kind === "downgrade") && <p className="text-center text-xs text-[#8a7868]">You&apos;ll confirm the new price securely in PayPal.</p>}
      </div>
    </section>
  );
}

function ResultCard({ result, offer }: { result: Result; offer: Offer }) {
  const saved = result.state === "saved", pending = result.state === "pending_consent";
  return (
    <section className="rise mt-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-orange-100">
      <span className={clsx("mx-auto flex h-14 w-14 items-center justify-center rounded-full", saved || pending ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-sun")}>
        {saved || pending ? <Check className="h-7 w-7" /> : <Heart className="h-7 w-7" />}
      </span>
      <h2 className="mt-5 font-serif text-3xl">
        {saved ? (offer.kind === "pause" ? "You're all set: membership paused" : "You're all set") : pending ? "Almost there" : "Your membership is cancelled"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[#6b5a4c]">
        {saved ? result.detail : pending ? "Confirm your new price in PayPal and you're done. It takes ten seconds." : "Thank you for practising with us. You'll keep access until the end of your billing period."}
      </p>
      <div className="mt-7 flex justify-center gap-3">
        {pending && result.approveUrl && <a href={result.approveUrl} className="btn-sun !px-6 !py-3">Confirm in PayPal <ExternalLink className="h-4 w-4" /></a>}
        <Link href="/store/account" className="btn-ghost !border-orange-200">Back to my membership</Link>
      </div>
    </section>
  );
}
