import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { deliverTo, emailOn, isPlaceholderSub, maskEmail, validEmail } from "@/lib/email";
import { outboxForOffer } from "@/lib/retention";
import { clientKey, DAY, HOUR, isOperator, LIMITS, take, tooMany } from "@/lib/guard";

/**
 * "Send it to me": email a practice member's message (save offer or outbox message) to an address the
 * visitor types in. Only for placeholder members, never real buyers. Limited per IP and per day.
 * Body: { email, offerId } or { email, outboxId }.
 */
export async function POST(req: Request) {
  if (!emailOn()) return Response.json({ error: "Email delivery isn't switched on yet." }, { status: 503 });
  const j = await req.json().catch(() => ({}));
  const to = validEmail(j.email);
  if (!to) return Response.json({ error: "That email address doesn't look right." }, { status: 400 });

  let row, sub;
  if (typeof j.offerId === "string") {
    const r = await outboxForOffer(j.offerId);
    if ("error" in r) return Response.json({ error: r.error }, { status: 404 });
    ({ row, sub } = r);
  } else if (typeof j.outboxId === "string") {
    const db = await getDb();
    row = (await db.select().from(schema.outbox).where(eq(schema.outbox.id, j.outboxId)))[0];
    sub = row?.subscriptionId ? (await db.select().from(schema.subscribers).where(eq(schema.subscribers.id, row.subscriptionId)))[0] : undefined;
    if (!row || !sub) return Response.json({ error: "Message not found" }, { status: 404 });
  } else return Response.json({ error: "Nothing to send" }, { status: 400 });

  // real members get their own email; this is only for practice / simulator / sample members
  if (!isPlaceholderSub(sub)) return Response.json({ error: "This message belongs to a real member, so it only goes to them." }, { status: 403 });

  if (!isOperator(req)) {
    if (!(await take("email-ip", clientKey(req.headers), LIMITS.emailIpHourly, HOUR)))
      return tooMany("You've sent a few of these already. Give it a little while and try again.");
    if (!(await take("email-day", "all", LIMITS.emailDaily, DAY)))
      return tooMany("Email sending is taking a breather for today. The message is still in the Outbox.");
  }

  const status = await deliverTo(row, to, "requested");
  if (status !== "sent") return Response.json({ error: "The email couldn't be sent just now. It's still in the Outbox." }, { status: 502 });
  return Response.json({ ok: true, to: maskEmail(to), outboxId: row.id });
}
