// AG Grid / AG Studio screenshots for the "Best Use of AG Grid" submission.
// Usage: node scripts/shots-grid.mjs [baseUrl] [outDir]   (read-only apart from AI prompts)
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "../shots";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = async (name, full = false) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}.png`, fullPage: full }); console.log("saved", name); };
const go = async (p, wait = 2500) => { await page.goto(base + p, { waitUntil: "networkidle" }); await page.waitForTimeout(wait); };
const chip = (label) => page.getByRole("button", { name: label, exact: true }).first().click();

await go("/dashboard"); await shot("20-overview", true);

await go("/dashboard/subscribers"); await shot("21-subscribers-retention-queue");
const opened = await page.evaluate(() => { const api = window.__subsGrid; let done = false;
  api?.forEachNodeAfterFilterAndSort((n) => { if (!done && n.master && !n.group) { n.setExpanded(true); done = true; } }); return done; });
if (opened) { await page.waitForTimeout(2000); await shot("22-subscriber-detail"); } else console.log("no detail row");
await chip("Plan × status"); await shot("23-subscribers-plan-status");
await chip("All members"); await page.waitForTimeout(800);
await page.getByPlaceholder(/Ask the grid/).fill("Members over 12 months tenure that we lost, grouped by plan");
await page.getByRole("button", { name: "Ask" }).click();
await page.getByText(/AG Grid AI Toolkit:|Couldn't apply/).waitFor({ timeout: 60000 }).catch(() => console.log("no AI reply"));
await shot("24-subscribers-ai-toolkit");

await go("/dashboard/offers", 3500); await shot("25-offers-pivot-chart-mrr");
for (const [label, n] of [["Save rate", "26-offers-pivot-save-rate"], ["% of trigger", "27-offers-pivot-share"]]) { await chip(label); await page.waitForTimeout(1200); await shot(n); }
await chip("Offer log"); await shot("28-offers-log");

await go("/dashboard/events"); await shot("29-events");
await chip("By event type"); await shot("30-events-by-type");

await go("/dashboard/studio", 6000); await shot("31-studio-retention");
await chip("Members"); await page.waitForTimeout(2500); await shot("32-studio-members");
await chip("PayPal webhooks"); await page.waitForTimeout(2500); await shot("33-studio-webhooks");
await chip("Retention"); await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Build/ }).click(); await page.waitForTimeout(2500);
await page.getByText("Who should I call today?").click();
await page.waitForTimeout(45000); await shot("34-studio-ai-analyst");
await browser.close();
