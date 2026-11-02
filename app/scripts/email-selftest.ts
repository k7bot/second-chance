/**
 * Offline self-test for real email (no Resend key needed): stubs fetch, uses a throwaway PGlite DB.
 *   npx tsx scripts/email-selftest.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.PGLITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "sc-email-"));
delete process.env.DATABASE_URL;
process.env.APP_BASE_URL = "https://second-chance.example.app";

type Call = { url: string; auth: boolean; idem?: string; body: any };
const calls: Call[] = [];
let mode: "ok" | "fail" = "ok";
globalThis.fetch = (async (url: any, init: any) => {
  const body = JSON.parse(init.body);
  calls.push({ url: String(url), auth: String(init.headers.Authorization || "").startsWith("Bearer "), idem: init.headers["Idempotency-Key"], body });
  if (mode === "fail") return new Response(JSON.stringify({ statusCode: 422, name: "validation_error", message: "Invalid `from` field." }), { status: 422 });
  return new Response(JSON.stringify({ id: `stub-${calls.length}-0000-0000` }), { status: 200 });
}) as typeof fetch;

let failures = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`); if (!ok) failures++; };

async function main() {
  const { getDb, schema } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const email = await import("../src/lib/email");
  const db = await getDb();
  const subs = [
    { id: "I-REALGMAIL", email: "buyer@gmail.com", name: "Riley Buyer", source: "paypal" },
    { id: "I-REALSANDBOX", email: "sb-abc123@personal.example.com", name: "Sandy Box", source: "paypal" },
    { id: "DEMO-MAYA", email: "maya@demo.brightside", name: "Maya Chen", source: "store" },
    { id: "SAMPLE-0001", email: "sample1@gmail.com", name: "Sam Ple", source: "sample" },
    { id: "I-BW452GLLEP1G", email: "simulator@example.com", name: "Jordan Rivera", source: "simulator" },
  ];
  for (const s of subs) await db.insert(schema.subscribers).values({ ...s, priceMonthly: 29, status: "ACTIVE" });
  let n = 0;
  async function row(subId: string, trigger = "payment_failed") {
    const id = `msg_test${++n}`;
    await db.insert(schema.outbox).values({ id, subscriptionId: subId, toEmail: "x", toName: "Riley Buyer", subject: "Let's fix your payment", body: "Para one.\n\nPara two.", ctaLabel: "Update payment method", ctaUrl: "https://second-chance.example.app/store/welcome-back/off_x", trigger });
    return (await db.select().from(schema.outbox).where(eq(schema.outbox.id, id)))[0];
  }
  const get = async (id: string) => (await db.select().from(schema.outbox).where(eq(schema.outbox.id, id)))[0];
  const sub = (id: string) => subs.find((s) => s.id === id)!;

  // 1. no key -> outbox only, no fetch
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
  let r = await row("I-REALGMAIL");
  check("no key: outbox_only", (await email.deliverOutbox(r, sub("I-REALGMAIL"))) === "outbox_only" && calls.length === 0, (await get(r.id)).deliveryDetail ?? "");

  process.env.RESEND_API_KEY = "re_stub_not_a_real_key";
  process.env.EMAIL_FROM = "Brightside Yoga <offers@secondchance.heyremind.ai>";
  process.env.EMAIL_REPLY_TO = "hello@secondchance.heyremind.ai";

  // 2. real buyer -> sent
  r = await row("I-REALGMAIL");
  const st = await email.deliverOutbox(r, sub("I-REALGMAIL"));
  const g = await get(r.id);
  const c = calls[calls.length - 1];
  check("real buyer: sent", st === "sent" && g.deliveryStatus === "sent" && g.providerMessageId?.startsWith("stub-") === true, `${g.deliveredTo} ${g.providerMessageId}`);
  check("request shape", c.url === "https://api.resend.com/emails" && c.auth && c.body.from.includes("secondchance.heyremind.ai") && c.body.to[0] === "buyer@gmail.com" && c.body.reply_to === "hello@secondchance.heyremind.ai" && c.body.html.includes("<!doctype html>") && c.body.text.includes("Update payment method: https://") && !!c.idem && c.body.tags[0].value === "payment_failed");
  check("masked address stored", g.deliveredTo === "b••••@gmail.com", g.deliveredTo ?? "");

  // 3. placeholders never send
  for (const id of ["I-REALSANDBOX", "DEMO-MAYA", "SAMPLE-0001", "I-BW452GLLEP1G"]) {
    const before = calls.length;
    r = await row(id);
    const s2 = await email.deliverOutbox(r, sub(id));
    check(`placeholder ${id}: outbox_only`, s2 === "outbox_only" && calls.length === before, (await get(r.id)).deliveryDetail ?? "");
  }

  // 4. provider failure -> failed with detail
  mode = "fail";
  r = await row("I-REALGMAIL");
  const s3 = await email.deliverOutbox(r, sub("I-REALGMAIL"));
  check("provider error: failed", s3 === "failed" && (await get(r.id)).deliveryDetail?.includes("422") === true, (await get(r.id)).deliveryDetail ?? "");
  mode = "ok";

  // 5. judge address for a practice member
  r = await row("DEMO-MAYA", "merchant_cancel");
  const s4 = await email.deliverTo(r, "judge@gmail.com", "requested");
  check("send-to-me: sent to typed address", s4 === "sent" && calls[calls.length - 1].body.to[0] === "judge@gmail.com" && (await get(r.id)).deliveredTo === "j••••@gmail.com");

  // 6. validation
  const v = (e: string) => email.validEmail(e);
  check("validEmail accepts", !!v("Kiran.K+demo@Gmail.com") && !!v("a.b@sub.domain.io"));
  check("validEmail rejects", ![" ", "foo", "a@b", "x@example.com", "y@foo.example.org", "z@a..com", "<a@b.com>", "a@b.c", "a b@c.com", "a@localhost"].some((e) => v(e)));
  console.log(failures ? `\n${failures} FAILED` : "\nall email checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
