import { verifyWebhook } from "@/lib/paypal";
import { ingestEvent } from "@/lib/ingest";

export async function POST(req: Request) {
  const raw = await req.text();
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
  const verification = await verifyWebhook(req.headers, raw);
  const res = await ingestEvent(evt, verification, "paypal");
  console.log(`[webhook] ${evt.event_type} ${evt.id} verification=${verification} ${JSON.stringify(res.body)}`);
  return Response.json(res.body, { status: res.status });
}
