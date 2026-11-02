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
      {state === "loading" && <div role="status" aria-label="Loading PayPal checkout" className="shimmer h-[45px] rounded-full" />}
      {state === "error" && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-100">PayPal checkout didn&apos;t load. Check your connection, then refresh the page to try again.</p>}
      {state === "done" && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-100"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> Subscribed! Setting up your membership…</p>}
      <div ref={ref} className={state === "done" ? "hidden" : ""} />
    </div>
  );
}
