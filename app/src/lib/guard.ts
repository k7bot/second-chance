import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

/**
 * Light abuse protection, backed by Postgres so it holds across serverless instances.
 * Fixed-window counters in `rate_limits`; client IPs are stored only as salted SHA-256 hashes.
 * Fails open: if the counter store errors, the request is allowed (a judge should never be blocked by us).
 */

const HOUR = 3_600_000;
const DAY = 86_400_000;
const num = (v: string | undefined, d: number) => (v && Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : d);

export const LIMITS = {
  get llmIpHourly() { return num(process.env.LLM_IP_HOURLY_LIMIT, 60); },
  get llmDaily() { return num(process.env.LLM_DAILY_LIMIT, 1500); },
  get demoIpHourly() { return num(process.env.DEMO_IP_HOURLY_LIMIT, 10); },
  get demoPayPalIpHourly() { return num(process.env.DEMO_PAYPAL_IP_HOURLY_LIMIT, 30); },
  get demoRealIpHourly() { return num(process.env.DEMO_REAL_IP_HOURLY_LIMIT, 5); },
  get demoRealDaily() { return num(process.env.DEMO_REAL_DAILY_LIMIT, 20); },
  get emailIpHourly() { return num(process.env.EMAIL_IP_HOURLY_LIMIT, 5); },
  get emailDaily() { return num(process.env.EMAIL_DAILY_LIMIT, 50); },
};

/** Real client IP on Vercel (the edge overwrites these headers, so they can't be spoofed there). */
export function clientIp(h: Headers): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || "";
  return first(h.get("x-vercel-forwarded-for")) || first(h.get("x-real-ip")) || first(h.get("x-forwarded-for")) || "unknown";
}

export function clientKey(h: Headers): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.CRON_SECRET || "second-chance";
  return createHash("sha256").update(`${salt}:${clientIp(h)}`).digest("hex").slice(0, 32);
}

/** The operator (holder of CRON_SECRET) skips the demo limits: `Authorization: Bearer …` or `?token=…`. */
export function isOperator(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const auth = req.headers.get("authorization") || "";
  const q = new URL(req.url).searchParams.get("token") || "";
  return auth === `Bearer ${s}` || q === s;
}

/** Count one hit in the current window and report whether it is within `limit`. */
export async function take(bucket: string, key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const db = await getDb();
    const start = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const res = (await db.execute(sql`INSERT INTO rate_limits (bucket, key, window_start, count) VALUES (${bucket}, ${key}, ${start.toISOString()}, 1)
      ON CONFLICT (bucket, key, window_start) DO UPDATE SET count = rate_limits.count + 1 RETURNING count`)) as unknown as { rows: { count: number | string }[] };
    const count = Number(res.rows?.[0]?.count ?? 0);
    if (Math.random() < 0.02) await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
    return count <= limit;
  } catch (e) {
    console.warn(`[guard] counter unavailable, allowing: ${(e as Error).message.slice(0, 120)}`);
    return true;
  }
}

/**
 * One LLM call's worth of budget. Per-IP hourly cap for calls a visitor triggers, plus a global daily cap
 * for every call (webhook-driven offers have no visitor IP and only count against the daily cap).
 */
export async function llmBudget(key?: string): Promise<{ ok: boolean; why?: "ip" | "daily" }> {
  if (key && !(await take("llm-ip", key, LIMITS.llmIpHourly, HOUR))) return { ok: false, why: "ip" };
  if (!(await take("llm-day", "all", LIMITS.llmDaily, DAY))) return { ok: false, why: "daily" };
  return { ok: true };
}

export const AI_RESTING = "The AI analyst is resting — try again in a bit.";

/** Per-IP hourly limit for a demo endpoint. Returns a 429 response when over, otherwise null. */
export async function demoLimit(req: Request, bucket: string, limit = LIMITS.demoIpHourly): Promise<Response | null> {
  if (isOperator(req)) return null;
  if (await take(bucket, clientKey(req.headers), limit, HOUR)) return null;
  return tooMany("That demo action has run a lot from here recently. Give it a few minutes and try again.");
}

export const tooMany = (message: string) =>
  Response.json({ error: message }, { status: 429, headers: { "Retry-After": "600" } });

export { HOUR, DAY };
