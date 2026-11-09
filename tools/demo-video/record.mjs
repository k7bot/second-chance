// Records the Second Chance demo, one clip per segment, in a headed Chromium under Xvfb.
// Run: xvfb-run -a -s "-screen 0 1920x1080x24 -nocursor" node record.mjs <outdir>
// Practice/demo actions only: reset + seed + sample history, practice member Maya,
// and PayPal webhook-simulator events. No real subscriptions are touched, no email is sent.
import { chromium } from "../../app/node_modules/playwright/index.mjs";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE || "https://second-chance-k12-4d00.vercel.app";
const OUT = process.argv[2] || "/workspace/second-chance/video/work/clips";
fs.mkdirSync(OUT, { recursive: true });
const marks = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(method, route, body) {
  const r = await fetch(BASE + route, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); log(method, route, r.status, t.slice(0, 160)); return t;
}

// ---------- off-camera setup ----------
if (!process.env.SKIP_SETUP) {
  await api("POST", "/api/demo/reset");
  await api("POST", "/api/demo/seed");
  await api("POST", "/api/demo/history");
  for (const type of ["BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.CANCELLED"]) {
    await api("POST", "/api/demo/simulate", { type, mode: "paypal" });
    await sleep(4000);
  }
  await sleep(20000); // webhook lag
}

// ---------- browser ----------
const browser = await chromium.launch({ headless: false, args: ["--force-device-scale-factor=1.2", "--window-size=1600,900", "--window-position=0,0", "--hide-scrollbars"] });
const ctx = await browser.newContext({ viewport: null });
await ctx.addInitScript(() => {
  if (window.top !== window) return; // top frame only (PayPal buttons live in iframes)
  window.__cx = window.__cx || 800; window.__cy = window.__cy || 450;
  const mk = () => {
    if (document.getElementById("__cur") || !document.documentElement) return;
    const c = document.createElement("div"); c.id = "__cur";
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.7-4.2-7.4L4 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transform: `translate(${window.__cx - 3}px, ${window.__cy - 2}px)`, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))" });
    document.documentElement.appendChild(c);
  };
  document.addEventListener("DOMContentLoaded", mk); setInterval(mk, 300);
  window.__place = (x, y) => { window.__cx = x; window.__cy = y; mk(); const c = document.getElementById("__cur"); if (c) c.style.transform = `translate(${x - 3}px, ${y - 2}px)`; };
  window.__glide = (x, y, ms) => new Promise((res) => {
    const sx = window.__cx, sy = window.__cy, t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.__place(sx + (x - sx) * e, sy + (y - sy) * e); k < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  });
  window.__ripple = () => {
    const r = document.createElement("div");
    Object.assign(r.style, { position: "fixed", left: window.__cx - 18 + "px", top: window.__cy - 18 + "px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(232,116,59,.35)", border: "2px solid rgba(232,116,59,.9)", zIndex: 2147483646, pointerEvents: "none", transition: "transform .45s ease-out, opacity .45s ease-out" });
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
    setTimeout(() => r.remove(), 600);
  };
});
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const cdp = await ctx.newCDPSession(page);
const { windowId } = await cdp.send("Browser.getWindowForTarget");
await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "fullscreen" } });

let cur = { x: 800, y: 450 };
const syncCur = () => page.evaluate(([x, y]) => window.__place && window.__place(x, y), [cur.x, cur.y]).catch(() => {});
const go = async (r) => { await page.goto(BASE + r, { waitUntil: "networkidle" }).catch(() => {}); await sleep(1200); await page.mouse.move(cur.x, cur.y); await syncCur(); };
const glide = async (x, y, ms = 900) => {
  await Promise.all([page.evaluate(([x, y, ms]) => window.__glide(x, y, ms), [x, y, ms]), page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 40)) })]);
  cur = { x, y };
};
const boxOf = async (loc) => { await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); return loc.boundingBox({ timeout: 10000 }); };
const moveTo = async (loc, { dx = 0, dy = 0, ms = 900 } = {}) => {
  const b = await boxOf(loc); if (!b) return;
  await glide(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms); await sleep(250);
};
const click = async (loc, opts) => { await moveTo(loc, opts); await page.evaluate(() => window.__ripple && window.__ripple()); await page.mouse.down(); await sleep(70); await page.mouse.up(); };
const smoothScroll = async (top, ms = 1400) => {
  await page.evaluate(async ([top, ms]) => {
    const s = scrollY, d = top - s, t0 = performance.now();
    await new Promise((res) => { const f = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, s + d * e); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  }, [top, ms]);
};
const scrollEl = async (sel, top, ms = 1400) => page.evaluate(async ([sel, top, ms]) => {
  const el = document.querySelector(sel); if (!el) return; const s = el.scrollTop, d = top - s, t0 = performance.now();
  await new Promise((res) => { const f = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = s + d * e; k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
}, [sel, top, ms]);
const yOf = async (loc) => page.evaluate((el) => el.getBoundingClientRect().top + scrollY, await loc.elementHandle());

// ---------- clip recorder ----------
let rec = null, recT0 = 0, curName = "";
async function start(name) {
  curName = name; marks[name] = { cuts: [] };
  const file = path.join(OUT, `${name}.mkv`);
  rec = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "x11grab", "-draw_mouse", "0", "-framerate", "30", "-video_size", "1920x1080", "-i", process.env.DISPLAY, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "14", "-pix_fmt", "yuv420p", file], { stdio: ["pipe", "inherit", "inherit"] });
  recT0 = Date.now(); await sleep(700); log("REC start", name);
}
const t = () => (Date.now() - recT0) / 1000;
const cutStart = () => marks[curName].cuts.push([t(), null]);
const cutEnd = () => { marks[curName].cuts.at(-1)[1] = t(); };
const note = (k, v) => { marks[curName][k] = v; };
async function stop() {
  await sleep(300); marks[curName].len = t();
  rec.stdin.write("q"); await new Promise((r) => rec.on("close", r)); log("REC stop", curName, marks[curName]);
  fs.writeFileSync(path.join(OUT, "marks.json"), JSON.stringify(marks, null, 2));
}

// ---------- S1 store ----------
await go("/store"); await sleep(4000);
await start("s1-store");
await sleep(2500);
const pp = page.locator("iframe").first();
const ppY = await yOf(pp);
await smoothScroll(ppY - 330, 2200);
await sleep(800);
note("paypalIframes", await page.locator("iframe").count());
const rects = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => { const r = f.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).filter((r) => r.w > 100));
note("iframeRects", rects);
if (rects[0]) { await glide(rects[0].x + rects[0].w * 0.5, rects[0].y + 22, 1100); await sleep(1800); }
if (rects.length > 1) { const r = rects[rects.length > 3 ? 3 : 1]; await glide(r.x + r.w * 0.5, r.y + 22, 1100); await sleep(2500); }
await stop();

// ---------- S2 Maya cancel flow ----------
await go("/store/account"); await sleep(1000);
await start("s2-cancel");
await sleep(1500);
await click(page.getByRole("button", { name: /Maya Chen/i }));
await page.waitForLoadState("networkidle"); await sleep(2200);
await click(page.getByRole("link", { name: /Cancel membership/i }).or(page.getByRole("button", { name: /Cancel membership/i })).first());
await page.waitForLoadState("networkidle"); await sleep(1800);
await click(page.getByText(/Taking a break/i).first()); await sleep(900);
const seeBtn = page.getByRole("button", { name: /See my options/i });
await smoothScroll((await yOf(seeBtn)) - 520, 1500); await sleep(500);
await moveTo(page.getByRole("button", { name: /Cancel without an offer/i }), { ms: 1000 }); await sleep(2200);
await click(seeBtn);
cutStart();
await page.getByText(/what Second Chance decided/i).first().waitFor({ timeout: 90000 });
await sleep(400); await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
cutEnd();
note("offerText", (await page.locator("main, body").first().innerText()).slice(0, 2500));
await sleep(1000);
await glide(640, 300); await sleep(4500);
const panel = page.getByText(/Demo · what Second Chance decided/i).first();
await smoothScroll((await yOf(panel)) - 120, 1800);
await moveTo(panel, { dx: -120, ms: 1000 }); await sleep(7000);
const accept = page.locator("button.btn-sun").first();
await smoothScroll((await yOf(accept)) - 350, 1500); await sleep(500);
note("acceptLabel", await accept.innerText());
await click(accept);
cutStart();
await page.getByText(/Back to my membership/i).last().waitFor({ timeout: 60000 }).catch(() => {});
await sleep(300); await page.evaluate(() => scrollTo(0, 0));
cutEnd();
await sleep(400);
note("resultText", (await page.locator("body").innerText()).slice(0, 1200));
await glide(1240, 640, 1000); await sleep(4000); // park the cursor off the copy
await stop();

// ---------- S3 demo console: case 1 via PayPal, then signed event ----------
await go("/dashboard/demo"); await sleep(800);
await start("s3-paypal");
await sleep(1500);
const card = page.locator("div.card").filter({ hasText: /Payment failed/i }).first();
await moveTo(card.getByText(/Case 1/).first(), { ms: 1000 }); await sleep(1200);
await click(card.getByRole("button", { name: /Via PayPal/i }));
await card.getByText(/deliver it to the webhook/i).waitFor({ timeout: 30000 }).catch(() => {});
await sleep(3500);
note("viaText", await card.innerText());
cutStart();
await sleep(20000);
await page.goto(BASE + "/dashboard/events", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500);
// make sure the payment-failed row is there; reload once if the webhook was slow
if (!(await page.getByText(/recovery message sent/i).count())) { await sleep(10000); await page.reload({ waitUntil: "networkidle" }); await sleep(2500); }
await page.mouse.move(cur.x, cur.y); await syncCur();
cutEnd();
note("eventsText", (await page.locator("body").innerText()).slice(0, 1500));
await sleep(1000);
const sig = page.getByText(/Signature verified/i).first();
await moveTo(sig, { ms: 1100 }); await sleep(3000);
await moveTo(page.getByText(/recovery message sent/i).first(), { ms: 1000 }); await sleep(3000);
await moveTo(page.getByText(/Signature verified/i).nth(3), { ms: 1000 }).catch(() => {}); await sleep(3500);
await stop();

// ---------- S4 outbox ----------
await go("/dashboard/outbox"); await sleep(800);
await start("s4-outbox");
await sleep(1000);
await moveTo(page.getByText(/Outbox only/i).first(), { ms: 1000 }); await sleep(1500);
await glide(1000, 560); await sleep(3500);
const arts = page.getByText(/^To /);
note("outboxCount", await arts.count());
note("outboxText", (await page.locator("body").innerText()).slice(0, 3000));
for (let i = 1; i < Math.min(4, await arts.count()); i++) { await smoothScroll((await yOf(arts.nth(i))) - 90, 1600); await sleep(i === 1 ? 2500 : 4500); }
await stop();

// ---------- S5 overview ----------
await go("/dashboard"); await sleep(2500);
await start("s5-overview");
await sleep(1000);
await glide(560, 190, 1100); await sleep(3000);
await glide(700, 420, 1100); await sleep(3000);
await glide(1350, 420, 1100); await sleep(3500);
note("overviewText", (await page.locator("body").innerText()).slice(0, 1500));
await stop();

// ---------- S6 subscribers + offers ----------
await go("/dashboard/subscribers"); await sleep(2500);
await start("s6-grids");
await sleep(1200);
const exp = page.locator(".ag-row").filter({ hasText: /John Doe/ }).locator(".ag-group-contracted, .ag-icon-tree-closed").first();
let expanded = false;
if (await exp.count()) { await click(exp); await sleep(2500); expanded = (await page.getByText(/PAYPAL EVENT TIMELINE/i).count()) > 0; }
note("expanded", expanded);
await glide(700, 520, 1100); await sleep(2500);
await glide(1050, 520, 1100); await sleep(2500);
note("t_offers", t());
cutStart();
await page.goto(BASE + "/dashboard/offers", { waitUntil: "networkidle" }).catch(() => {});
await sleep(2500); await page.mouse.move(cur.x, cur.y); await syncCur();
cutEnd();
await glide(900, 300, 1100); await sleep(3000);
await glide(700, 600, 1100); await sleep(3500);
note("offersText", (await page.locator("body").innerText()).slice(0, 1500));
await stop();

// ---------- S7 studio + AI analyst ----------
await go("/dashboard/studio"); await sleep(3500);
await start("s7-studio");
await sleep(1000);
await glide(650, 400, 1100); await sleep(3500); // sankey
await click(page.getByRole("button", { name: /Build · Ask AI/i })); await sleep(1500);
// collapse the editor side panels so the dashboard KPIs keep their full width (no "…")
for (const n of ["Data", "Compose", "Filters"]) await page.locator("button.ag-studio-panel-header").filter({ hasText: n }).first().click({ timeout: 5000 }).catch(() => {});
await sleep(1200);
const box = page.locator("textarea.ag-studio-ai-assistant-textarea");
await click(box); await sleep(300);
await page.keyboard.type("Who should I call today?", { delay: 85 }); await sleep(600);
await page.keyboard.press("Enter"); await sleep(1500);
note("t_asked", t());
cutStart();
const chatText = () => page.evaluate(() => { const e = document.querySelector("[class*=ai-assistant]"); return e ? e.innerText : ""; });
let aiText = "", prev = "", stable = 0;
for (let i = 0; i < 60; i++) {
  await sleep(1500);
  aiText = await chatText();
  const busy = /Thinking/i.test(aiText) || (await page.getByRole("button", { name: /^Stop$/ }).count()) > 0;
  stable = !busy && aiText === prev && aiText.length > 80 ? stable + 1 : 0; prev = aiText;
  if (stable >= 2) break;
}
await page.mouse.move(cur.x, cur.y); await syncCur();
cutEnd();
note("aiText", aiText.slice(0, 2500));
note("kpiText", await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^\$[\d,]+$|^…$/.test(e.textContent.trim())).map((e) => e.textContent.trim()).slice(0, 4)));
await glide(1500, 760, 1000); await sleep(9000);
await stop();

await browser.close();
log("DONE");
