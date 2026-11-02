import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { handleEvent } from "./retention";

/** Store an event once (dedupe by PayPal event id), then run its case handler. */
export async function ingestEvent(evt: any, verification: string, origin: "paypal" | "local" = "paypal") {
  const db = await getDb();
  const id: string = evt?.id;
  if (!id || !evt.event_type) return { status: 400, body: { error: "not a PayPal event" } };
  const inserted = await db.insert(schema.events).values({
    id, type: evt.event_type, resourceId: evt.resource?.billing_agreement_id || evt.resource?.id || null,
    summary: evt.summary ?? null, verification, origin, payload: evt,
  }).onConflictDoNothing().returning({ id: schema.events.id });
  if (inserted.length === 0) return { status: 200, body: { duplicate: true, id } };
  if (verification !== "SUCCESS" && origin === "paypal") {
    await db.update(schema.events).set({ note: "signature not verified, not acted on" }).where(eq(schema.events.id, id));
    return { status: 200, body: { stored: true, acted: false } };
  }
  let note: string;
  try { note = await handleEvent(evt); } catch (e) { note = `handler error: ${(e as Error).message}`; }
  await db.update(schema.events).set({ note }).where(eq(schema.events.id, id));
  return { status: 200, body: { stored: true, note } };
}
