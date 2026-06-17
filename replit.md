# GE Energy

A fintech/investment mobile-style React app with user authentication, product purchasing, earnings collection, lottery wheel, and admin panel — running on **Supabase PostgreSQL** + Express API.

## Run & Operate

- `npm run dev` — starts both the frontend (Vite, port 5000) and API server (port 8080) in parallel
- Required env: `SUPABASE_DATABASE_URL` — Supabase PostgreSQL connection string (unique database)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite (`artifacts/eskom`, port 5000)
- API: Express 5 (`artifacts/api-server`, port 8080)
- DB: **Supabase PostgreSQL** via `pg` + Drizzle ORM (SSL activé)
- Auth: Custom phone/password auth with session tokens (bcryptjs + `user_sessions` table)

## Where things live

- `artifacts/eskom/src/integrations/supabase/client.ts` — auth wrapper (uses `/api` endpoints, no Supabase SDK)
- `artifacts/eskom/src/pages/` — all app pages (Index, Products, MesProduits, Loterie, AdminPanel, etc.)
- `artifacts/api-server/src/routes/` — auth, profiles, products, payments, settings, content, admin
- `lib/db/src/schema/` — 8 schema files: profiles, auth, products, payments, settings, content, social, admin
- `artifacts/eskom/vite.config.ts` — proxies `/api` to `http://localhost:8080`

## Architecture decisions

- **Database**: Supabase PostgreSQL ONLY — `SUPABASE_DATABASE_URL` env var required everywhere (Replit dev + Plesk prod)
- **Auth pattern**: phone numbers stored directly; bcryptjs hashing; sessions stored in `user_sessions` table with bearer tokens.
- **Admin roles**: stored in `user_roles` table with `app_role` enum (admin/moderator/user).
- **Admin access**: secret URL `/admin/827728389992871772661616161626E` — never expose this URL (€ remplacé par E — caractère non-ASCII causait un problème de routing)
- **File uploads**: local filesystem under `public/uploads/` served via `/uploads` static route.
- **No Supabase SDK**: the `supabase` export in `client.ts` is a local stub that routes all calls to the Express API.

## Product

Users register with a phone number, deposit funds, purchase investment products, collect daily earnings, spin a lottery wheel, and withdraw earnings. Admins manage users, approve deposits/withdrawals, configure products and wheel prizes, and view statistics.

## Gotchas

- API server runs on port **8080**; frontend dev server on port **5000**
- `SUPABASE_DATABASE_URL` must be set — no fallback to any other database
- Password verification uses bcryptjs — `password_hash` column stores hashed passwords
- DB schema is in `lib/db/src/schema/`

## User Preferences

- Keep the French-language UI as-is
- Database is Supabase ONLY — never use Replit Postgres
