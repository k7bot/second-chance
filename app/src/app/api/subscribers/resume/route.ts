import { resumeNow } from "@/lib/retention";
export async function POST(req: Request) {
  const { id } = await req.json();
  try { await resumeNow(id); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
}
