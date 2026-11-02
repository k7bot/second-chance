"use client";
import { useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { ctaFor } from "@/lib/email/templates";

export function Claim({ offerId, kind, status, approveUrl }: { offerId: string; kind: string; status: string; approveUrl: string | null }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(status === "saved" ? "done" : "idle");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState<string | undefined>(undefined);

  if (kind === "winback") {
    return approveUrl
      ? <a href={approveUrl} className="btn-sun mt-6 w-full !py-3 text-base">Rejoin with PayPal <ExternalLink aria-hidden className="h-4 w-4" /></a>
      : <p className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-[#6b5a4c]">This link has expired. Head to <a href="/store#pricing" className="font-semibold text-sun-ink underline">our plans</a> to rejoin.</p>;
  }
  if (kind === "recovery") {
    return (
      <div className="mt-6 space-y-3">
        <a href="https://www.sandbox.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer" className="btn-sun w-full !py-3 text-base">Update payment method in PayPal <ExternalLink aria-hidden className="h-4 w-4" /></a>
        <p className="text-center text-xs text-[#75624f]">PayPal retries the payment automatically. Nothing else to do.</p>
      </div>
    );
  }
  if (state === "done") return (
    <div className="mt-6 space-y-3">
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><Check aria-hidden className="h-4 w-4 shrink-0" /> {detail || "Your membership is active again."}</p>
      {link && <a href={link} className="btn-sun w-full">{kind === "comeback" ? "Confirm your discounted month in PayPal" : "Confirm in PayPal"} <ExternalLink aria-hidden className="h-4 w-4" /></a>}
    </div>
  );
  return (
    <div className="mt-6">
      <button disabled={state === "working"} className="btn-sun w-full !py-3 text-base" onClick={async () => {
        setState("working");
        const j = await fetch("/api/save/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) })
          .then((r) => r.json()).catch(() => ({ state: "error", detail: "We couldn't reach the server. Please try again." }));
        setDetail(j.state === "pending_consent" ? "Almost there: confirm the new price in PayPal." : j.detail); setLink(j.approveUrl); setState(j.state === "error" ? "error" : "done");
      }}>
        {state === "working" && <Loader2 className="h-4 w-4 animate-spin" />} {ctaFor(kind)}
      </button>
      {state === "error" && <p role="alert" className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{detail || "That didn't go through. Please try again."}</p>}
    </div>
  );
}
