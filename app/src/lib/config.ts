import fs from "node:fs";
import path from "node:path";

/**
 * Server-only config. Values come from process.env first (Vercel), then from the
 * spike's ../.env.sandbox file (local dev). The client secret is only ever read from
 * process.env and is never logged.
 */
let fileEnv: Record<string, string> | null = null;
function loadFile(): Record<string, string> {
  if (fileEnv) return fileEnv;
  fileEnv = {};
  const candidates = [process.env.SC_ENV_FILE, path.join(process.cwd(), "..", ".env.sandbox")].filter(Boolean) as string[];
  for (const f of candidates) {
    try {
      for (const line of fs.readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && m[1] !== "PAYPAL_CLIENT_SECRET") fileEnv[m[1]] = m[2].trim();
      }
      break;
    } catch {}
  }
  return fileEnv;
}
export function env(key: string, fallback = ""): string {
  return process.env[key] || loadFile()[key] || fallback;
}

export const cfg = {
  get apiBase() { return env("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com"); },
  get clientId() { return env("PAYPAL_CLIENT_ID"); },
  get webhookId() { return env("PAYPAL_WEBHOOK_ID"); },
  get productId() { return env("PAYPAL_PRODUCT_ID"); },
  get appUrl() { return env("APP_BASE_URL", "http://localhost:3000"); },
  plans: {
    get pro() { return env("PAYPAL_PLAN_PRO_ID"); },
    get lite() { return env("PAYPAL_PLAN_LITE_ID"); },
    get save50() { return env("PAYPAL_PLAN_SAVE50_ID"); },
    get winback() { return env("PAYPAL_PLAN_WINBACK_ID"); },
  },
};

/** Catalogue of the demo merchant's plans (prices mirror what was created in PayPal). */
export function planCatalog() {
  return {
    [cfg.plans.pro]: { key: "pro", name: "Brightside Pro", price: 29 },
    [cfg.plans.lite]: { key: "lite", name: "Brightside Lite", price: 15 },
    [cfg.plans.save50]: { key: "save50", name: "Pro · 50% off for 3 months", price: 14.5 },
    [cfg.plans.winback]: { key: "winback", name: "Pro · first month free", price: 29 },
  } as Record<string, { key: string; name: string; price: number }>;
}
export function planInfo(planId?: string | null) {
  if (planId && planCatalog()[planId]) return planCatalog()[planId];
  return { key: "unknown", name: "Brightside Pro", price: 29 };
}
