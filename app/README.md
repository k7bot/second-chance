# Second Chance: app

The Next.js app. See the [root README](../README.md) for what it does, setup, env vars and the demo walkthrough.

```bash
cp ../.env.example .env.local   # fill in values
npm install && npm run dev
```

Screenshots: `node scripts/shots-grid.mjs http://localhost:3000 ../shots` (dashboard, grids, Studio) and `node scripts/shots.mjs` (store and save flow; it seeds practice members first).

Email checks (no key needed): `npx tsx scripts/email-selftest.ts` and `npx tsx scripts/render-emails.ts <dir>`.

On Vercel, set Root Directory to `app`. How the hosted demo is deployed (archive upload, `app/` path prefix, secrets in the UI): [docs/DEPLOY.md](../docs/DEPLOY.md). Status and remaining work: [docs/STATUS.md](../docs/STATUS.md).
