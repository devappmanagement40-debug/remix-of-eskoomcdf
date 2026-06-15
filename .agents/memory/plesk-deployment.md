---
name: Plesk deployment workflow
description: How to build and deploy the GE Energy app to Plesk hosting without installing on the server
---

## Rule
Build the app on Replit, commit `dist/` to git, push to GitHub. On Plesk: `git pull` + restart. No npm install or build needed on Plesk.

**Why:** Plesk/Passenger environment may have wrong Node version, missing pnpm, or workspace resolution issues. Pre-building avoids all of that.

**How to apply:** Before pushing to GitHub, always run `npm run build` at the repo root. This fills `dist/` with:
- `dist/index.mjs` — bundled Express server (entry for Plesk, referenced by `app.js`)
- `dist/index.cjs` — CJS shim (referenced by `ecosystem.config.cjs` for PM2)
- `dist/public/` — Vite-built React frontend (served as static by Express in production)

## .gitignore status
`dist/` is tracked by git. Only `dist/**/*.map` (source maps) are excluded. Do NOT add `dist/` to .gitignore.

## Plesk entry point
`app.js` (root) → `import("./dist/index.mjs")` — this is the Passenger startup file.

## Required env vars in Plesk panel
- `NODE_ENV=production`
- `SUPABASE_DATABASE_URL` — Supabase Postgres connection string (app uses SSL: rejectUnauthorized:false)
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD`
- `NOWPAYMENTS_WEBHOOK_URL` (e.g. `https://geenergy.top/api/nowpayments/webhook`)

## DB connection logic
`lib/db/src/index.ts` uses `SUPABASE_DATABASE_URL || DATABASE_URL`. Supabase requires SSL (`{ rejectUnauthorized: false }`), Replit Postgres does not.
