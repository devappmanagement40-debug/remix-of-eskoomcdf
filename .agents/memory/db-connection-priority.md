---
name: DB connection priority fix
description: Old SUPABASE_DATABASE_URL secret can shadow DATABASE_URL in lib/db/src/index.ts; always use DATABASE_URL only for Replit Postgres.
---

The compiled API server previously read `process.env.SUPABASE_POOLER_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL`. Because `SUPABASE_DATABASE_URL` was set as a Replit secret (pointing at the old Supabase host), it took priority and caused `getaddrinfo ENOTFOUND db.*.supabase.co` on every query.

**Fix applied:** `lib/db/src/index.ts` now reads only `process.env.DATABASE_URL` with `ssl: false`. The API server must be rebuilt (`pnpm run build` inside `artifacts/api-server`) after any change to `lib/db/src/index.ts`.

**Why:** Replit's managed Postgres injects `DATABASE_URL` automatically and does not require SSL. Legacy Supabase secrets must not be allowed to override it.

**How to apply:** If queries start failing with ENOTFOUND, check that `lib/db/src/index.ts` uses only `DATABASE_URL` and rebuild the API server dist.
