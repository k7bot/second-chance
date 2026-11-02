import Link from "next/link";
import { CalendarDays, CreditCard, PauseCircle, Sparkles } from "lucide-react";
import { currentSubId } from "@/lib/session";
import { getSub, reconcile } from "@/lib/retention";
import { listSubs, offersForSub } from "@/lib/queries";
import { fmtDate, money, Avatar } from "@/components/ui";
import { SignInList, SignOut } from "./signin";
import { ActionButton } from "@/components/client";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-emerald-100 text-emerald-800" },
  SUSPENDED: { label: "Paused", cls: "bg-amber-100 text-amber-800" },
  CANCELLED: { label: "Cancelled", cls: "bg-stone-200 text-stone-700" },
  APPROVAL_PENDING: { label: "Awaiting PayPal approval", cls: "bg-sky-100 text-sky-800" },
};

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const subId = await currentSubId();
  const s = subId ? (sp.offer ? await reconcile(subId) : await getSub(subId)) : undefined;

  if (!s) {
    const all = await listSubs();
    const candidates = all.filter((x) => x.source !== "simulator" || x.id.startsWith("DEMO-"));
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-serif text-4xl">Welcome back</h1>
        <p className="mt-2 text-[#6b5a4c]">Demo sign-in: pick a sandbox member, or <Link href="/store#pricing" className="text-sun underline underline-offset-2">subscribe with PayPal</Link>.</p>
        <SignInList subs={candidates.map((c) => ({ id: c.id, name: c.name, email: c.email, status: c.status, plan: c.planName, practice: c.id.startsWith("DEMO-") }))} />
      </main>
    );
  }

  const offers = await offersForSub(s.id);
  const pending = offers.find((o) => o.status === "pending_consent" && o.approveUrl && o.trigger === "merchant_cancel");
  const st = STATUS_COPY[s.status] || { label: s.status, cls: "bg-stone-200 text-stone-700" };
  const first = (s.name || "").split(" ")[0] || "friend";

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      {sp.welcome && <div className="rise mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">Welcome to Brightside! Your membership is set up through PayPal.</div>}
      {sp.offer && !sp.declined && pending && <div className="rise mb-6 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">Thanks! PayPal is confirming your new price. This page updates once it does.</div>}
      <div className="flex items-center gap-4">
        <Avatar name={s.name} className="!h-12 !w-12 text-base" />
        <div>
          <h1 className="font-serif text-4xl">Hi, {first}</h1>
          <p className="text-sm text-[#8a7868]">{s.email}</p>
        </div>
        <div className="ml-auto"><SignOut /></div>
      </div>

      {pending && (
        <div className="rise mt-8 flex flex-wrap items-center gap-4 rounded-3xl bg-white p-6 shadow-sm ring-2 ring-sun">
          <Sparkles className="h-6 w-6 text-sun" />
          <div className="flex-1">
            <p className="font-semibold">{pending.headline}</p>
            <p className="text-sm text-[#6b5a4c]">One last step: confirm the new price in PayPal.</p>
          </div>
          <a href={pending.approveUrl!} className="btn-sun">Confirm in PayPal</a>
        </div>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-orange-100">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#fde7d3] to-[#fff4e8] px-7 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7868]">Membership</p>
            <p className="mt-1 font-serif text-3xl">{s.planName}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <dl className="grid gap-6 px-7 py-6 sm:grid-cols-3">
          <Info icon={CreditCard} k="Price" v={`${money(s.priceMonthly, { cents: true })} / month`} />
          <Info icon={CalendarDays} k={s.status === "SUSPENDED" ? "Paused until" : "Next payment"} v={fmtDate(s.status === "SUSPENDED" ? s.pausedUntil : s.nextBillingAt)} />
          <Info icon={PauseCircle} k="Billed via" v="PayPal" />
        </dl>
        <div className="flex flex-wrap items-center gap-3 border-t border-orange-100 px-7 py-5">
          {s.status === "SUSPENDED" && <ActionButton url="/api/subscribers/resume" body={{ id: s.id }} className="btn-sun">Resume membership</ActionButton>}
          {["ACTIVE", "SUSPENDED"].includes(s.status) && (
            <Link href="/store/account/cancel" className="btn-link ml-auto">Cancel membership</Link>
          )}
          {s.status === "CANCELLED" && <p className="text-sm text-[#6b5a4c]">Your membership has ended. <Link href="/store#pricing" className="text-sun underline">Rejoin anytime</Link>.</p>}
        </div>
      </section>
      <p className="mt-4 font-mono text-[11px] text-[#b3a395]">PayPal subscription {s.id}</p>
    </main>
  );
}

function Info({ icon: Icon, k, v }: { icon: any; k: string; v: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-[#8a7868]"><Icon className="h-3.5 w-3.5" /> {k}</dt>
      <dd className="mt-1 font-semibold">{v}</dd>
    </div>
  );
}
