import { resumeNow } from "@/lib/retention";
import { LIMITS, demoLimit } from "@/lib/guard";
export async function POST(req: Request) {
  const limited = await demoLimit(req, "resume", LIMITS.demoPayPalIpHourly);
  if (limited) return limited;
  const { id } = await req.json();
  try { await resumeNow(id); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
