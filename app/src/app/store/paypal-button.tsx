"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { paypal?: any } }

let sdkPromise: Promise<void> | null = null;
function loadSdk(clientId: string) {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&components=buttons`;
    s.dataset.sdkIntegrationSource = "button-factory";
    s.onload = () => resolve();
    s.onerror = () => { sdkPromise = null; reject(new Error("PayPal SDK failed to load")); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export function PayPalSubscribe({ clientId, planId, label = "subscribe" }: { clientId: string; planId: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "error" | "done">("loading");
  useEffect(() => {
    let cancelled = false;
    loadSdk(clientId).then(() => {
      if (cancelled || !ref.current || !window.paypal) return;
      ref.current.innerHTML = "";
      window.paypal.Buttons({
        style: { shape: "pill", color: "gold", layout: "vertical", label },
        createSubscription: (_: any, actions: any) => actions.subscription.create({ plan_id: planId, custom_id: "brightside-web" }),
        onApprove: async (data: any) => {
          setState("done");
          await fetch("/api/store/subscribed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionID: data.subscriptionID }) });
          router.push("/store/account?welcome=1");
        },
        onError: () => setState("error"),
      }).render(ref.current).then(() => !cancelled && setState("ready"));
    }).catch(() => setState("error"));
    return () => { cancelled = true; };
  }, [clientId, planId, label, router]);
  return (
    <div>
      {state === "loading" && <div className="h-[45px] animate-pulse rounded-full bg-amber-100" />}
      {state === "error" && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">PayPal couldn&apos;t load. Check your connection and refresh.</p>}
      {state === "done" && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Subscribed! Setting up your membership…</p>}
      <div ref={ref} className={state === "done" ? "hidden" : ""} />
    </div>
  );
}
