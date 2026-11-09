# Decisions

Short records of the choices that shape the build. Newest last.

1. **Next.js app on Vercel, Root Directory `app`.** One app holds the store, the save flow, the webhook receiver, the cron and the dashboard.
2. **Neon Postgres in production, PGlite locally.** Serverless-friendly Postgres on a free plan; the same Drizzle schema runs on embedded PGlite with no setup. Tables are created on first use, so there is no migration step.
3. **Discounts revise to a separate Save50 plan.** PayPal refuses a price override on the same plan (`OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED`). Win-backs use a new subscription with a per-subscriber plan override.
4. **LLM picks the offer, guardrails clamp it, rules are the fallback.** The demo must work with no key and through any provider outage.
5. **Nebius AI Studio, `Qwen/Qwen3-30B-A3B-Instruct-2507`.** Fast (~0.8 s per decision), cheap, and on credits Kiran already has. Moved off Qwen3-235B because Nebius retires it (serverless retirement Nov 9, 2026). Checked Nov 7 ET: our exact Qwen30B model is the recommended replacement, not a retiring model in the [official notice](https://docs.tokenfactory.nebius.com/november-2026-deprecation-notice).
6. **Light abuse limits, fail open.** Judges shouldn't be blocked, but a public demo with an AI key and real email needs caps. Postgres fixed-window counters, salted IP hashes only.
7. **Deploy from a packed archive through the Vercel connector.** The repo is private and not Git-linked; the CLI can't log in from the build box. See [DEPLOY.md](DEPLOY.md).
8. **Email through Resend from `secondchance.heyremind.ai`.** A subdomain of Kiran's domain keeps the existing Gottawatch sending setup untouched. Placeholder (`@example.com`) members never get email; "Email this to me" lets a judge see the real message.
9. **Members can cancel without seeing an offer.** The save flow must never feel like a trap; skipping is recorded as a `let_go` outcome.
10. **Repo stays private until near the deadline** and goes public only with Kiran's OK after a final leaked-key check.

11. **Hosted AI cap is 300/day; code default remains 1,500/day.** Confirmed Nov 7, 2026 ET from Vercel plain-variable metadata for production and preview, without decrypting secrets.
12. **Maintain judge access through Dec 15, 2026 ET.** The [official rules](https://paypalaihackathon.devpost.com/rules) put judging Dec 1–15. The AG trial expires Dec 2 during judging; historical vendor confirmation says watermark-only, but post-expiry behavior has not been independently tested.
13. **Studio tool calls on Nebius go through Chat Completions.** Token Factory's `/v1/responses` path for Qwen fails when emitting `function_call`; the proxy bridges tool-bearing Studio requests to `/v1/chat/completions` and re-emits Responses SSE. Base URL is `https://api.tokenfactory.nebius.com/v1`.
