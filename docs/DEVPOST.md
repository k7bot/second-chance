# Devpost write-up — Second Chance

Draft prepared Sunday, Nov 8, 2026 (ET) from the README, status notes, demo outline, and the live homepage. Review before pasting into Devpost. Do not add metrics that are not on screen in the hosted demo.

**Project name:** Second Chance

**Tagline:** An AI retention agent for PayPal Subscriptions merchants.

**Hosted demo:** https://second-chance-k12-4d00.vercel.app

**Try it (no accounts or PayPal login needed):**
1. Open [/store/account](https://second-chance-k12-4d00.vercel.app/store/account) and sign in as a practice member: Maya Chen (14 months), Leo Park (2 months), or Ava Ruiz (7 months). Choose Cancel membership, pick a reason, and Second Chance shows one offer written for that member. A "Demo · what Second Chance decided" panel shows the model, the offer, and why. Accept it, decline it, or use Cancel without an offer.
2. On the offer (or any Outbox message), use Email this to me. The branded email is sent from `offers@secondchance.heyremind.ai`.
3. In the [demo console](https://second-chance-k12-4d00.vercel.app/dashboard/demo), send signed sandbox webhooks (payment failed, suspended, cancelled in PayPal, payment received) and watch cases 1, 3, and 4 run.
4. On the merchant side, open the [dashboard](https://second-chance-k12-4d00.vercel.app/dashboard), then Subscribers, Offers & revenue, Outbox, Events, and [Studio](https://second-chance-k12-4d00.vercel.app/dashboard/studio). In Studio, ask: "Who should I call today?"

Everything runs on the PayPal sandbox. No real money moves.

## Inspiration

Subscription businesses lose a large share of revenue to churn, and much of it is avoidable. Some subscribers leave because a card failed. Others just needed a break, or a cheaper plan. Most small merchants on PayPal Subscriptions have no retention tooling. A cancel is just a cancel, a failed payment is just an email from PayPal, and nobody follows up with a churned subscriber.

Second Chance started from that gap: give a PayPal Subscriptions merchant the same kind of save, recovery, and win-back flow larger billing platforms offer, without trapping anyone in a cancel flow.

The demo merchant is Brightside Yoga, a fictional studio running on the PayPal sandbox.

## What it does

Second Chance listens to the merchant's PayPal subscription webhooks and adds a save flow to their cancel button. When a subscriber is about to leave, it:

1. Picks one offer that fits the situation: pause, discount, downgrade, win-back, payment recovery, or a graceful goodbye.
2. Writes a short, personal message for it.
3. Applies the offer through the PayPal Subscriptions API: suspend/activate, revise to another plan, or a new subscription with a per-subscriber price override.
4. Tracks the outcome from PayPal webhooks and reports MRR saved, save rate, and which offers work for which churn signal.

### The four cases

1. **Payment failed** (`BILLING.SUBSCRIPTION.PAYMENT.FAILED`). The member is marked at risk with a 7-day grace period and gets a recovery message. `PAYMENT.SALE.COMPLETED` closes it as saved.
2. **Cancel on the merchant's site.** The member picks a reason, then sees one offer. Pause suspends in PayPal (no extra consent). Discount revises to the Save50 plan. Downgrade revises to Lite. The buyer confirms those two in PayPal. They can also choose Cancel without an offer, so the flow never traps anyone. Declining cancels in PayPal.
3. **Subscription suspended** (`BILLING.SUBSCRIPTION.SUSPENDED`, not started by us). A come-back message; one tap calls PayPal `/activate`.
4. **Cancelled inside PayPal** (`BILLING.SUBSCRIPTION.CANCELLED`, not started by us). Win-back: a new subscription on the Win-back plan with the offer price as a plan override, sent as a one-tap approve link.

Paused subscriptions resume automatically. A daily Vercel Cron (`/api/cron/resume`, 10:00 UTC) reactivates every subscription whose pause has ended.

Real branded email is sent through Resend from `offers@secondchance.heyremind.ai`. Practice and placeholder members never get mail at fake addresses; judges can use Email this to me to see the real message.

## How I built it

The product is one Next.js app on Vercel (Hobby), with Neon Postgres in production and embedded PGlite locally. Tables are created on first use.

**PayPal (sandbox) APIs used:**
- `POST /v1/oauth2/token` for client-credentials auth (the secret is read from the environment only)
- JS SDK Buttons (`intent=subscription`, `vault=true`) on the merchant store
- `GET /v1/billing/subscriptions/{id}` to sync status and reconcile after buyer consent
- `POST …/suspend` and `POST …/activate` for pause offers, come-back reactivation, and auto-resume
- `POST …/revise` for discount (Save50 plan) and downgrade (Lite plan), with an approve link for buyer consent
- `POST …/cancel` when the member declines every offer
- `POST /v1/billing/subscriptions` (with a `plan` override) for win-back at a per-subscriber price
- `POST /v1/notifications/verify-webhook-signature` so every webhook is verified before it is acted on
- `POST /v1/notifications/simulate-event` in the demo console, to fire real signed sandbox events

Webhooks are de-duplicated by event id. Unverified events are stored but never acted on. Status changes we caused ourselves are recorded and ignored.

**AI:**
- Model: Nebius AI Studio `Qwen/Qwen3-30B-A3B-Instruct-2507` (`LLM_PROVIDER=nebius`)
- Offer engine: the model picks the offer kind, price, duration, and message from the member's context (plan, tenure, payment history, cancel reason, trigger). Guardrails clamp the result: price never below 40% of list, discounts at most 6 months, pauses at most 3 months, and a per-trigger list of allowed offers.
- Any error or timeout falls back to a deterministic rules engine, so the app works with no AI key at all.
- "Ask the grid" (AG Grid AI Toolkit): merchants type plain English and the grid's filters, grouping, and sorting change to match.
- AI analyst in AG Studio: an agent with two custom tools (`list_at_risk_members`, `retention_playbook`). It answers questions such as "Who should I call today?"

**Merchant dashboard (AG Grid, AG Charts, AG Studio):**
- Overview: AG Charts combo chart (stacked weekly MRR saved per offer plus a cumulative line) and a donut, plus two live compact grids
- Subscribers: AG Grid Enterprise with row grouping, saved views, master/detail (PayPal event timeline, offer history, member card), 12-month payment sparklines, set filters, export, and the AI Toolkit
- Offers & revenue: pivot mode (trigger × offer) with switchable measures and a linked integrated pivot chart
- Event timeline: every PayPal webhook with signature status
- Studio: pages for Retention, Members, and PayPal webhooks, a custom Save-flow Sankey widget, and the AI analyst

## Challenges I ran into

PayPal refuses a price override on the same plan (`OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED`), so discounts revise to a separate Save50 plan. Revise is refused while a subscription is suspended. A revise that is still waiting for buyer consent makes `/activate` fail (`422 SESSION_STATE_NOT_VALID`), so the app refuses to pause while a revise is pending.

The PayPal JS SDK buttons render blank in headless screenshots, even though they work in a normal browser. Simulator events reuse one event id per type, so a repeat is de-duplicated; the demo console has a Replay action for that. Webhooks lag the API by about 10 to 20 seconds, so the UI trusts the API response and the demo outline waits for delivery off-camera.

The hosted demo is a public site with a paid AI key and real email, so it needed light per-visitor limits that fail open. Judges should not get blocked during normal use.

## Accomplishments that I'm proud of

The four retention cases run end to end on the PayPal sandbox, with verified, de-duplicated webhooks. The save flow always leaves Cancel without an offer available, so it never feels like a trap.

The AI is clamped by guardrails and has a rules fallback, so a model timeout still produces a valid offer. The merchant side is a real triage workspace (grids, pivots, Studio, and an analyst that can answer who to call today), not only a storefront demo.

Judges can try the product without creating an account or logging into PayPal, including seeing a real branded email.

## What I learned

PayPal Subscriptions already has the primitives for pause, revise, cancel, and a new subscription with a plan override. The hard part is sequencing those calls around buyer consent and ignoring echoes of your own webhook events.

Retention copy is only useful if the offer can actually be applied. That is why the engine is allowed to pick the message, but not to invent an offer the APIs and guardrails cannot honor.

## What's next

Keep the hosted demo available for judges through December 15, 2026 (ET). Before judging, re-check the AG Grid Enterprise / AG Studio trial key, which expires December 2, 2026, during the judging window. Historical vendor confirmation is that expiry adds a watermark without disabling the product; that has not been independently verified after expiry.

## Built with

PayPal Subscriptions API, PayPal JS SDK, PayPal Webhooks, Nebius AI Studio, Qwen/Qwen3-30B-A3B-Instruct-2507, AG Grid Enterprise, AG Grid AI Toolkit, AG Charts, AG Studio, Next.js, Vercel, Neon Postgres, Drizzle, Resend, TypeScript

## Suggested gallery screenshots

These are already in `docs/screenshots/`:
- `20-overview.png` — retention overview
- `06-cancel-offer.png` — save offer
- `14-welcome-back-1.png` — win-back landing
- `12-outbox.png` — AI-written offer log
- `22-subscriber-detail.png` — subscriber master/detail
- `25-offers-pivot-chart-mrr.png` — pivot and integrated chart
- `34-studio-ai-analyst.png` — Studio AI analyst
- `24-subscribers-ai-toolkit.png` — ask-the-grid
