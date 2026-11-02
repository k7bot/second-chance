import { inArray, like, or, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { SIM_SUB_PREFIXES } from "@/lib/retention";

/** Wipe simulator-driven data and practice members so a demo can be re-recorded. Real sandbox subscribers are kept. */
export async function POST() {
  const db = await getDb();
  await db.delete(schema.events).where(or(inArray(schema.events.resourceId, SIM_SUB_PREFIXES), like(schema.events.id, "LOCAL-%"), like(schema.events.resourceId, "DEMO-%")));
  await db.delete(schema.offers).where(or(inArray(schema.offers.subscriptionId, SIM_SUB_PREFIXES), like(schema.offers.subscriptionId, "DEMO-%")));
  await db.delete(schema.outbox).where(or(inArray(schema.outbox.subscriptionId, SIM_SUB_PREFIXES), like(schema.outbox.subscriptionId, "DEMO-%")));
  await db.delete(schema.subscribers).where(or(eq(schema.subscribers.source, "simulator"), inArray(schema.subscribers.id, SIM_SUB_PREFIXES)));
  return Response.json({ ok: true });
}
