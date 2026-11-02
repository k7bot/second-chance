import { subs } from "@/lib/paypal";

/**
 * Drive a REAL sandbox subscription from outside the save flow, the way PayPal or the buyer would.
 * suspend -> PayPal sends SUSPENDED -> come-back offer (case 3)
 * cancel  -> as if the buyer cancelled inside PayPal -> CANCELLED -> win-back (case 4). Irreversible.
 */
export async function POST(req: Request) {
  const { id, action } = await req.json();
  if (!/^I-[A-Z0-9]+$/.test(id || "")) return Response.json({ error: "bad id" }, { status: 400 });
  const r = action === "suspend" ? await subs.suspend(id, "Demo: suspended outside Second Chance")
    : action === "cancel" ? await subs.cancel(id, "Demo: buyer cancelled inside PayPal")
    : null;
  if (!r) return Response.json({ error: "bad action" }, { status: 400 });
  return Response.json({ ok: r.ok, status: r.status }, { status: r.ok ? 200 : 502 });
}
