"use client";
import { useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";

export function Claim({ offerId, kind, status, approveUrl }: { offerId: string; kind: string; status: string; approveUrl: string | null }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(status === "saved" ? "done" : "idle");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState<string | undefined>(undefined);

  if (kind === "winback") {
    return approveUrl
      ? <a href={approveUrl} className="btn-sun mt-6 w-full !py-3 text-base">Rejoin with PayPal <ExternalLink className="h-4 w-4" /></a>
      : <p className="mt-6 text-sm text-rose-700">This offer link has expired.</p>;
  }
  if (kind === "recovery") {
    return (
      <div className="mt-6 space-y-3">
        <a href="https://www.sandbox.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer" className="btn-sun w-full !py-3 text-base">Update payment method in PayPal <ExternalLink className="h-4 w-4" /></a>
        <p className="text-center text-xs text-[#8a7868]">PayPal retries the payment automatically. Nothing else to do.</p>
      </div>
    );
  }
  if (state === "done") return (
    <div className="mt-6 space-y-3">
      <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" /> {detail || "Your membership is active again."}</p>
      {link && <a href={link} className="btn-sun w-full">Confirm your discounted month in PayPal <ExternalLink className="h-4 w-4" /></a>}
    </div>
  );
  return (
    <div className="mt-6">
      <button disabled={state === "working"} className="btn-sun w-full !py-3 text-base" onClick={async () => {
        setState("working");
        const r = await fetch("/api/save/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) });
        const j = await r.json();
        setDetail(j.detail); setLink(j.approveUrl); setState(j.state === "error" ? "error" : "done");
      }}>
        {state === "working" && <Loader2 className="h-4 w-4 animate-spin" />} Reactivate my membership
      </button>
      {state === "error" && <p className="mt-2 text-sm text-rose-700">{detail}</p>}
    </div>
  );
}
