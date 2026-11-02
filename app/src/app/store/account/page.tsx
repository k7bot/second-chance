import Link from "next/link";
import { CalendarDays, CreditCard, PauseCircle, Sparkles, Wallet, CheckCircle2, Clock } from "lucide-react";
import { currentSubId } from "@/lib/session";
import { getSub, reconcile } from "@/lib/retention";
import { listSubs, offersForSub } from "@/lib/queries";
import { fmtDate, money, Avatar } from "@/components/ui";
import { offerTerms } from "@/lib/email/templates";
import { SignInList, SignOut } from "./signin";
import { ActionButton } from "@/components/client";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-emerald-100 text-emerald-800" },
  SUSPENDED: { label: "Paused", cls: "bg-amber-100 text-amber-900" },
  CANCELLED: { label: "Cancelled", cls: "bg-stone-200 text-stone-700" },
  EXPIRED: { label: "Ended", cls: "bg-stone-200 text-stone-700" },
  APPROVAL_PENDING: { label: "Awaiting PayPal approval", cls: "bg-sky-100 text-sky-900" },
};
const DAY = 86_400_000;
const tenure = (start: Date | null) => (start ? Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / (30.44 * DAY))) : null);

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const subId = await currentSubId();
  const s = subId ? (sp.offer ? await reconcile(subId) : await getSub(subId)) : undefined;

  if (!s) {
    const all = await listSubs();
    // Practice members first, then real sandbox buyers. Synthetic SAMPLE history and simulator stubs stay out of the list.
    const candidates = all
      .filter((x) => x.id.startsWith("DEMO-") || (x.source !== "simulator" && x.source !== "sample" && !x.id.startsWith("SAMPLE-")))
      .sort((a, b) => Number(b.id.startsWith("DEMO-")) - Number(a.id.startsWith("DEMO-")) || a.id.localeCompare(b.id));
    return (
      <main className="mx-auto max-w-xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-serif text-4xl">Sign in to Brightside</h1>
        <p className="mt-3 leading-relaxed text-[#6b5a4c]">
          This is a demo, so there&apos;s no password. Pick a practice member to try the cancel flow, or{" "}
          <Link href="/store#pricing" className="font-medium text-sun-ink underline underline-offset-2">subscribe with a PayPal sandbox account</Link>.
        </p>
        <SignInList subs={candidates.map((c) => ({ id: c.id, name: c.name, email: c.email, status: c.status, plan: c.planName, practice: c.id.startsWith("DEMO-"), months: tenure(c.startTime) }))} />
      </main>
    );
  }

  const offers = await offersForSub(s.id);
  const pending = offers.find((o) => o.status === "pending_consent" && o.approveUrl && o.trigger === "merchant_cancel");
  // The most recent save the member accepted on the cancel page (shown as a reminder of what they agreed to).
  const lastSave = s.status === "ACTIVE" ? offers.find((o) => o.trigger === "merchant_cancel" && o.status === "saved" && (o.kind === "discount" || o.kind === "downgrade")) : undefined;
  const st = STATUS_COPY[s.status] || { label: s.status, cls: "bg-stone-200 text-stone-700" };
  const first = (s.name || "").split(" ")[0] || "friend";
  const practice = s.id.startsWith("DEMO-");
  const ended = s.status === "CANCELLED" || s.status === "EXPIRED";
  const dateRow = s.status === "SUSPENDED"
    ? { k: "Paused until", v: fmtDate(s.pausedUntil), icon: PauseCircle }
    : ended ? { k: "Access until", v: fmtDate(s.nextBillingAt), icon: Clock }
    : { k: "Next payment", v: fmtDate(s.nextBillingAt), icon: CalendarDays };

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-14">
      <div aria-live="polite">
        {sp.welcome && <Banner tone="green">Welcome to Brightside! Your membership is set up through PayPal.</Banner>}
        {sp.offer && !sp.declined && pending && <Banner tone="blue">Thanks! PayPal is confirming your new price. This page updates once it does.</Banner>}
      </div>
      <div className="flex items-center gap-4">
        <Avatar name={s.name} className="!h-12 !w-12 text-base" />
        <div className="min-w-0">
          <h1 className="font-serif text-3xl sm:text-4xl">Hi, {first}</h1>
          <p className="truncate text-sm text-warm-muted">{s.email}</p>
        </div>
        <div className="ml-auto shrink-0"><SignOut /></div>
      </div>

      {pending && (
        <div className="rise mt-8 flex flex-wrap items-center gap-4 rounded-3xl bg-white p-6 shadow-sm ring-2 ring-[#c2551f]">
          <Sparkles aria-hidden className="h-6 w-6 text-sun" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{pending.headline}</p>
            <p className="text-sm text-[#6b5a4c]">One last step: confirm the new price in PayPal.</p>
          </div>
          <a href={pending.approveUrl!} className="btn-sun">Confirm in PayPal</a>
        </div>
      )}

      <section aria-labelledby="membership-h" className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-orange-100">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#fde7d3] to-[#fff4e8] px-6 py-6 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-muted">Your membership</p>
            <h2 id="membership-h" className="mt-1 font-serif text-3xl">{s.planName}</h2>
          </div>
          <span className={`mt-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-3 sm:px-7">
          <Info icon={CreditCard} k="Price" v={`${money(lastSave?.priceMonthly != null && lastSave.priceMonthly < s.priceMonthly ? lastSave.priceMonthly : s.priceMonthly, { cents: true })} / month`}
            note={lastSave?.priceMonthly != null && lastSave.priceMonthly < s.priceMonthly ? `usually ${money(s.priceMonthly, { cents: true })}` : undefined} />
          <Info icon={dateRow.icon} k={dateRow.k} v={dateRow.v} />
          <Info icon={Wallet} k="Billed through" v="PayPal" />
        </dl>
        {lastSave && (
          <p className="mx-6 mb-6 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100 sm:mx-7">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">Your offer is on:</span> {offerTerms(lastSave, s.priceMonthly)}.</span>
          </p>
        )}
        {s.status === "SUSPENDED" && (
          <p className="mx-6 mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100 sm:mx-7">
            Your membership is on pause, so there are no charges until {fmtDate(s.pausedUntil)}. It picks back up on its own, or you can resume now.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-orange-100 px-6 py-5 sm:px-7">
          {s.status === "SUSPENDED" && <ActionButton url="/api/subscribers/resume" body={{ id: s.id }} className="btn-sun">Resume membership</ActionButton>}
          {s.status === "ACTIVE" && <Link href="/store#classes" className="btn-warm-outline">Browse classes</Link>}
          {["ACTIVE", "SUSPENDED"].includes(s.status) && (
            <Link href="/store/account/cancel" className="btn-warm-link ml-auto">Cancel membership</Link>
          )}
          {ended && (
            <>
              <p className="text-sm text-[#6b5a4c]">Your membership has ended. We&apos;d love to see you back on the mat.</p>
              <Link href="/store#pricing" className="btn-sun ml-auto">Rejoin Brightside</Link>
            </>
          )}
        </div>
      </section>
      <p className="mt-4 text-[11px] text-[#7a6858]">
        {practice ? <>Practice member for the demo: nothing here touches PayPal or charges anyone.</> : <>PayPal subscription <span className="font-mono">{s.id}</span></>}
      </p>
    </main>
  );
}

function Banner({ tone, children }: { tone: "green" | "blue"; children: React.ReactNode }) {
  const cls = tone === "green" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-sky-50 text-sky-900 ring-sky-200";
  return <div role="status" className={`rise mb-6 rounded-2xl p-4 text-sm ring-1 ${cls}`}>{children}</div>;
}

function Info({ icon: Icon, k, v, note }: { icon: React.ComponentType<{ className?: string }>; k: string; v: string; note?: string }) {
  return (
    <div className="last:col-span-2 sm:last:col-span-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-warm-muted"><Icon aria-hidden className="h-3.5 w-3.5" /> {k}</dt>
      <dd className="mt-1 font-semibold">{v}</dd>
      {note && <dd className="text-xs text-warm-muted">{note}</dd>}
    </div>
  );
}
