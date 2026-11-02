// Headless screenshots of the key screens. Usage: node scripts/shots.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "../shots";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = async (name, full = true) => { await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${name}.png`, fullPage: full }); console.log("saved", name); };
const go = async (p) => { await page.goto(base + p, { waitUntil: "networkidle" }); };

await page.request.post(base + "/api/demo/seed");
await go("/"); await shot("01-landing");
await go("/store"); await page.locator("iframe").first().waitFor({ timeout: 20000 }).catch(() => {}); await page.waitForTimeout(3000); await shot("02-store");
await page.request.post(base + "/api/store/logout");
await go("/store/account"); await shot("03-account-signin");
await page.getByRole("button", { name: /Maya Chen/ }).click(); await page.waitForLoadState("networkidle"); await shot("04-account");
await go("/store/account/cancel"); await page.getByRole("button", { name: /too expensive/i }).click(); await shot("05-cancel-reason");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByText(/No thanks, cancel/).waitFor({ timeout: 30000 }); await shot("06-cancel-offer");
await page.locator("button.btn-sun").first().click();
await page.getByText("Back to my membership").last().waitFor(); await page.waitForTimeout(1500); await shot("07-cancel-result");
// second member: taking a break -> pause
await page.request.post(base + "/api/store/login", { data: { id: "DEMO-AVA" } });
await go("/store/account/cancel"); await page.getByRole("button", { name: /Taking a break/i }).click(); await page.getByRole("button", { name: "Continue" }).click();
await page.getByText(/No thanks, cancel/).waitFor({ timeout: 30000 }); await shot("08-cancel-offer-pause");
await page.locator("button.btn-sun").first().click(); await page.waitForTimeout(2500);
for (const [p, n] of [["/dashboard", "09-dashboard"], ["/dashboard/subscribers", "10-subscribers"], ["/dashboard/events", "11-events"], ["/dashboard/outbox", "12-outbox"], ["/dashboard/demo", "13-demo-console"]]) { await go(p); await shot(n); }
await go("/dashboard/outbox");
const links = await page.locator('a[href*="/store/welcome-back/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
let i = 0;
for (const l of links.slice(0, 3)) { await go(l.replace(/^https?:\/\/[^/]+/, "")); await shot(`14-welcome-back-${++i}`); }
await browser.close();
