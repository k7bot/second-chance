"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

type Member = { id: string; name: string | null; email: string | null; status: string; plan: string | null; practice?: boolean; months?: number | null };

const STATUS: Record<string, string> = { ACTIVE: "Active", SUSPENDED: "Paused", CANCELLED: "Cancelled", EXPIRED: "Ended", APPROVAL_PENDING: "Awaiting PayPal" };

export function SignInList({ subs }: { subs: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function signIn(id: string) {
    setBusy(id); setErr("");
    try {
      const r = await fetch("/api/store/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch { setErr("Couldn't sign in just now. Please try again."); setBusy(null); }
  }
  async function seed() {
    setBusy("seed"); setErr("");
    const r = await fetch("/api/demo/seed", { method: "POST" }).catch(() => null);
    if (!r?.ok) { setErr("Couldn't add practice members just now. Try again in a few minutes."); setBusy(null); return; }
    router.refresh(); setBusy(null);
  }

  if (!subs.length) return (
    <div className="mt-8 rounded-2xl bg-white p-6 text-sm text-warm-muted ring-1 ring-orange-100">
      <p className="font-semibold text-warm">No members yet</p>
      <p className="mt-1">Add three practice members to try the cancel flow without a PayPal account.</p>
      <button className="btn-warm mt-4" disabled={busy === "seed"} onClick={seed}>{busy === "seed" && <Loader2 className="h-4 w-4 animate-spin" />} Add practice members</button>
      {err && <p role="alert" className="mt-3 text-rose-800">{err}</p>}
    </div>
  );
  const practice = subs.filter((s) => s.practice), real = subs.filter((s) => !s.practice);
  return (
    <div className="mt-8 space-y-8">
      {err && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-100">{err}</p>}
      {practice.length > 0 && <Group title="Practice members" note="No PayPal login needed. Each one gets a different offer." subs={practice} busy={busy} onPick={signIn} />}
      {real.length > 0 && <Group title="PayPal sandbox subscribers" note="Real sandbox subscriptions. Offers here call the PayPal API." subs={real} busy={busy} onPick={signIn} />}
    </div>
  );
}

function Group({ title, note, subs, busy, onPick }: { title: string; note: string; subs: Member[]; busy: string | null; onPick: (id: string) => void }) {
  return (
    <section aria-label={title}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-warm-muted">{title}</h2>
      <p className="mt-1 text-sm text-warm-muted">{note}</p>
      <ul className="mt-3 space-y-2.5">
        {subs.map((s) => (
          <li key={s.id}>
            <button onClick={() => onPick(s.id)} disabled={!!busy}
              className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-orange-100 transition hover:ring-[#c2551f] disabled:opacity-70">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-900">{(s.name || "?")[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name || s.email || s.id}</span>
                <span className="block truncate text-sm text-warm-muted">
                  {[s.plan?.replace("Brightside ", ""), STATUS[s.status] || s.status.toLowerCase(), s.months != null ? `${s.months} mo with us` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {busy === s.id
                ? <Loader2 aria-label="Signing in" className="h-4 w-4 animate-spin text-warm-muted" />
                : <ChevronRight aria-hidden className="h-4 w-4 text-warm-muted transition group-hover:translate-x-0.5" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SignOut() {
  const router = useRouter();
  return <button className="rounded-full px-2 py-1 text-sm text-warm-muted underline-offset-4 hover:text-warm hover:underline" onClick={async () => { await fetch("/api/store/logout", { method: "POST" }); router.refresh(); }}>Switch member</button>;
}
