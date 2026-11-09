// Renders the title card, closing card and caption overlays as 1920x1080 PNGs.
import { chromium } from "../../app/node_modules/playwright/index.mjs";
const OUT = process.argv[2] || "/workspace/second-chance/video/work/cards";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const base = `*{margin:0;box-sizing:border-box} body{width:1920px;height:1080px;font-family:'Geist','Inter',sans-serif;}`;
const card = (inner) => `<html><head><style>${base}
body{background:radial-gradient(1200px 700px at 78% 18%,#134e4a 0%,#0b1220 55%,#070b14 100%);color:#e2e8f0;display:flex;align-items:center;padding:0 170px}
.logo{width:96px;height:96px;border-radius:24px;background:#14b8a6;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 50px rgba(20,184,166,.35)}
.eyebrow{font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:#5eead4;font-weight:600}
h1{font-family:'Instrument Serif','Fraunces',serif;font-weight:400;font-size:148px;line-height:1;color:#fff;letter-spacing:-.01em}
h2{font-size:50px;font-weight:500;color:#e2e8f0;line-height:1.2}
.chips{display:flex;gap:16px;flex-wrap:wrap}.chip{font-size:26px;padding:12px 24px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#cbd5e1}
.url{font-family:'Geist Mono',monospace;font-size:46px;color:#fff;padding:22px 34px;border-radius:20px;background:rgba(20,184,166,.16);border:1px solid rgba(94,234,212,.45);display:inline-block}
.small{font-size:28px;color:#94a3b8}
</style></head><body><div>${inner}</div></body></html>`;
const logo = `<div class="logo"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#04211e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg></div>`;
await p.setContent(card(`${logo}<p class="eyebrow" style="margin-top:56px">PayPal AI Hackathon · demo</p>
<h1 style="margin-top:22px">Second Chance</h1>
<h2 style="margin-top:28px">AI retention agent for PayPal Subscriptions</h2>
<div class="chips" style="margin-top:56px"><span class="chip">PayPal Subscriptions API + webhooks (sandbox)</span><span class="chip">Qwen on Nebius AI Studio</span><span class="chip">AG Grid · AG Studio</span></div>`));
await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/title.png` });
await p.setContent(card(`${logo}<h1 style="margin-top:56px;font-size:120px">Second Chance</h1>
<h2 style="margin-top:22px">Recover failed payments · save cancels · win members back</h2>
<p class="small" style="margin-top:64px;margin-bottom:18px">Try the live demo</p>
<div class="url">second-chance-k12-4d00.vercel.app</div>
<p class="small" style="margin-top:40px">Practice members and the PayPal sandbox: no real money moves. Dashboard history is labelled sample data.</p>`));
await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/closing.png` });
const caps = {
  "cap-sandbox": "PayPal sandbox · no real money",
  "cap-practice": "Practice member · no PayPal call, no real charge",
  "cap-wait": "Waited ~20 s off-camera for PayPal's signed webhook",
  "cap-sample": "Includes SAMPLE data: a labelled synthetic history",
  "cap-aiwait": "AI wait trimmed",
};
for (const [k, t] of Object.entries(caps)) {
  await p.setContent(`<html><head><style>${base} body{background:transparent}
  .pill{position:absolute;right:48px;bottom:44px;font-size:30px;font-weight:600;color:#fff;background:rgba(15,23,42,.86);padding:16px 28px 16px 24px;border-radius:999px;display:flex;align-items:center;gap:14px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .dot{width:14px;height:14px;border-radius:50%;background:#2dd4bf}</style></head><body><div class="pill"><span class="dot"></span>${t}</div></body></html>`);
  await p.screenshot({ path: `${OUT}/${k}.png`, omitBackground: true });
}
await b.close();
