# ESKOM Energy

A fintech/investment mobile-style React app with user authentication, product purchasing, earnings collection, lottery wheel, and admin panel — fully migrated from Supabase to Replit PostgreSQL + Express API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/eskom run dev` — run the frontend (Vite, reads PORT env)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/eskom)
- API: Express 5 (artifacts/api-server, port 8080) — secondary, frontend uses Supabase directly
- DB: **Supabase** (project `pgyqeokxqfpwxpaysdku`) — primary database
- Auth: Supabase Auth via `@supabase/supabase-js`

## Where things live

- `artifacts/eskom/src/integrations/supabase/client.ts` — Supabase drop-in wrapper (routes to Express API)
- `artifacts/eskom/src/pages/` — all app pages (Index, Products, MesProduits, Loterie, AdminPanel, etc.)
- `artifacts/api-server/src/routes/` — auth, profiles, products, payments, settings, content, db (generic + rpc + functions)
- `lib/db/src/schema/` — 8 schema files: profiles, auth, products, payments, settings, content, social, admin
- `artifacts/eskom/vite.config.ts` — proxies `/api` to `http://localhost:8080`

## Architecture decisions

- **Supabase wrapper pattern**: `client.ts` is a drop-in replacement exposing the same `supabase.auth`, `supabase.from()`, `supabase.rpc()`, `supabase.functions.invoke()` API surface — no page-level rewrites needed.
- **QueryBuilder routing**: JOIN queries (e.g. `user_products.select("*, products(...)")`) are auto-detected by regex and routed to `/api/user-products/my` instead of the generic `/api/db` endpoint.
- **Auth pattern**: phone numbers are stored directly; login/signup use `phone` field; the supabase wrapper converts to `${phone}@users.eskom.app` format for email compatibility.
- **Admin roles**: stored in `user_roles` table; `has_role` and `has_permission` RPCs are implemented in `/api/rpc/`.
- **Functions**: Supabase Edge Functions replaced by Express handlers at `/api/functions/:fn` — spin-wheel, collect-revenue, process-withdrawal, process-payment, sarah-chat.

## Product

Users can register with a phone number, deposit funds, purchase investment products, collect daily earnings, spin a lottery wheel, and withdraw earnings. Admins can manage users, approve deposits/withdrawals, configure products and wheel prizes, and view statistics.

## Gotchas

- API server runs on port **8080** (not 5000 as the default template says)
- To grant admin access: insert a row into `user_roles` with `user_id` and `role = 'admin'`
- Password verification uses bcryptjs — the `passwordHash` column stores hashed passwords
- `supabase.from("user_products").select("*, products(...)")` routes to `/api/user-products/my` (dedicated JOIN endpoint), not the generic `/api/db`
- Count queries (`select("*", {count:"exact",head:true})`) route to `/api/db?count=exact`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
