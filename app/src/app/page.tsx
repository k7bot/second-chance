import Link from "next/link";
import { AlertTriangle, ArrowRight, PauseCircle, Store, XCircle, LogOut, LayoutDashboard, FlaskConical } from "lucide-react";
import { Logo } from "@/components/ui";

const CASES = [
  { n: 1, icon: AlertTriangle, t: "Payment failed", d: "A friendly recovery message plus a grace period, on top of PayPal's automatic retries.", c: "text-rose-600 bg-rose-50" },
  { n: 2, icon: LogOut, t: "Cancel on your site", d: "Ask why, then make one AI-picked offer: pause, a personal price, or a lighter plan.", c: "text-teal-700 bg-teal-50" },
  { n: 3, icon: PauseCircle, t: "Subscription suspended", d: "A come-back offer with one-tap reactivation through PayPal.", c: "text-amber-600 bg-amber-50" },
  { n: 4, icon: XCircle, t: "Cancelled inside PayPal", d: "A win-back message with a ready-made PayPal subscription link, offer already applied.", c: "text-violet-600 bg-violet-50" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(80rem_40rem_at_50%_-10%,#ccfbf1_0%,transparent_60%)]">
      <header className="mx-auto flex max-w-6xl items-center px-6 py-6">
        <Logo />
        <div className="ml-auto flex gap-2">
          <Link href="/store" className="btn-ghost"><Store className="h-4 w-4" /> Demo store</Link>
          <Link href="/dashboard" className="btn-primary"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold text-brand">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-brand-2" /> Built on PayPal Subscriptions
        </span>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">Every PayPal subscriber<br />deserves a <span className="text-brand">second chance</span>.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">An AI retention agent for PayPal merchants. It reads every subscription event, picks the right offer for each person and acts on it through PayPal&apos;s APIs. That means pausing, repricing, reactivating or winning them back.</p>
        <div className="mt-9 flex justify-center gap-3">
          <Link href="/store" className="btn-brand !px-6 !py-3 text-base">Try the demo store <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/dashboard/demo" className="btn-ghost !px-6 !py-3 text-base"><FlaskConical className="h-4 w-4" /> Demo console</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {CASES.map((c) => (
          <div key={c.n} className="card p-6">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.c}`}><c.icon className="h-5 w-5" /></span>
            <p className="mt-4 text-xs font-semibold text-muted">Case {c.n}</p>
            <p className="mt-0.5 font-semibold">{c.t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
