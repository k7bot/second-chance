import { subs } from "@/lib/paypal";
import { getSub, DEMO_PREFIX } from "@/lib/retention";
import { SAMPLE_PREFIX } from "@/lib/sample";
import { DAY, LIMITS, demoLimit, isOperator, take, tooMany } from "@/lib/guard";

/**
 * Drive a REAL sandbox subscription from outside the save flow, the way PayPal or the buyer would.
 * suspend -> PayPal sends SUSPENDED -> come-back offer (case 3)
 * cancel  -> as if the buyer cancelled inside PayPal -> CANCELLED -> win-back (case 4). Irreversible.
 *
 * The Demo console calls this without credentials, so it stays open to judges but is fenced in:
 * only subscriptions this app already tracks as real sandbox subscribers (the ones the console lists),
 * a tight per-visitor hourly limit and a global daily cap. The CRON_SECRET holder skips the limits.
 */
export async function POST(req: Request) {
  const { id, action } = await req.json();
  if (!/^I-[A-Z0-9]+$/.test(id || "")) return Response.json({ error: "bad id" }, { status: 400 });
  if (action !== "suspend" && action !== "cancel") return Response.json({ error: "bad action" }, { status: 400 });
  const s = await getSub(id);
  if (!s || s.source === "simulator" || s.id.startsWith(SAMPLE_PREFIX) || s.id.startsWith(DEMO_PREFIX))
    return Response.json({ error: "Only the sandbox subscriptions listed in the Demo console can be driven here." }, { status: 404 });
  const limited = await demoLimit(req, "demo-real", LIMITS.demoRealIpHourly);
  if (limited) return limited;
  if (!isOperator(req) && !(await take("demo-real-day", "all", LIMITS.demoRealDaily, DAY)))
    return tooMany("Real sandbox actions are paused for today. The simulator buttons above still work.");
  const r = action === "suspend" ? await subs.suspend(id, "Demo: suspended outside Second Chance")
    : await subs.cancel(id, "Demo: buyer cancelled inside PayPal");
  return Response.json({ ok: r.ok, status: r.status }, { status: r.ok ? 200 : 502 });
}
