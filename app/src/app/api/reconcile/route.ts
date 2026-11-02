import { reconcile } from "@/lib/retention";
import { LIMITS, demoLimit } from "@/lib/guard";
export async function POST(req: Request) {
  const limited = await demoLimit(req, "reconcile", LIMITS.demoPayPalIpHourly);
  if (limited) return limited;
  const { id } = await req.json();
  const s = await reconcile(id);
  return Response.json({ status: s?.status, planId: s?.planId, risk: s?.risk });
}
