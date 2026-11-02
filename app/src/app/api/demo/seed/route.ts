import { eq, like } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { cfg } from "@/lib/config";
import { DEMO_PREFIX } from "@/lib/retention";

const DAY = 86_400_000;
/** Local practice members: they run the whole save flow without a PayPal buyer account (no PayPal calls). */
const MEMBERS = [
  { id: "DEMO-MAYA", name: "Maya Chen", email: "maya.chen@example.com", months: 14 },
  { id: "DEMO-LEO", name: "Leo Park", email: "leo.park@example.com", months: 2 },
  { id: "DEMO-AVA", name: "Ava Ruiz", email: "ava.ruiz@example.com", months: 7 },
];

export async function POST() {
  const db = await getDb();
  const ids = MEMBERS.map((m) => m.id);
  for (const t of [schema.offers, schema.outbox] as const) await db.delete(t).where(like(t.subscriptionId, `${DEMO_PREFIX}%`));
  await db.delete(schema.events).where(like(schema.events.resourceId, `${DEMO_PREFIX}%`));
  const now = Date.now();
  for (const m of MEMBERS) {
    await db.delete(schema.subscribers).where(eq(schema.subscribers.id, m.id));
    await db.insert(schema.subscribers).values({
      id: m.id, name: m.name, email: m.email, planId: cfg.plans.pro, planName: "Brightside Pro", priceMonthly: 29, status: "ACTIVE",
      startTime: new Date(now - m.months * 30.44 * DAY), lastPaymentAt: new Date(now - 6 * DAY), nextBillingAt: new Date(now + 24 * DAY),
      source: "simulator", risk: "healthy",
    });
  }
  return Response.json({ ok: true, members: ids });
}
