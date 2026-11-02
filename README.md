# Second Chance

**An AI retention agent for PayPal Subscriptions merchants.** It saves cancellations, recovers failed payments, and wins back churned subscribers, then shows the merchant exactly what it saved.

Built for the PayPal AI Hackathon (2026). The demo merchant is **Brightside Yoga**, a fictional studio running on the PayPal sandbox.

![Retention overview](docs/screenshots/20-overview.png)

## The problem

Subscription businesses lose a large share of revenue to churn, and much of it is avoidable. Some subscribers leave because a card failed. Others just needed a break, or a cheaper plan. Most small merchants on PayPal Subscriptions have no retention tooling. A cancel is just a cancel, a failed payment is just an email from PayPal, and nobody follows up with a churned subscriber.

## What Second Chance does

Second Chance listens to the merchant's PayPal subscription webhooks and adds a save flow to their cancel button. When a subscriber is about to leave, it:

1. **Picks one offer** that fits the situation: pause, discount, downgrade, win-back, payment recovery, or a graceful goodbye.
2. **Writes a short, personal message** for it.
3. **Applies the offer through the PayPal Subscriptions API**: suspend/activate, revise to another plan, or a new subscription with a per-subscriber price override.
4. **Tracks the outcome** from PayPal webhooks and reports MRR saved, save rate, and which offers work for which churn signal.

### The four cases

| # | Trigger | What happens |
|---|---|---|
| 1 | `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | The member is marked at risk with a 7-day grace period and gets a recovery message. `PAYMENT.SALE.COMPLETED` closes it as saved |
| 2 | Cancel on the merchant's site | Save flow: reason → offer → result. **Pause** suspends in PayPal (no consent needed). **Discount** revises to the Save50 plan. **Downgrade** revises to Lite. The buyer confirms both in PayPal. Declining cancels in PayPal |
| 3 | `BILLING.SUBSCRIPTION.SUSPENDED` (not started by us) | A come-back message; one tap calls `/activate` |
| 4 | `BILLING.SUBSCRIPTION.CANCELLED` (not started by us) | Win-back: a new subscription on the Win-back plan with the offer price as a plan override, sent as a one-tap approve link. `ACTIVATED` with `custom_id=winback:<old>:<offer>` marks it saved |

Paused subscriptions resume automatically. A daily Vercel Cron (`/api/cron/resume`, 10:00 UTC; Vercel Hobby allows one run per day) reactivates every subscription whose pause has ended.

| Save offer | Win-back landing | AI-written offer log |
|---|---|---|
| ![](docs/screenshots/06-cancel-offer.png) | ![](docs/screenshots/14-welcome-back-1.png) | ![](docs/screenshots/12-outbox.png) |

## PayPal APIs used

| API | Used for |
|---|---|
| `POST /v1/oauth2/token` | Client-credentials auth (secret read from the environment only) |
| JS SDK Buttons (`intent=subscription`, `vault=true`) | Subscribe buttons on the merchant store |
| `GET /v1/billing/subscriptions/{id}` | Sync status, plan and billing info, and reconcile after buyer consent |
| `POST …/suspend`, `POST …/activate` | Pause offers, come-back reactivation, auto-resume |
| `POST …/revise` | Discount (Save50 plan) and downgrade (Lite plan), with an approve link for buyer consent |
| `POST …/cancel` | When the member declines every offer |
| `POST /v1/billing/subscriptions` (with `plan` override) | Win-back at a per-subscriber price |
| `POST /v1/notifications/verify-webhook-signature` | Every webhook is verified before it is acted on |
| `POST /v1/notifications/simulate-event` | Demo console: fire real, signed sandbox events |
| Catalog / Plans APIs (`tools/paypal-spikes`) | One-time setup of the product and the Pro, Lite, Save50 and Win-back plans |

Webhooks are de-duplicated by event id. Every event is stored, but unverified ones are never acted on. Status changes we caused ourselves are recorded and ignored.

## How AI is used

- **Offer engine** (`app/src/lib/offers/`): an LLM picks the offer kind, price, duration and message from the member's context (plan, tenure, payment history, cancel reason, trigger). Every decision is clamped by guardrails: price never below 40% of list, discounts at most 6 months, pauses at most 3 months, and a per-trigger list of allowed offers. Any error or timeout falls back to a deterministic **rules** engine, so the app works with no AI key at all.
- **"Ask the grid"** (AG Grid AI Toolkit): merchants type plain English ("members over 12 months tenure that we lost, grouped by plan") and the grid's filters, grouping and sorting change to match. Undo is one click.
- **AI analyst in AG Studio**: an agent built on the AG Studio agent framework, with two custom tools (`list_at_risk_members`, `retention_playbook`). It answers "Who should I call today?", recommends the best offer per churn signal, and hands work to Studio's built-in agents to add charts or explain a page.

Any OpenAI-compatible provider works (Nebius AI Studio, OpenAI, xAI, or a custom endpoint). Keys stay on the server. The Studio analyst calls the model through `/api/ai/responses`, a proxy with a model allow-list.

## AG Grid, AG Charts and AG Studio

| Where | What |
|---|---|
| Overview (`/dashboard`) | AG Charts combo chart (stacked weekly MRR saved per offer + cumulative line) and a donut, plus two live compact grids |
| Subscribers | AG Grid Enterprise: row grouping with a group bar, saved views, **master/detail** (PayPal event timeline, offer history, member card), **sparklines** of 12 months of payments, set filters, side bar, status bar, CSV/Excel export, live updates with cell flash, and the **AI Toolkit** |
| Offers & revenue | **Pivot mode** (trigger × offer) with switchable measures (MRR saved, offers made, a custom save-rate aggregation, % of trigger) and a linked **integrated pivot chart** |
| Event timeline | Every PayPal webhook with signature status, grouped views and quick filter |
| Studio (`/dashboard/studio`) | **AG Studio** with three pages (Retention, Members, PayPal webhooks), a relational data model (subscribers ↔ offers ↔ events + calendar), a custom **Save-flow Sankey** widget (AG Charts, cross-filtering), a matching theme, and the **AI analyst** |

All grids share one Quartz theme (`app/src/components/grid/ag-setup.ts`) tuned to the app's stone and teal palette.

| Subscribers + detail | Pivot + integrated chart | AG Studio AI analyst |
|---|---|---|
| ![](docs/screenshots/22-subscriber-detail.png) | ![](docs/screenshots/25-offers-pivot-chart-mrr.png) | ![](docs/screenshots/34-studio-ai-analyst.png) |

## Architecture

```mermaid
flowchart LR
  subgraph Buyer
    B[Member on merchant store]
  end
  subgraph PayPal["PayPal sandbox"]
    SDK[JS SDK Buttons]
    SUBS[Subscriptions API]
    WH[Webhooks]
  end
  subgraph App["Second Chance (Next.js on Vercel)"]
    STORE[/store · save flow/]
    HOOK[/api/paypal/webhook<br/>verify + dedupe/]
    RET[Retention engine<br/>cases 1–4]
    ENG{Offer engine}
    LLM[LLM · OpenAI-compatible]
    RULES[Rules fallback]
    DB[(Postgres / PGlite<br/>Drizzle)]
    OUT[Outbox · messages]
    CRON[/api/cron/resume<br/>Vercel Cron/]
    DASH[Merchant dashboard<br/>AG Grid · AG Charts · AG Studio]
    AIP[/api/ai/* proxy/]
  end
  B --> SDK --> SUBS
  B -- cancel --> STORE --> RET
  SUBS --> WH --> HOOK --> RET
  RET --> ENG
  ENG --> LLM
  ENG -. error/timeout .-> RULES
  RET -- suspend / activate / revise / cancel / create --> SUBS
  RET --> DB
  RET --> OUT
  CRON --> RET
  DB --> DASH
  DASH --> AIP --> LLM
```

## Repository layout

```
app/                  Next.js 16 app (the whole product). Vercel Root Directory = app
  src/app/            Routes: /store, /dashboard/*, /api/*
  src/lib/            PayPal client, retention engine, offer engines, DB (Drizzle)
  src/components/     UI, AG Grid views, AG Studio (data model, theme, Sankey, AI)
  scripts/            Playwright screenshot scripts
  vercel.json         Cron schedule for auto-resume
tools/paypal-spikes/  The sandbox spikes: webhook receiver, catalog/plan setup, revise, win-back, simulator
docs/screenshots/     Screenshots
.env.example          Every environment variable, with placeholders
```

## Run it locally

Requires Node 20+.

```bash
git clone https://github.com/k7bot/second-chance && cd second-chance
cp .env.example app/.env.local      # fill in your PayPal sandbox app + plan ids
cd app
npm install
npm run dev                         # or: npx next build && npx next start
```

Open http://localhost:3000. The database is created on first use: embedded PGlite in `app/.data/`, or Neon when `DATABASE_URL` is set. No migration step is needed.

**PayPal setup (once):** create a sandbox REST app, then use the scripts in `tools/paypal-spikes` to create the product and plans and to register the webhook. They write the ids to `.env.sandbox` at the repo root (git-ignored), which the app also reads; or copy them into `app/.env.local`. `setup-catalog.js` and `setup-offer-plans.js` create the plans, and `setup-webhook.js <url>` registers the webhook.

**Webhooks locally:** point the PayPal webhook at a [smee.io](https://smee.io) channel and relay it:

```bash
npx smee-client -u https://smee.io/<your-channel> -t http://localhost:3000/api/paypal/webhook
```

On Vercel, point the webhook straight at `https://<app>.vercel.app/api/paypal/webhook`.

**Deploying to Vercel:** import the repo and set **Root Directory** to `app`. Add the env vars from `.env.example`. The cron in `app/vercel.json` is picked up automatically.

## Environment variables

See [`.env.example`](.env.example).

| Var | Required | Purpose |
|---|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | yes | Sandbox REST app. The secret is read from the environment only and never logged |
| `PAYPAL_API_BASE` | no | Defaults to `https://api-m.sandbox.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | yes | Used to verify webhook signatures |
| `PAYPAL_PRODUCT_ID`, `PAYPAL_PLAN_PRO_ID`, `PAYPAL_PLAN_LITE_ID`, `PAYPAL_PLAN_SAVE50_ID`, `PAYPAL_PLAN_WINBACK_ID` | yes | Catalog created by `tools/paypal-spikes` |
| `APP_BASE_URL` | no | Used in return URLs and message links (default `http://localhost:3000`) |
| `DATABASE_URL` | no | Neon Postgres. Without it, embedded PGlite is used |
| `CRON_SECRET` | no | If set, `/api/cron/resume` requires `Authorization: Bearer <secret>` |
| `OFFER_ENGINE` | no | `auto` (default), `llm` or `rules` |
| `NEBIUS_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` | no | Any one enables the AI offer engine and the Studio analyst |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS` | no | Any other OpenAI-compatible endpoint, plus model and timeout overrides |
| `STUDIO_AI_MODELS` | no | Comma-separated models the Studio analyst may call (default: Qwen/Qwen3-30B-A3B-Instruct-2507 on Nebius, else an OpenAI mini model) |
| `STUDIO_AI_MODEL` | no | Single-model override for the Studio analyst (used when `STUDIO_AI_MODELS` is empty) |
| `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` | no | AG Grid + AG Charts Enterprise. Without it a watermark is shown |
| `NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` | no | AG Studio. Without it Studio runs in trial mode with a watermark |

## Demo walkthrough

1. **Store** (`/store`): Brightside Yoga's plans, each with a PayPal subscribe button.
2. **Cancel** (`/store/account` → *Cancel membership*): pick a reason ("too expensive", "taking a break"…). Second Chance shows one tailored offer. Accept it and PayPal is updated: a pause is instant, a discount or downgrade asks for buyer consent.
3. **Demo console** (`/dashboard/demo`): fire signed PayPal sandbox events (payment failed, suspended, cancelled in PayPal, payment received), or replay them. Watch each case run, and the outbox fill with AI-written recovery, come-back and win-back messages.
4. **Dashboard** (`/dashboard`): MRR saved, save rate, who needs attention, and live webhooks.
5. **Subscribers / Offers**: group the retention queue, open a member's PayPal timeline, pivot offers by churn signal, and ask the grid in plain English.
6. **Studio** (`/dashboard/studio`): the save-flow Sankey, then *Build · Ask AI* → "Who should I call today?"

## Sandbox and sample data

- Everything runs against the **PayPal sandbox**. No real money moves, and no real email or SMS is sent: messages go to the in-app outbox.
- **Practice members** (`DEMO-*`) run the full save flow with no PayPal calls, so the hosted demo works without a sandbox buyer login.
- **Sample history** (`SAMPLE-*` ids, verification `SAMPLE`) is a clearly labelled synthetic book of business. It gives the grids, pivots and Studio months of history to show. Load or clear it from the demo console. It never touches PayPal, and live sandbox data stays separate.
- `/dashboard` has no auth: this is a single-merchant demo.

## Known PayPal behaviour

- A price override on the *same* plan is refused (`OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED`), so discounts revise to a separate Save50 plan.
- Revise is refused while a subscription is SUSPENDED.
- A revise still awaiting buyer consent makes `/activate` fail with `422 SESSION_STATE_NOT_VALID`. The app refuses to pause while a revise is pending.
- Simulator events reuse one event id per type, so a repeat is de-duplicated. Use **Replay** in the demo console instead.
- `PAYMENT.FAILED` simulation must be sent without `resource_version`.
- Webhooks lag the API by 10–20 s, so the UI trusts the API response.

## License

[MIT](LICENSE) © 2026 Kiran Karnati
