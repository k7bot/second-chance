import { and, isNotNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { resumeNow } from "@/lib/retention";

export const dynamic = "force-dynamic";

/**
 * Auto-resume: re-activates every paused subscription whose pause window has ended.
 * Scheduled by Vercel Cron (vercel.json). If CRON_SECRET is set, Vercel sends it as a
 * Bearer token and anything else is rejected.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const due = await db.select({ id: schema.subscribers.id }).from(schema.subscribers)
    .where(and(isNotNull(schema.subscribers.pausedUntil), lte(schema.subscribers.pausedUntil, new Date())));
  const resumed: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const { id } of due) {
    try { await resumeNow(id); resumed.push(id); }
    catch (e) { failed.push({ id, error: (e as Error).message }); }
  }
  return Response.json({ ok: true, checked: due.length, resumed, failed, at: new Date().toISOString() });
}
