import { simulate } from "@/lib/paypal";
import { ingestEvent } from "@/lib/ingest";
import { LIMITS, demoLimit } from "@/lib/guard";

const TYPES = ["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.PAYMENT.FAILED", "BILLING.SUBSCRIPTION.SUSPENDED", "PAYMENT.SALE.COMPLETED"];

/**
 * mode "paypal": ask PayPal's simulator to send the event to our webhook (real round trip, but PayPal
 *   reuses the same event id per type, so a second fire is deduped).
 * mode "local": fetch the same canned payload and inject it with a fresh id (for repeatable demos).
 */
export async function POST(req: Request) {
  const { type, mode = "paypal" } = await req.json();
  if (!TYPES.includes(type)) return Response.json({ error: "unsupported type" }, { status: 400 });
  const limited = await demoLimit(req, "demo-simulate", LIMITS.demoPayPalIpHourly);
  if (limited) return limited;
  const r = await simulate(type);
  if (!r.ok) return Response.json({ error: `simulator ${r.status}`, details: r.data?.details }, { status: 502 });
  if (mode === "paypal") return Response.json({ ok: true, mode, eventId: r.data.id, note: "PayPal will deliver it to the webhook in about 5–20 s" });
  const evt = { ...r.data, id: `LOCAL-${Date.now().toString(36).toUpperCase()}` };
  const res = await ingestEvent(evt, "LOCAL_REPLAY", "local");
  return Response.json({ ok: true, mode, eventId: evt.id, ...res.body });
}
