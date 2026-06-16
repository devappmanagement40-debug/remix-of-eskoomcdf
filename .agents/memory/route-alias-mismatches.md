---
name: Route alias mismatches
description: Frontend calls different URL patterns than the API server provides; solution is to add alias routes in the API.
---

## The pattern

The frontend (eskom) was built with one URL convention, and the API server (api-server) uses another. Rather than rewriting the frontend, add alias routes in the API.

## Known mismatches fixed

| Frontend calls | API actual route | Fixed in |
|---|---|---|
| `POST /api/products/purchase` | `POST /api/user-products/buy/:id` | products.ts |
| `GET /api/products/user-products/my` | `GET /api/user-products/my` | products.ts |
| `POST /api/products/user-products/collect` | `POST /api/user-products/:id/collect` | products.ts |
| `GET /api/products/user-products/active-by-users` | (new SQL query) | products.ts |
| `GET /api/admin/official-docs` | `GET /api/admin/official-documents` | admin.ts |
| `GET /api/wheel/prizes` | `GET /api/wheel-prizes` | content.ts |
| `GET /api/wheel/my-spins` | (new: query wheelSpins by userId) | content.ts |
| `GET /api/user-wallets/my` | `GET /api/wallets/my` | payments.ts |

**Why:** The API was refactored after the frontend was built, creating URL drift. Adding alias routes is safer than modifying the frontend because the frontend may be deployed independently.

**How to apply:** When a frontend page shows empty data or errors, grep the page for `/api/` fetch calls, then test each URL against the running server. If 404, check if a similar route exists under a different path and add an alias.

## Null field display

Products in DB can have `returnPercent: null`, `dailyRevenue: null`, `totalRevenue: null`. Frontend must guard:
- `{product.return_percent != null ? product.return_percent : '—'}%`
- `{product.total_revenue != null ? Number(...).toLocaleString() : '—'}`

Fixed in: `Products.tsx` (lines 205, 209-210, 262) and `Index.tsx` (line 210).

## 404 vs business-logic 404

A routing 404 responds in ~3ms. A business-logic 404 (DB query found nothing) takes 400-600ms. Use response time to distinguish them when debugging.
