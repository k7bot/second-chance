# Deploying Second Chance

Production runs on **Vercel** (Hobby team `k12-4d00`, project `second-chance`, id `prj_HjG3eqY2c3Mm1qJ5uBRF0NWjVv3A`) with **Neon Postgres** (project `delicate-frost-33375050`, us-east-1).

- URL: https://second-chance-k12-4d00.vercel.app (alias second-chance-omega-green.vercel.app)
- Project settings: framework Next.js, **Root Directory `app`**, Node 22.x
- Deployment protection: Standard Protection, so the production domains above are public; per-deployment URLs and previews need a Vercel login
- Latest production deploy: `dpl_DXYdEFBAeQ1iAbkq3gt2hq4rZdgx` from commit `c9f6270`

## How deploys are done today (no Git link)

The project is **not Git-linked** (the Vercel GitHub App isn't installed on the private repo, and the Vercel CLI can't log in from the build box). Deploys are created through the Vercel connector's `create_deployment` with inline files: a packed archive of the committed `app/` tree plus the few files Vercel needs to see up front.

1. Pack the committed app (never the working tree, so `.env*`, `.data/` and `node_modules/` can't leak):

   ```bash
   git archive --format=tar HEAD:app | gzip -9 | base64 -w0 > /tmp/source.tgz.b64   # about 240 KB
   ```

2. Call `create_deployment` (team `team_a9KsFj1Eb3NUwyknVsjslJ8r`) with:
   - `name: "second-chance"`, `project: "second-chance"`, `target: "production"`
   - `files` (inline, utf-8): `app/package.json`, `app/package-lock.json`, `app/vercel.json`, `app/source.tgz.b64` (pass the base64 file with `"$file:/tmp/source.tgz.b64"`)
   - `projectSettings`: `framework: "nextjs"`, `rootDirectory: "app"`, `nodeVersion: "22.x"`, and
     `installCommand: if [ -f source.tgz.b64 ]; then base64 -d source.tgz.b64 | tar xz && rm source.tgz.b64; fi; npm install`
   - `gitMetadata`: `commitSha`, `commitRef: "main"`, `commitMessage`, `remoteUrl` (so the dashboard shows which commit is live)

3. Watch it with `get_deployment` / `list_deployment_events` until `READY` (about 1.5–2 minutes), then smoke-test `/store`, `/dashboard` and `/api/cron/resume` (401 without the token).

**Gotcha: file paths need the `app/` prefix.** Because Root Directory is `app`, Vercel looks for the project inside `app/` of the uploaded file set. Upload `package.json` instead of `app/package.json` and the build can't find the app. The archive itself is packed from `HEAD:app`, so its contents unpack straight into `app/` during install.

`package.json`, `package-lock.json` and `vercel.json` are uploaded as separate files (not only inside the archive) because Vercel reads them before the install command runs: framework detection, dependency install and the cron schedule.

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (Production and Preview). The full list with placeholders is in [`../.env.example`](../.env.example); the README has the table.

**Secrets must be pasted into the Vercel UI by hand.** Values passed to the Vercel connector are redacted to a short placeholder (even with `$file:`), so a secret set that way is silently wrong. Non-secret values (plan ids, `EMAIL_FROM`, `OFFER_ENGINE`, `LLM_PROVIDER`, limits) can be set through the connector. Secrets set in the UI: `PAYPAL_CLIENT_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `NEBIUS_API_KEY`, `RESEND_API_KEY`, the AG license key. After changing env vars, redeploy (env vars are read at build/start).

## External services wired to the deploy

| Service | Setting |
|---|---|
| PayPal sandbox webhook | id `51164201KX432424G` → `https://second-chance-k12-4d00.vercel.app/api/paypal/webhook` (`tools/paypal-spikes/setup-webhook.js <url>` updates it in place) |
| Vercel Cron | `/api/cron/resume`, `0 10 * * *` (10:00 UTC), from `app/vercel.json`; Vercel sends `Authorization: Bearer $CRON_SECRET` |
| Neon | `DATABASE_URL`; tables auto-created on first request, demo seeded from the demo console |
| Nebius AI Studio | `NEBIUS_API_KEY`, `LLM_PROVIDER=nebius`; base URL `https://api.studio.nebius.com/v1` |
| Resend | Domain `secondchance.heyremind.ai` verified (DNS in Namecheap under heyremind.ai), send-only key `second-chance-prod`; `RESEND_API_KEY`, `EMAIL_FROM` |

## Switching to Git deploys (optional)

Install the Vercel GitHub App on `k7bot/second-chance`, connect the repo to the project (Root Directory stays `app`), and remove the custom install command. Pushes to `main` then deploy automatically.
