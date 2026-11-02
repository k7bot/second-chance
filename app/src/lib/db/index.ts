import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * DATABASE_URL set  -> Neon serverless Postgres (Vercel).
 * DATABASE_URL unset -> embedded PGlite (real Postgres in WASM) persisted to ./.data/pglite.
 * Same pg schema either way, so switching to Neon is only an env change.
 */
const BOOTSTRAP = [
  `CREATE TABLE IF NOT EXISTS subscribers (id text PRIMARY KEY, email text, name text, plan_id text, plan_name text,
    price_monthly double precision NOT NULL DEFAULT 29, status text NOT NULL DEFAULT 'UNKNOWN', start_time timestamptz,
    last_payment_at timestamptz, next_billing_at timestamptz, failed_payments integer NOT NULL DEFAULT 0, custom_id text,
    source text NOT NULL DEFAULT 'paypal', risk text NOT NULL DEFAULT 'healthy', risk_reason text, grace_until timestamptz,
    paused_until timestamptz, expect_status text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, type text NOT NULL, resource_id text, summary text,
    verification text NOT NULL, origin text NOT NULL DEFAULT 'paypal', note text, payload jsonb, received_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS offers (id text PRIMARY KEY, subscription_id text NOT NULL, trigger text NOT NULL, kind text NOT NULL,
    headline text, message text, rationale text, engine text, reason text, price_monthly double precision, months integer, target_plan_id text,
    status text NOT NULL DEFAULT 'proposed', approve_url text, new_subscription_id text, mrr_saved double precision NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS outbox (id text PRIMARY KEY, subscription_id text, offer_id text, to_email text, to_name text,
    subject text NOT NULL, body text NOT NULL, cta_label text, cta_url text, trigger text, created_at timestamptz NOT NULL DEFAULT now())`,
];

import type { PgliteDatabase } from "drizzle-orm/pglite";
type DB = PgliteDatabase<typeof schema>;
const g = globalThis as unknown as { __scdb?: Promise<DB> };

async function create(): Promise<DB> {
  let db: DB;
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    db = drizzle(neon(process.env.DATABASE_URL), { schema }) as unknown as DB;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir = process.env.PGLITE_DIR || `${process.cwd()}/.data/pglite`;
    (await import("node:fs")).mkdirSync(dir, { recursive: true });
    db = drizzle(new PGlite(dir), { schema });
  }
  for (const stmt of BOOTSTRAP) await db.execute(sql.raw(stmt));
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__scdb) g.__scdb = create();
  return g.__scdb;
}
export { schema };
