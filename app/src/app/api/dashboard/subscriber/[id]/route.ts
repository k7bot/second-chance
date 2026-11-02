import { desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { OFFER_LABEL, TRIGGER_LABEL } from "@/lib/queries";
export const dynamic = "force-dynamic";
/** Master/detail payload: one subscriber's webhook timeline and offer history. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();
  const [evts, offs, outbox] = await Promise.all([
    db.select().from(schema.events).where(or(eq(schema.events.resourceId, id), sql`${schema.events.payload}->'resource'->>'billing_agreement_id' = ${id}`)).orderBy(desc(schema.events.receivedAt)).limit(40),
    db.select().from(schema.offers).where(eq(schema.offers.subscriptionId, id)).orderBy(desc(schema.offers.createdAt)),
    db.select().from(schema.outbox).where(eq(schema.outbox.subscriptionId, id)).orderBy(desc(schema.outbox.createdAt)).limit(5),
  ]);
  return Response.json({
    events: evts.map(({ payload, ...e }) => e),
    offers: offs.map((o) => ({ ...o, kindLabel: OFFER_LABEL[o.kind] ?? o.kind, triggerLabel: TRIGGER_LABEL[o.trigger] ?? o.trigger })),
    outbox: outbox.map((m) => ({ id: m.id, subject: m.subject, createdAt: m.createdAt, deliveryStatus: m.deliveryStatus })),
  });
}
