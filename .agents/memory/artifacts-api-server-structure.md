---
name: artifacts-api-server structure
description: The real Express API is in artifacts/api-server/src/routes/, NOT server/routes/. Always edit the former.
---

## Key fact

The running API server on port 8080 is **`artifacts/api-server/src/routes/`**.
The root `server/routes/` folder exists but is NOT served by the running app — it's an abandoned parallel structure.

**Why:** The monorepo setup has `artifacts/api-server` as the actual API package. `npm run dev` starts both the Vite frontend and the api-server. The root `server/` folder was an earlier structure and is no longer used.

**How to apply:** Any route fix or addition must go to `artifacts/api-server/src/routes/` files, NOT `server/routes/`.

## Confirmed working routes (post-audit June 2026)
- All auth routes ✅
- /api/profiles/me (passwordHash removed) ✅
- /api/wheel/prizes ✅
- /api/admin/site-settings GET + PATCH/POST batch ✅
- /api/admin/users (paginated: {users,total,page,limit}) ✅
- /api/admin/chat/conversations ✅
- /api/admin/api-configs, /admin/faq, /admin/official-docs, /admin/popups ✅
- /api/referral-commissions/my, /api/user-wallets/my ✅
- /api/payments/fee-payments, /api/payments/recharges/my ✅

## Seed data
Seed was run (June 2026): 15 countries, 25 site_settings, 9 wheel prizes, 5 VIP conditions inserted.
