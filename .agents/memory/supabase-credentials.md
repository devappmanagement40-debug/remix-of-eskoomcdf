---
name: Supabase project configuration
description: Durable guidance on Supabase setup for ESKOM Energy — no credentials stored here
---

## Project selection

The original Lovable project used a Supabase project whose credentials were committed to the git history in a `.env` file. If credentials are ever needed again, find them in the original `.env` from git history rather than storing them here.

## Environment variable naming convention

The frontend client reads from:
- `VITE_SUPABASE_PROJECT_URL` — project REST URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the anon/public API key

**Why non-standard names**: The secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were set pointing to the wrong project and cannot be deleted from code. Using different variable names avoids the conflict. These are set as shared env vars (not secrets) via Replit.

**How to apply**: Always use `VITE_SUPABASE_PROJECT_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in `artifacts/eskom/src/integrations/supabase/client.ts`. Never rely on `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.

## Auth pattern

- Frontend auth: Supabase Auth exclusively (`supabase.auth.signIn`, etc.)
- Profile data: `supabase.from('profiles').select('*').eq('user_id', userId)`
- The Express API `/api/auth/login` and `/api/auth/signup` routes are NOT used by the frontend
- Hooks `useRealtimeProfile` and `useVipProgress` use Supabase directly (not Express API)

## API security model

- `/api/db` GET: public tables readable without auth; user-scoped tables (user_products, recharges, etc.) auto-filter to caller's user_id; admin tables require admin role
- `/api/db` POST/PATCH/DELETE: require auth + ownership or admin role
- Auth verified via Supabase JWT (`/auth/v1/user` endpoint) with local session token fallback
- Middleware: `artifacts/api-server/src/middlewares/requireAuth.ts`
