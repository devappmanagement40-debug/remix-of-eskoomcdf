---
name: Supabase migration architecture
description: Full migration from Supabase to Express API + Replit PostgreSQL for ESKOM Energy app
---

## Pattern
- Auth: phone → `${phone}@users.eskom.app` email format; session tokens in `user_sessions` table; stored in `localStorage` as `eskom_token`
- Frontend wrapper: `artifacts/eskom/src/integrations/supabase/client.ts` — drop-in Supabase API wrapper

## QueryBuilder routing
- Generic table queries → `/api/db?table=...&filter=...` (supports eq/neq/gt/gte/lt/lte/in filters)
- COUNT queries → `/api/db?count=exact&table=...&filter=...` (triggered by `select("*", {count:"exact",head:true})`)
- `user_products` JOIN queries (select containing `products(...)`) → `/api/user-products/my` dedicated endpoint

## Key API endpoints
- `/api/auth/login|signup|logout|me` — auth routes
- `/api/user-products/my` — returns user_products with JOIN on products table as `products` JSON field
- `/api/rpc/has_role` — checks user_roles table
- `/api/rpc/has_permission` — checks admin_permissions table
- `/api/rpc/get_team_profile_ids` — returns profile IDs referred by user
- `/api/rpc/get_recent_winners` — wheel_spins JOIN profiles, masked phone
- `/api/functions/spin-wheel` — full probability logic, deducts spin, inserts wheel_spin record
- `/api/functions/collect-revenue` — daily/blocked gain type, 24h cooldown, balance update
- `/api/functions/process-withdrawal` — admin only, marks withdrawal paid
- `/api/functions/process-payment` — marks recharge as processing

**Why:** Supabase Edge Functions replaced with Express route handlers sharing the same DB pool; no network round-trips.

## Schema location
- `lib/db/src/schema/` — 8 files: profiles, auth, products, payments, settings, content, social, admin
- API server: `artifacts/api-server/src/routes/` — auth, profiles, products, payments, settings, content, db (generic + rpc + functions)
