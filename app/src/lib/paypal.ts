import { cfg } from "./config";

let cached: { token: string; exp: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new Error("PAYPAL_CLIENT_SECRET is not set");
  const r = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cfg.clientId}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`PayPal OAuth failed (${r.status})`);
  const j = await r.json();
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return cached.token;
}

export type PPResult<T = any> = { ok: boolean; status: number; data: T; debugId?: string | null };

export async function pp<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<PPResult<T>> {
  const r = await fetch(cfg.apiBase + path, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await r.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { ok: r.ok, status: r.status, data, debugId: r.headers.get("paypal-debug-id") };
}

export const approveLink = (data: any): string | undefined =>
  (data?.links || []).find((l: any) => l.rel === "approve")?.href;

/** Verify a webhook signature. The raw body is spliced in verbatim so nothing is re-serialised. */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<string> {
  if (!cfg.webhookId) return "NO_WEBHOOK_ID";
  const h = (k: string) => JSON.stringify(headers.get(k) || "");
  const payload = `{"auth_algo":${h("paypal-auth-algo")},"cert_url":${h("paypal-cert-url")},"transmission_id":${h("paypal-transmission-id")},"transmission_sig":${h("paypal-transmission-sig")},"transmission_time":${h("paypal-transmission-time")},"webhook_id":${JSON.stringify(cfg.webhookId)},"webhook_event":${rawBody}}`;
  try {
    const r = await pp("POST", "/v1/notifications/verify-webhook-signature", payload);
    return r.ok ? r.data?.verification_status || "UNKNOWN" : `ERROR_${r.status}`;
  } catch (e) {
    return "ERROR";
  }
}

export const subs = {
  get: (id: string) => pp("GET", `/v1/billing/subscriptions/${id}`),
  suspend: (id: string, reason: string) => pp("POST", `/v1/billing/subscriptions/${id}/suspend`, { reason }),
  activate: (id: string, reason: string) => pp("POST", `/v1/billing/subscriptions/${id}/activate`, { reason }),
  cancel: (id: string, reason: string) => pp("POST", `/v1/billing/subscriptions/${id}/cancel`, { reason }),
  revise: (id: string, body: any) => pp("POST", `/v1/billing/subscriptions/${id}/revise`, body),
  create: (body: any) => pp("POST", "/v1/billing/subscriptions", body, { Prefer: "return=representation" }),
};

export const simulate = (event_type: string) =>
  pp("POST", "/v1/notifications/simulate-event", { webhook_id: cfg.webhookId, event_type });
