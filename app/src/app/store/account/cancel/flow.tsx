"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Heart, Loader2, PauseCircle, Percent, ArrowDownCircle, ExternalLink, Sparkles, Info, ChevronDown, ShieldCheck, Cpu } from "lucide-react";
import clsx from "clsx";
import { SendToMe } from "@/components/send-to-me";

type Reason = { id: string; label: string; hint: string };
type Offer = { id: string; kind: string; headline: string; message: string; priceMonthly: number | null; months: number | null; engine: string; rationale?: string | null };
type Result = { state: string; approveUrl?: string; detail: string };
type Sub = { name: string; plan: string; price: number; nextBill: string | null; months: number; paused?: boolean };
type Step = "reason" | "confirm" | "thinking" | "offer" | "working" | "result";

const KIND: Record<string, { icon: React.ComponentType<{ className?: string }>; chip: string }> = {
  pause: { icon: PauseCircle, chip: "Take a pause" },
  discount: { icon: Percent, chip: "A lower price" },
  downgrade: { icon: ArrowDownCircle, chip: "A lighter plan" },
  let_go: { icon: Heart, chip: "Goodbye for now" },
};

/** How the member put it, used in the plain-language "why this offer" note. */
const REASON_PHRASE: Record<string, string> = {
  too_expensive: "money is tight right now",
  not_using: "you haven't been using it much",
  taking_break: "you need a break",
  missing_features: "something you need is missing",
  technical: "you've had technical problems",
  switching: "you're moving to another studio",
  other: "",
};

const fmt = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const longDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" }) : null);

function ctaFor(o: Offer, sub: Sub) {
  if (o.kind === "pause") return `Pause for ${plural(o.months || 1, "month")}`;
  if (o.kind === "discount") return `Keep ${sub.plan.replace("Brightside ", "")} at ${fmt(o.priceMonthly ?? sub.price)}/month`;
  if (o.kind === "downgrade") return `Switch to Lite at ${fmt(o.priceMonthly ?? 15)}/month`;
  return "Confirm cancellation";
}

function whyText(o: Offer, sub: Sub, reason: string) {
  const said = REASON_PHRASE[reason] ? `You told us ${REASON_PHRASE[reason]}. ` : "";
  const loyal = sub.months >= 6 ? `You've practised with us for ${plural(sub.months, "month")}, so ` : "";
  switch (o.kind) {
    case "pause": return `${said}A pause keeps your spot and your progress without charging you, and it picks back up on its own.`;
    case "discount": return `${said}${loyal || "So "}we'd rather lower your price for a while than lose you.`;
    case "downgrade": return `${said}Lite keeps the on-demand library and two live classes a week for less.`;
    default: return `${said}From what you shared, an offer probably isn't what you need, so we won't push one.`;
  }
}

/** "llm:nebius:Qwen/Qwen3-30B-A3B-Instruct-2507" → "Qwen3-30B-A3B on Nebius AI Studio". */
function engineName(engine: string) {
  if (engine.startsWith("llm:")) {
    const [, provider, model = ""] = engine.split(":");
    const m = model.split("/").pop()!.replace(/-Instruct.*$/, "");
    const p = ({ nebius: "Nebius AI Studio", openai: "OpenAI", xai: "xAI", custom: "a custom endpoint" } as Record<string, string>)[provider] || provider;
    return { ai: true, label: `${m || "LLM"} on ${p}` };
  }
  if (engine.includes("fallback")) return { ai: false, label: "Rules engine (the AI model didn't answer in time)" };
  return { ai: false, label: "Rules engine (no AI key, or over the demo's AI limit)" };
}

export function CancelFlow({ reasons, sub, practice = false, canEmailMe = false }: { reasons: Reason[]; sub: Sub; practice?: boolean; canEmailMe?: boolean }) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<string>("");
  const [text, setText] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [needReason, setNeedReason] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const accessUntil = longDate(sub.nextBill);

  // Move focus to each new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => { if (step !== "working") headRef.current?.focus(); }, [step]);

  async function getOffer() {
    if (!reason) { setNeedReason(true); return; }
    setStep("thinking"); setErr("");
    const t0 = Date.now();
    try {
      const r = await fetch("/api/save/offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, reasonText: text || undefined }) });
      const j = await r.json().catch(() => ({}));
      await new Promise((res) => setTimeout(res, Math.max(0, 1100 - (Date.now() - t0))));
      if (!r.ok || !j.offer) throw new Error(j.error);
      setOffer(j.offer); setStep("offer");
    } catch {
      setErr("We couldn't load your options just now. Please try again, or cancel without an offer below.");
      setStep("reason");
    }
  }
  async function act(kind: "accept" | "decline") {
    setStep("working"); setErr("");
    try {
      const r = await fetch(`/api/save/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: offer!.id }) });
      const j: Result = await r.json();
      if (j.state === "error") throw new Error(j.detail);
      setResult(j); setStep("result");
    } catch (e) {
      setErr((e as Error).message ? `That didn't go through: ${(e as Error).message}` : "That didn't go through. Please try again.");
      setStep("offer");
    }
  }
  async function cancelNow() {
    setStep("working"); setErr("");
    try {
      const r = await fetch("/api/save/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason || undefined, reasonText: text || undefined }) });
      const j: Result = await r.json();
      if (j.state === "error") throw new Error(j.detail);
      setOffer(null); setResult(j); setStep("result");
    } catch (e) {
      setErr((e as Error).message ? `That didn't go through: ${(e as Error).message}` : "That didn't go through. Please try again.");
      setStep("confirm");
    }
  }

  const working = step === "working";
  return (
    <div>
      {step !== "result" && <Link href="/store/account" className="inline-flex items-center gap-1.5 rounded-full text-sm text-warm-muted hover:text-warm"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to my membership</Link>}
      <Steps step={step} />

      {step === "reason" && (
        <section aria-labelledby="step-h" className="rise mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 sm:p-8">
          <h1 id="step-h" ref={headRef} tabIndex={-1} className="font-serif text-3xl leading-tight">We&apos;re sorry to see you go, {sub.name}</h1>
          <p className="mt-2 leading-relaxed text-[#6b5a4c]">What&apos;s behind it? Your answer helps us suggest something that might work better, or do better next time.</p>
          <fieldset className="mt-6">
            <legend className="sr-only">Why are you cancelling?</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {reasons.map((r) => {
                const on = reason === r.id;
                return (
                  <label key={r.id}
                    className={clsx("relative flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#b14c1b]",
                      on ? "bg-sun-soft ring-2 ring-[#c2551f]" : "ring-orange-100 hover:bg-orange-50/50 hover:ring-orange-200")}>
                    <input type="radio" name="reason" value={r.id} checked={on} onChange={() => { setReason(r.id); setNeedReason(false); }} className="peer sr-only" />
                    <span aria-hidden className={clsx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition", on ? "border-[#c2551f] bg-[#c2551f] text-white" : "border-orange-200 bg-white")}>
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block font-semibold">{r.label}</span>
                      <span className="block text-sm text-warm-muted">{r.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label htmlFor="reason-text" className="mt-5 block text-sm font-medium">Anything else you&apos;d like us to know? <span className="font-normal text-warm-muted">(optional)</span></label>
          <textarea id="reason-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} placeholder={reason === "other" ? "Tell us in your own words" : "e.g. I'm travelling until spring"}
            className="mt-2 w-full resize-none rounded-2xl border-0 bg-cream p-4 text-sm ring-1 ring-orange-100 outline-none placeholder:text-[#8a7868] focus:ring-2 focus:ring-[#c2551f]" />
          <div aria-live="polite">
            {err && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-100">{err}</p>}
            {needReason && !reason && <p className="mt-4 text-sm text-sun-ink">Pick the reason that fits best, or cancel without an offer below.</p>}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/store/account" className="btn-warm-link self-center sm:self-auto">Never mind, keep my membership</Link>
            <button onClick={getOffer} aria-disabled={!reason} className={clsx("btn-warm !px-6 !py-3", !reason && "opacity-60")}>See my options</button>
          </div>
          <div className="mt-6 border-t border-orange-100 pt-5 text-center text-sm text-warm-muted">
            Just want to cancel? <button onClick={() => { setErr(""); setStep("confirm"); }} className="font-semibold text-warm underline underline-offset-4 hover:text-sun-ink">Cancel without an offer</button>
          </div>
        </section>
      )}

      {(step === "confirm" || (working && !offer)) && (
        <section aria-labelledby="step-h" className="rise mt-6 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-orange-100 sm:p-10">
          <h1 id="step-h" ref={headRef} tabIndex={-1} className="font-serif text-3xl">Cancel your {sub.plan} membership?</h1>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-[#6b5a4c]">
            {sub.paused ? "Your paused membership will end and won't restart." : <>There won&apos;t be any more charges{accessUntil ? <>, and you keep access until <span className="font-semibold text-warm">{accessUntil}</span></> : null}.</>} You can rejoin anytime.
          </p>
          {err && <p role="alert" className="mx-auto mt-4 max-w-md rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-100">{err}</p>}
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
            <button onClick={cancelNow} disabled={working} className="btn-warm !py-3 text-base">{working && <Loader2 className="h-4 w-4 animate-spin" />} {working ? "Cancelling…" : "Yes, cancel my membership"}</button>
            <Link href="/store/account" className="btn-warm-outline !py-3">Keep my membership</Link>
            <button onClick={() => setStep("reason")} disabled={working} className="btn-warm-link mt-1">Back</button>
          </div>
        </section>
      )}

      {step === "thinking" && (
        <section aria-labelledby="step-h" aria-busy="true" className="rise mt-6 flex flex-col items-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-orange-100 sm:p-14">
          <span aria-hidden className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sun-soft"><Sparkles className="h-6 w-6 text-sun-ink" /><span className="absolute inset-0 animate-ping rounded-full bg-orange-200/50" /></span>
          <h1 id="step-h" ref={headRef} tabIndex={-1} className="mt-5 font-serif text-2xl" role="status">Finding the best option for you…</h1>
          <p className="mt-1 text-sm text-warm-muted">Looking at your plan, your history and what you told us</p>
          <div aria-hidden className="mt-7 w-full max-w-sm space-y-2.5">
            <div className="shimmer h-3 rounded-full" /><div className="shimmer h-3 w-4/5 rounded-full" /><div className="shimmer h-3 w-3/5 rounded-full" />
          </div>
        </section>
      )}

      {(step === "offer" || (working && offer)) && offer && (
        <OfferCard offer={offer} sub={sub} reason={reason} practice={practice} canEmailMe={canEmailMe} working={working} err={err} headRef={headRef}
          onAccept={() => act("accept")} onDecline={() => act("decline")} onBack={() => { setErr(""); setStep("reason"); }} accessUntil={accessUntil} />
      )}

      {step === "result" && result && <ResultCard result={result} offer={offer} sub={sub} accessUntil={accessUntil} headRef={headRef} />}
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const idx = step === "reason" || step === "confirm" ? 0 : step === "result" ? 2 : 1;
  return (
    <ol aria-label="Progress" className="mt-6 flex items-center gap-2 text-xs font-medium text-warm-muted">
      {["Tell us why", "Your options", "Done"].map((l, i) => (
        <li key={l} aria-current={i === idx ? "step" : undefined} className="flex items-center gap-2">
          <span aria-hidden className={clsx("flex h-5 w-5 items-center justify-center rounded-full text-[10px]", i < idx ? "bg-[#c2551f] text-white" : i === idx ? "bg-warm text-white" : "bg-orange-100 text-warm-muted")}>
            {i < idx ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
          </span>
          <span className={clsx(i === idx ? "text-warm" : "hidden sm:inline")}>{l}</span>
          {i < 2 && <span aria-hidden className={clsx("mx-1 h-px w-6 sm:w-8", i < idx ? "bg-[#c2551f]" : "bg-orange-200")} />}
        </li>
      ))}
    </ol>
  );
}

function OfferCard({ offer, sub, reason, practice, canEmailMe, working, err, headRef, onAccept, onDecline, onBack, accessUntil }: {
  offer: Offer; sub: Sub; reason: string; practice: boolean; canEmailMe: boolean; working: boolean; err: string; headRef: React.RefObject<HTMLHeadingElement | null>;
  onAccept: () => void; onDecline: () => void; onBack: () => void; accessUntil: string | null;
}) {
  const k = KIND[offer.kind] || KIND.discount;
  const Icon = k.icon;
  const isLetGo = offer.kind === "let_go";
  const [why, setWhy] = useState(false);
  const [clicked, setClicked] = useState<"accept" | "decline" | null>(null);
  const eng = engineName(offer.engine);
  return (
    <>
      <section aria-labelledby="step-h" className="rise mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-orange-900/10 ring-1 ring-orange-100">
        <div className="bg-gradient-to-br from-[#fde7d3] via-[#fff1e3] to-white px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-sun-ink ring-1 ring-orange-200"><Icon aria-hidden className="h-3.5 w-3.5" /> {k.chip}</p>
          <h1 id="step-h" ref={headRef} tabIndex={-1} className="mt-4 font-serif text-3xl leading-tight">{offer.headline}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-warm-2">{offer.message}</p>
          <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why} aria-controls="why-note"
            className="mt-4 inline-flex items-center gap-1 rounded-full text-xs font-medium text-warm-muted hover:text-warm">
            <Info aria-hidden className="h-3.5 w-3.5" /> Why this offer? <ChevronDown aria-hidden className={clsx("h-3.5 w-3.5 transition", why && "rotate-180")} />
          </button>
          {why && (
            <div id="why-note" className="mt-2 rounded-2xl bg-white/80 p-3.5 text-sm leading-relaxed text-warm-2 ring-1 ring-orange-100">
              <p>{whyText(offer, sub, reason)}</p>
              <p className="mt-1.5 text-xs text-warm-muted">Suggested by Brightside&apos;s assistant, within limits the studio sets. It never changes anything until you say yes.</p>
            </div>
          )}
        </div>
        {!isLetGo && (
          <dl className="grid grid-cols-2 gap-px bg-orange-100">
            <div className="bg-white px-6 py-5 sm:px-8"><dt className="text-xs text-warm-muted">{sub.paused ? "Your plan" : "You pay now"}</dt><dd className="mt-0.5 text-lg font-semibold">{fmt(sub.price)}<span className="text-sm font-normal text-warm-muted"> / month</span></dd></div>
            <div className="bg-white px-6 py-5 sm:px-8">
              <dt className="text-xs text-warm-muted">With this offer</dt>
              <dd className="mt-0.5 text-lg font-semibold text-sun-ink">
                {offer.kind === "pause" ? `$0 for ${plural(offer.months || 1, "month")}` : `${fmt(offer.priceMonthly ?? sub.price)} / month`}
              </dd>
              {offer.kind === "discount" && offer.months ? <dd className="text-xs text-warm-muted">for {plural(offer.months, "month")}, then {fmt(sub.price)}</dd> : null}
              {offer.kind === "downgrade" ? <dd className="text-xs text-warm-muted">switch back anytime</dd> : null}
              {offer.kind === "pause" ? <dd className="text-xs text-warm-muted">then it picks back up on its own</dd> : null}
            </div>
          </dl>
        )}
        <div className="flex flex-col gap-3 px-6 py-6 sm:px-8">
          {err && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-100">{err}</p>}
          <button onClick={() => { setClicked("accept"); onAccept(); }} disabled={working} className={clsx(isLetGo ? "btn-warm" : "btn-sun", "!py-3 text-base")}>
            {working && clicked === "accept" && <Loader2 className="h-4 w-4 animate-spin" />} {ctaFor(offer, sub)}
          </button>
          {isLetGo ? (
            <Link href="/store/account" className="btn-warm-outline !py-3">Actually, keep my membership</Link>
          ) : (
            <button onClick={() => { setClicked("decline"); onDecline(); }} disabled={working} className="btn-warm-outline !py-3">
              {working && clicked === "decline" && <Loader2 className="h-4 w-4 animate-spin" />} No thanks, cancel my membership
            </button>
          )}
          <p className="text-center text-xs leading-relaxed text-warm-muted">
            {offer.kind === "discount" || offer.kind === "downgrade" ? "If you accept, you'll confirm the new price securely in PayPal. " : null}
            {offer.kind === "pause" ? "No charges while you're paused. Resume anytime from your account. " : null}
            {!sub.paused && accessUntil ? `If you cancel, you keep access until ${accessUntil}.` : null}
          </p>
          <button onClick={onBack} disabled={working} className="btn-warm-link self-center text-xs">Change my answer</button>
          {canEmailMe && !isLetGo && <div className="mt-1 flex justify-center border-t border-orange-100 pt-4"><SendToMe offerId={offer.id} /></div>}
        </div>
      </section>
      {practice && <BehindTheScenes offer={offer} sub={sub} reason={reason} eng={eng} />}
    </>
  );
}

/** Practice members only: shows a judge what Second Chance decided and why, outside the member's own card. */
function BehindTheScenes({ offer, sub, reason, eng }: { offer: Offer; sub: Sub; reason: string; eng: { ai: boolean; label: string } }) {
  const paypal = ({
    pause: "POST /v1/billing/subscriptions/{id}/suspend, then auto-resume by cron",
    discount: "POST …/revise to the discounted plan; the buyer approves in PayPal",
    downgrade: "POST …/revise to the Lite plan; the buyer approves in PayPal",
    let_go: "POST …/cancel",
  } as Record<string, string>)[offer.kind];
  return (
    <details open className="group mt-5 rounded-2xl border border-dashed border-orange-200 bg-white/60 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold text-warm">
        <Cpu aria-hidden className="h-4 w-4 text-sun-ink" /> Demo · what Second Chance decided
        <ChevronDown aria-hidden className="ml-auto h-4 w-4 text-warm-muted transition group-open:rotate-180" />
      </summary>
      <dl className="grid gap-x-6 gap-y-3 border-t border-dashed border-orange-200 px-5 py-4 sm:grid-cols-[9rem_1fr]">
        <dt className="text-warm-muted">Signals</dt>
        <dd>Reason: {reason.replace(/_/g, " ") || "none"} · member {plural(sub.months, "month")} · {sub.plan} at {fmt(sub.price)}</dd>
        <dt className="text-warm-muted">Picked by</dt>
        <dd className="flex items-center gap-1.5">{eng.ai && <Sparkles aria-hidden className="h-3.5 w-3.5 text-sun-ink" />}{eng.label}</dd>
        {offer.rationale && (<><dt className="text-warm-muted">Its reasoning</dt><dd className="italic text-warm-2">&ldquo;{offer.rationale}&rdquo;</dd></>)}
        <dt className="text-warm-muted">Guardrails</dt>
        <dd className="flex items-start gap-1.5"><ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" /> Checked: price ≥ 40% of list, discounts ≤ 6 months, pauses ≤ 3 months, only cancel-page offer types</dd>
        {paypal && (<><dt className="text-warm-muted">On a real subscription</dt><dd className="font-mono text-xs leading-relaxed text-warm-2">{paypal}</dd></>)}
      </dl>
      <p className="border-t border-dashed border-orange-200 px-5 py-3 text-xs text-warm-muted">Shown only for practice members. Real subscribers just see the offer.</p>
    </details>
  );
}

function ResultCard({ result, offer, sub, accessUntil, headRef }: { result: Result; offer: Offer | null; sub: Sub; accessUntil: string | null; headRef: React.RefObject<HTMLHeadingElement | null> }) {
  const saved = result.state === "saved", pending = result.state === "pending_consent";
  const title = saved
    ? offer?.kind === "pause" ? "Enjoy the break" : offer?.kind === "downgrade" ? "You're on Lite now" : `You're all set, ${sub.name}`
    : pending ? "Almost there" : "Your membership is cancelled";
  const terms = saved && offer ? (offer.kind === "discount" ? `${fmt(offer.priceMonthly ?? sub.price)}/month for ${plural(offer.months || 1, "month")}, then ${fmt(sub.price)}`
    : offer.kind === "downgrade" ? `Lite at ${fmt(offer.priceMonthly ?? 15)}/month, switch back anytime` : null) : null;
  return (
    <section aria-labelledby="step-h" className="rise mt-6 rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-orange-100 sm:p-10">
      <span aria-hidden className={clsx("mx-auto flex h-14 w-14 items-center justify-center rounded-full", saved || pending ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-sun-ink")}>
        {saved || pending ? <Check className="h-7 w-7" /> : <Heart className="h-7 w-7" />}
      </span>
      <h1 id="step-h" ref={headRef} tabIndex={-1} className="mt-5 font-serif text-3xl">{title}</h1>
      <p role="status" className="mx-auto mt-2 max-w-md leading-relaxed text-[#6b5a4c]">
        {saved ? result.detail
          : pending ? "Confirm your new price in PayPal and you're done. It takes about ten seconds."
          : <>Thank you for practising with us.{!sub.paused && accessUntil ? <> You keep access until <span className="font-semibold text-warm">{accessUntil}</span>, and there won&apos;t be any more charges.</> : " There won't be any more charges."}</>}
      </p>
      {terms && <p className="mx-auto mt-4 inline-block rounded-2xl bg-sun-soft px-4 py-2 text-sm font-semibold text-[#8c3b2a]">{terms}</p>}
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {pending && result.approveUrl && <a href={result.approveUrl} className="btn-sun !px-6 !py-3">Confirm in PayPal <ExternalLink aria-hidden className="h-4 w-4" /></a>}
        {!saved && !pending && <Link href="/store#pricing" className="btn-sun !px-6 !py-3">Changed your mind? Rejoin</Link>}
        <Link href="/store/account" className="btn-warm-outline !px-6 !py-3">Back to my membership</Link>
      </div>
    </section>
  );
}
