import { clearSample, seedSample } from "@/lib/sample";
import { demoLimit } from "@/lib/guard";

/** POST loads (or reloads) the labelled sample history; DELETE removes it. Live sandbox data is untouched. */
export async function POST(req: Request) {
  const limited = await demoLimit(req, "demo-history");
  if (limited) return limited;
  return Response.json({ ok: true, ...(await seedSample()) });
}
export async function DELETE(req: Request) {
  const limited = await demoLimit(req, "demo-history");
  if (limited) return limited;
  await clearSample();
  return Response.json({ ok: true });
}
