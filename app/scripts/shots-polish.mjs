// Member-facing flow screenshots at desktop (1280) and mobile (390).
// Usage: node scripts/shots-polish.mjs <baseUrl> <outDir> <prefix: before|after> [operatorToken]
import { chromium } from "playwright";
const [base = "http://localhost:3100", out = "../shots/polish", prefix = "before", token = ""] = process.argv.slice(2);
const auth = token ? { Authorization: `Bearer ${token}` } : {};
const browser = await chromium.launch();
const VIEWS = [["desktop", { width: 1280, height: 860 }, 1], ["mobile", { width: 390, height: 844 }, 2]];

for (const [vname, viewport, dsf] of VIEWS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  const shot = async (name, full = true) => { await page.waitForTimeout(650); await page.screenshot({ path: `${out}/${prefix}-${name}-${vname}.png`, fullPage: full }); console.log("saved", `${prefix}-${name}-${vname}`); };
  const go = async (p) => { await page.goto(base + p, { waitUntil: "networkidle" }); };
  const login = async (id) => { await page.request.post(base + "/api/store/login", { data: { id } }); };
  const pickReason = async (re) => { await (/after/.test(prefix) ? page.locator("label").filter({ hasText: re }).first().click({ timeout: 6000 }) : Promise.reject()).catch(async () => page.getByRole("button", { name: re }).first().click()); };
  const offerReady = () => page.getByText(/No thanks, cancel|Confirm cancellation|cancel my membership/i).first().waitFor({ timeout: 30000 });
  const proceed = async () => page.getByRole("button", { name: /^(Continue|See my options|Show my options)/ }).click();

  if (process.env.ONLY !== "welcome") {
  await page.request.post(base + "/api/demo/seed", { headers: auth });
  await go("/store"); await page.locator("iframe").first().waitFor({ timeout: 15000 }).catch(() => {}); await page.waitForTimeout(2000);
  await shot("01-store");
  await page.request.post(base + "/api/store/logout");
  await go("/store/account"); await shot("02-signin");
  await login("DEMO-MAYA"); await go("/store/account"); await shot("03-account");
  await go("/store/account/cancel"); await shot("04-cancel-reason");
  await pickReason(/too expensive/i); await shot("05-cancel-reason-picked");
  // thinking state: hold the offer request
  let release; const held = new Promise((r) => (release = r));
  await page.route("**/api/save/offer", async (route) => { await held; await route.continue(); });
  await proceed(); await page.waitForTimeout(400); await shot("06-cancel-thinking", false);
  release(); await offerReady(); await page.unroute("**/api/save/offer"); await shot("07-offer-discount");
  const whyBtn = page.getByRole("button", { name: /why this offer/i });
  if (await whyBtn.count()) { await whyBtn.first().click(); await shot("07b-offer-why"); }
  await page.locator("button.btn-sun").first().click();
  await page.getByText("Back to my membership").last().waitFor(); await page.waitForTimeout(1200); await shot("08-result-saved");
  await go("/store/account"); await shot("09-account-after-save");
  // Ava: pause
  await login("DEMO-AVA"); await go("/store/account/cancel"); await pickReason(/Taking a break/i); await proceed();
  await offerReady(); await shot("10-offer-pause");
  await page.locator("button.btn-sun").first().click(); await page.waitForTimeout(2000); await shot("11-result-paused");
  await go("/store/account"); await shot("12-account-paused");
  // Leo: switching -> let go
  await login("DEMO-LEO"); await go("/store/account/cancel"); await pickReason(/Switching/i); await proceed();
  await offerReady(); await shot("13-offer-letgo");
  await page.getByRole("button", { name: /Confirm cancellation|cancel my membership/i }).first().click(); await page.waitForTimeout(2000); await shot("14-result-cancelled");
  await go("/store/account"); await shot("15-account-cancelled");
  // error state on the offer call
  await page.request.post(base + "/api/demo/seed", { headers: auth });
  await login("DEMO-MAYA"); await go("/store/account/cancel");
  await page.route("**/api/save/offer", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Something went wrong" }) }));
  await pickReason(/not using/i); await proceed(); await page.waitForTimeout(1600); await shot("16-cancel-error");
  await page.unroute("**/api/save/offer");
  const direct = page.getByRole("button", { name: /Cancel without an offer/i });
  if (await direct.count()) {
    await direct.click(); await page.waitForTimeout(500); await shot("18-cancel-direct-confirm");
    await page.getByRole("button", { name: /Yes, cancel my membership/i }).click(); await page.waitForTimeout(2000); await shot("19-result-direct-cancelled");
  }
  await page.request.post(base + "/api/demo/seed", { headers: auth });
  }
  // welcome-back landings (from emails): one per kind if available
  const data = await (await page.request.get(base + "/api/dashboard/data")).json();
  const want = [["winback", "Win-back"], ["recovery", "Payment recovery"], ["comeback", "Come-back"], ["discount", "Discount"]];
  for (const [kind, label] of want) {
    const pool = data.offers.filter((x) => x.kind === label || x.kind === kind);
    const o = pool.find((x) => x.status === "proposed") || pool.find((x) => x.status === "pending_consent") || pool[0];
    if (o) { await go(`/store/welcome-back/${o.id}`); await shot(`17-welcome-${kind}`); }
  }
  await ctx.close();
}
await browser.close();
