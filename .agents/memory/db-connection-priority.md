---
name: DB connection priority and rebuild requirement
description: SUPABASE_DATABASE_URL is the active database; artifacts/api-server runs compiled dist so must be rebuilt after source changes
---

# DB connection and rebuild

## Active database (current state — June 2026)
`lib/db/src/index.ts` uses `SUPABASE_DATABASE_URL || DATABASE_URL`. `SUPABASE_DATABASE_URL` IS set (postgresql://postgres.wrtkihbt...) and takes priority. Both `server/` (port 3001, legacy) and `artifacts/api-server` (port 8080, REAL frontend backend) connect to Supabase when running with current source.

**Why this matters:** Before rebuild, `dist/index.mjs` was compiled from old source → was connecting to Replit Postgres (empty DB) while server/ used Supabase. All table data was missing on port 8080 until rebuild.

## Rebuild requirement (CRITICAL)
`artifacts/api-server` runs `node --enable-source-maps ./dist/index.mjs` (NOT tsx watch). Source changes NEVER take effect without:
1. `pnpm --filter @workspace/api-server run build`
2. Restart the `artifacts/api-server: API Server` workflow

**How to apply:** Any route/logic change in `artifacts/api-server/src/` requires rebuild + restart before testing or verifying.

## Route aliases added
These alias routes were added in admin.ts, payments.ts, and content.ts because the frontend calls different URL patterns than the base server routes:
- `/admin/faq-items` → faqItems CRUD (admin.ts)
- `/admin/popup-messages` → popupMessages CRUD (admin.ts)
- `/admin/chat-conversations` → chatMessages grouped by user (admin.ts)
- `/admin/chat-reply` → insert admin chatMessage (admin.ts)
- `DELETE /user-wallets/:id` → delete user wallet (payments.ts)
- `POST /point-exchanges` → exchange gift points for reward (content.ts)
