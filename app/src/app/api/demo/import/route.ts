import { syncFromPayPal } from "@/lib/retention";
import { LIMITS, demoLimit } from "@/lib/guard";
export async function POST(req: Request) {
  const { id } = await req.json();
  if (!/^I-[A-Z0-9]+$/.test(id || "")) return Response.json({ error: "bad id" }, { status: 400 });
  const limited = await demoLimit(req, "demo-import", LIMITS.demoPayPalIpHourly);
  if (limited) return limited;
  const s = await syncFromPayPal(id, "store");
  return s ? Response.json({ ok: true, status: s.status }) : Response.json({ error: "not found in PayPal" }, { status: 404 });
}
