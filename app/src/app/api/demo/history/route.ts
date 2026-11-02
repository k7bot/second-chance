import { clearSample, seedSample } from "@/lib/sample";

/** POST loads (or reloads) the labelled sample history; DELETE removes it. Live sandbox data is untouched. */
export async function POST() {
  return Response.json({ ok: true, ...(await seedSample()) });
}
export async function DELETE() {
  await clearSample();
  return Response.json({ ok: true });
}
