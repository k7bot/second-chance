"use client";
import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import clsx from "clsx";

/**
 * "Email this to me" for practice members: their own address is a placeholder, so a visitor can have
 * the real branded email sent to their inbox instead. Server-side limited; never shown for real buyers.
 */
export function SendToMe({ offerId, outboxId, tone = "store", label = "Email this offer to me" }: { offerId?: string; outboxId?: string; tone?: "store" | "dashboard"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const store = tone === "store";

  if (state === "sent") return (
    <p className={clsx("flex items-center justify-center gap-2 text-sm", store ? "text-emerald-700" : "text-emerald-700")}>
      <Check className="h-4 w-4" /> Sent to {msg}. Check your inbox (and promotions tab).
    </p>
  );
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      className={clsx("inline-flex items-center gap-1.5 self-center text-sm font-medium underline-offset-4 hover:underline", store ? "text-[#8a7868] hover:text-[#2a2018]" : "text-muted hover:text-ink")}>
      <Mail className="h-4 w-4" /> {label}
    </button>
  );
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setMsg("");
    try {
      const r = await fetch("/api/email/send-to-me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, offerId, outboxId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setState("error"); setMsg(j.error || "Couldn't send that one."); return; }
      setMsg(j.to); setState("sent");
    } catch { setState("error"); setMsg("Couldn't reach the server."); }
  }
  return (
    <form onSubmit={send} className={clsx("w-full rounded-2xl p-4", store ? "bg-[#fffaf4] ring-1 ring-orange-100" : "bg-stone-50 ring-1 ring-line")}>
      <label htmlFor={`stm-${offerId || outboxId}`} className={clsx("text-sm font-semibold", store ? "text-[#2a2018]" : "text-ink")}>See the real email</label>
      <p className={clsx("mt-0.5 text-xs", store ? "text-[#8a7868]" : "text-muted")}>This practice member has a placeholder address, so we can send it to yours. Used once, never stored in full.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input id={`stm-${offerId || outboxId}`} type="email" required autoComplete="email" inputMode="email" maxLength={254} value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }} placeholder="you@email.com"
          className={clsx("min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm outline-none ring-1", store ? "ring-orange-200 focus:ring-2 focus:ring-sun" : "ring-line focus:ring-2 focus:ring-slate-400")} />
        <button type="submit" disabled={state === "sending"} className={clsx(store ? "btn-primary !bg-[#2a2018]" : "btn-primary", "!py-2.5")}>
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-rose-700">{msg}</p>}
    </form>
  );
}
