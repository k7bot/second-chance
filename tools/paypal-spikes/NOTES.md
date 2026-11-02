# Spike #1 – PayPal sandbox webhooks end to end (Nov 1 2026)

## Result: WORKS
PayPal sandbox -> public URL -> local server -> stored + signature verified.

## Setup
- `server.js` (Node 20, no deps): POST /paypal/webhook, acks 200 immediately, saves headers + raw body to `events/*.json`,
  verifies via `/v1/notifications/verify-webhook-signature` (raw body spliced verbatim into `webhook_event`), logs `verification_status`.
- `lib.js`: OAuth (client_credentials, secret from `process.env.PAYPAL_CLIENT_SECRET`, never logged), `api()` helper, `.env.sandbox` writer.
- `setup-webhook.js <url>`: lists webhooks, PATCHes the existing one (url + event types) or creates one. Saves PAYPAL_WEBHOOK_ID.
- `simulate.js [types...]`: fires simulator events.
- `setup-catalog.js`: product + "Second Chance Demo - Pro" plan ($29/mo) + a test subscription.

## Public URL: smee.io, not cloudflared
- cloudflared quick tunnel FAILED: the box's egress proxy blocks port 7844 (QUIC and HTTP2 both; TLS handshake EOF).
  tunnelmole (port 8083) and SSH tunnels (pinggy on 443) are also blocked; only plain HTTPS gets out.
- Used **smee.io** (no account, SSE over HTTPS): https://smee.io/<your-channel> -> `smee-client` -> http://localhost:8787/paypal/webhook.
- Caveat: smee re-serializes the JSON body. Verification still passes because PayPal's verify API takes the event as JSON.
  Production (Vercel) gets the real raw body anyway. smee is for dev only (public channel, anyone with the URL can read payloads).

## Webhook
- id `51164201KX432424G` → https://smee.io/<your-channel>
- Events: BILLING.SUBSCRIPTION.{CREATED,ACTIVATED,UPDATED,CANCELLED,SUSPENDED,PAYMENT.FAILED,EXPIRED,RE-ACTIVATED}, PAYMENT.SALE.COMPLETED
- When moving to Vercel: `node setup-webhook.js https://<app>.vercel.app/paypal/webhook` (updates in place; ID stays the same).

## Simulator results
| Event | Simulate API | Arrived | verification_status |
|---|---|---|---|
| BILLING.SUBSCRIPTION.CANCELLED | 202 | yes | SUCCESS |
| BILLING.SUBSCRIPTION.SUSPENDED | 202 | yes | SUCCESS |
| BILLING.SUBSCRIPTION.PAYMENT.FAILED | 400 with `resource_version:"2.0"` ("Not a valid Resource Type"); 202 without resource_version | yes | SUCCESS |
| BILLING.SUBSCRIPTION.CREATED (real, from creating a subscription) | n/a | yes | SUCCESS |

Surprises:
- Simulated events **passed** signature verification (expected FAILURE). That's good: we can demo the verified path with the simulator.
- PAYMENT.FAILED simulate rejects `resource_version: "2.0"`; omit it (still returns a v2.0 payload).
- Simulator payloads are canned sample data (2018 dates, sub `I-BW452GLLEP1G`, plan `P-5ML4271244454362WXNWU5NQ`), and repeat
  simulations reuse the **same event id** → handler must dedupe by event id and tolerate unknown subscription ids.
- Delivery latency ~1–20 s.

## Catalog (saved to ../.env.sandbox)
- PAYPAL_PRODUCT_ID=PROD-4KW2218724711422D
- PAYPAL_PLAN_PRO_ID=P-82D53391571110412NLUAGAQ (Second Chance Demo - Pro, $29 USD/month, ACTIVE)
- Test subscription I-FT1VJ935P7LG, APPROVAL_PENDING
  approve: https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-<redacted>
  (needs the sandbox buyer to approve in a browser. Not attempted.)

## Running processes
- server: `node server.js` (port 8787), log `server.log`
- relay: `smee-client`, log `tunnel.log`

---
# Spike #2 – save offers on a live sandbox subscription (Nov 1–2 2026)

The buyer approved I-FT1VJ935P7LG. GET shows **ACTIVE**: last payment $29.00 at 04:58:58Z, next billing 2026-12-01.
Webhooks: ACTIVATED (about 12 s after approval), then PAYMENT.SALE.COMPLETED (about 18 s). Both verified SUCCESS.

## Pause (suspend/activate): works, no buyer consent needed
- POST /suspend → 204. GET showed SUSPENDED about 1.4 s later. Webhook BILLING.SUBSCRIPTION.SUSPENDED after about 13 s.
- POST /activate → 204. GET showed ACTIVE about 1.9 s later. Webhook **BILLING.SUBSCRIPTION.ACTIVATED** (not RE-ACTIVATED) after about 11 s.
- Quirk: webhooks lag the API by 10–20 s. The UI should trust the API response or GET, not wait for the webhook.
  Reactivating didn't move next_billing_time (still 2026-12-01).

## Plans (product PROD-4KW2218724711422D; IDs in ../.env.sandbox)
- PAYPAL_PLAN_LITE_ID=P-0P1907131N8304825NLUBR2Y  — $15/mo
- PAYPAL_PLAN_SAVE50_ID=P-7YX82069H7011960XNLUBR3A — TRIAL $14.50 × 3, then REGULAR $29
- PAYPAL_PLAN_WINBACK_ID=P-7V031062CP0206340NLUBR3A — TRIAL $0 × 1, then REGULAR $29
- Bug fixed: the lib.js env parser regex was `[A-Z_]+` and skipped keys containing digits (SAVE50). It's now `[A-Z0-9_]+`.

## Switch plan (revise): needs buyer consent
- POST /revise → 200 with `plan_overridden:false` and an **approve** link (`/webapps/billing/subscriptions/update?ba_token=...`).
  Nothing changes until the buyer approves: GET still shows the Pro plan and ACTIVE. No webhook fired.
- Revised to Lite first (BA-47T63557DG131802U), then to Save 50%. The Save 50% link is the current one:
  https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-<redacted>
  (Assumption: the newer revise replaces the pending one. Not verified.)
- Product implication: a "switch plan" save offer is a one-tap link to PayPal's consent page. Pause is instant.

## Win-back (case 4)
- New subscription on the Win-back plan with custom_id `winback:demo-subscriber-1:I-FT1VJ935P7LG` and subscriber email:
  I-C015ES00T8EL, APPROVAL_PENDING → https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-<redacted>
- **Per-subscriber pricing override WORKS in sandbox.** Create-subscription with
  `plan: { billing_cycles: [{ sequence:1, total_cycles:0, pricing_scheme:{ fixed_price:{ value:"19.99" }}}] }` on the Pro plan
  → 201, `plan_overridden:true`, I-FGEBKPMYVRL1, and GET ?fields=plan shows $19.99. Approve:
  https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-<redacted>
  Caveat: PayPal docs say overrides may need account eligibility in live. Fine for the hackathon (sandbox).
  This means the AI can set a price per subscriber without pre-building plans (keep pre-made plans as a fallback).
- Each create fired BILLING.SUBSCRIPTION.CREATED (verified SUCCESS).

Scripts: pause-resume.js, setup-offer-plans.js, revise.js <sub> <ENV_KEY>, winback.js

## v0 app findings (Nov 1)
- Simulator payload ids: PAYMENT.FAILED uses I-BW452GLLEP1G; SUSPENDED and CANCELLED use I-PE7JWXKGVN0R (no subscriber name or status in the payload).
- A pending, unconsented revise blocks /activate: 422 SESSION_STATE_NOT_VALID ("Buyer has not agreed"). I-FT1VJ935P7LG is stuck SUSPENDED because of this.
- Nebius: the old default model returned 403; Qwen/Qwen3-30B-A3B-Instruct-2507 works at about 0.8 s per decision.
