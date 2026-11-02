# Status

_Last updated: Mon Nov 2, 2026 (ET). Development is paused; the app is feature-complete for the hackathon._

**Deadline:** PayPal AI Hackathon, Thu Nov 12, 2026 at 3:00 PM ET. Target: submit by noon ET that day.

## Live

| | |
|---|---|
| Hosted app | https://second-chance-k12-4d00.vercel.app (alias: second-chance-omega-green.vercel.app) |
| Latest production deploy | `dpl_DXYdEFBAeQ1iAbkq3gt2hq4rZdgx`, built from commit `c9f6270` |
| Repo | `k7bot/second-chance`, **private** until the pre-submission check (see below) |

## Done

- **Four retention cases end to end on the PayPal sandbox:** failed-payment recovery, save offers on the merchant's cancel page, come-back after a suspend, win-back after a cancel inside PayPal. Webhooks are verified and de-duplicated.
- **Offer engine:** Nebius AI Studio `Qwen/Qwen3-30B-A3B-Instruct-2507` with guardrails and a deterministic rules fallback (`OFFER_ENGINE=auto`, `LLM_PROVIDER=nebius`).
- **Merchant dashboard:** AG Grid Enterprise (grouping, master/detail, sparklines, pivot + integrated chart, AI Toolkit "ask the grid"), AG Charts, AG Studio with a Save-flow Sankey and an AI analyst (same Qwen model).
- **Hosting:** Vercel (Hobby, project `second-chance`, Root Directory `app`, Node 22) + Neon Postgres (`delicate-frost-33375050`, us-east-1). Tables are created on first use and the demo is seeded. See [DEPLOY.md](DEPLOY.md).
- **PayPal webhook** `51164201KX432424G` points at `https://second-chance-k12-4d00.vercel.app/api/paypal/webhook`; signature verification passes on Vercel.
- **Auto-resume cron:** `/api/cron/resume` daily at 10:00 UTC (5:00 AM ET), protected by `CRON_SECRET` (401 without it, 200 with it).
- **Abuse limits:** per-IP hourly and global daily caps for AI calls, demo actions and "Email this to me", stored in the Neon `rate_limits` table with salted IP hashes. Fails open. `Authorization: Bearer <CRON_SECRET>` skips the demo limits.
- **Real email via Resend** from `offers@secondchance.heyremind.ai` (domain verified in Resend; DNS records in Namecheap for heyremind.ai; send-only key `second-chance-prod` scoped to that domain). Branded templates for all four cases plus confirmations; Outbox shows delivery status. "Email this to me" works for practice members. Live test sent Nov 2 (Resend accepted it; inbox placement not checked).
- **Store and cancel-flow polish** (`c9f6270`): accessible reason picker, specific CTAs, **"Cancel without an offer"** (`POST /api/save/cancel`), a demo-only **"what Second Chance decided"** panel (model, offer and why) for practice members, access-until / paused-until states, contrast and focus fixes.
- Daily AI-spend check routine is running (Nebius account has a $25 balance).

## Remaining

| When | Task |
|---|---|
| Before Nov 10 | Demo video, **under 3 minutes**, on **public YouTube** |
| Before Nov 10 | Devpost write-up (problem, the 4 cases, PayPal APIs, AI, AG Grid/Studio, screenshots, hosted link) |
| Optional | Install the Vercel GitHub App on the repo so pushes deploy automatically (today deploys are manual archive uploads) |
| ~Nov 10 | Final leaked-key check (`gitleaks` on full history) and **make the repo public, only with Kiran's OK** |
| Nov 10 | **Feature freeze** |
| Nov 11 | Buffer day (fixes only) |
| Nov 12, by noon ET | **Submit** (hard deadline 3:00 PM ET) |

## Known caveats

- **Nebius serverless model retirement, Nov 9, 2026.** Qwen3-235B is already off the list; the app uses `Qwen/Qwen3-30B-A3B-Instruct-2507`. Re-check the model is still served after Nov 9. If it is not, set `LLM_MODEL` / `STUDIO_AI_MODEL` to a supported model; offers fall back to the rules engine on any error, so the demo keeps working either way.
- **AG Grid Enterprise / AG Studio trial key** (30 days) expires **Dec 2, 2026**. After that a watermark appears; that is acceptable (judging ends before then).
- **Stuck sandbox subscription `I-FT1VJ935P7LG`:** it stays SUSPENDED because an unconsented revise blocks `/activate` (`422 SESSION_STATE_NOT_VALID`). Harmless; don't use it in the demo.
- **PayPal buttons render blank in headless screenshots** (the JS SDK iframe doesn't paint in headless Chromium). They work in a real browser; record the video in a normal browser.
- Two leftover test offers (`off_mvzsv1bq1ghdr` Leo, `off_mvztn1643mjkf` Maya) are still "proposed". Harmless; a demo reset clears practice data.
- Vercel Hobby allows one cron run per day, so auto-resume runs once daily rather than hourly.
- `/dashboard` has no auth (single-merchant demo).
