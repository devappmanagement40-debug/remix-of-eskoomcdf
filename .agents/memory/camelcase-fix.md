---
name: CamelCase vs snake_case systemic fix
description: Drizzle ORM returns camelCase; AdminPanel expects snake_case; normalization strategy for both directions
---

## The Rule (Two Directions)

### Writing to DB (incoming requests → Drizzle)
Drizzle ORM uses the **JS property name** (camelCase) for `set({})` and `values({})`, NOT the DB column name. Passing `{ is_active: true }` is silently ignored; `{ isActive: true }` works.
→ Fix: `normalizeToCamelCase(req.body)` before every Drizzle insert/update.

### Reading from DB (Drizzle → API response → frontend)
Drizzle always returns camelCase field names. The AdminPanel (`AdminPanel.tsx`, `AdminProduits.tsx`) uses snake_case throughout (e.g., `p.is_active`, `r.user_id`, `p.proof_image_url`).
→ Fix: `toSnake(result)` on every admin GET route response.

**Why:** Without `toSnake()` on GET responses, all displayed data in the admin panel was `undefined` / empty — counts showed 0, names showed "—", images didn't load.

## How to Apply

### normalizeToCamelCase (incoming bodies)
```ts
function normalizeToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = value;
  }
  return result;
}
// Usage:
db.insert(table).values({ id: crypto.randomUUID(), ...normalizeToCamelCase(req.body) })
db.update(table).set({ ...normalizeToCamelCase(req.body), updatedAt: new Date() })
```

### toSnake (outgoing GET responses)
```ts
function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const snake = k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
      out[snake] = toSnake(v);
    }
    return out;
  }
  return obj;
}
// Usage: return res.json(toSnake(all.sort(...)));
```

## Routes that must use toSnake (admin GET routes in admin.ts)
banners, countries, withdrawal-methods, payment-api-configs, vip-conditions,
wheel-prizes, wheel-spins, product-series, products, payment-methods, popups,
social-links, api-configs, payment-logs, referral-commissions, admin-logs,
user-products (with JOIN + userId filter)

## Routes in payments.ts that must use toSnake
`/recharges` (admin-only GET), `/withdrawals` (admin-only GET)

## Exception: profiles
The AdminPanel has an explicit `mapProfile()` function that converts camelCase to snake_case. No `toSnake()` needed on the `/profiles` GET route.

## Frontend: use admin routes not public routes
AdminPanel `loadAll()` must call `/api/admin/payment-methods` (returns toSnake) NOT `/api/payment-methods` (returns camelCase).

## Other route bugs fixed alongside
- `/api/admin/check` now returns `userId` (AdminPanel sets `setAdminId(data.userId)`)
- `PATCH /admin/users/:userId/suspend` alias added (frontend calls PATCH, only POST existed)
- `/api/user-wallets/batch` accepts both `{ ids }` and `{ userIds }` field names
- `/api/admin/user-products` accepts `?userId=` query param + JOINs products table; DELETE endpoint added
- DepositsTab uses atomic routes `/api/recharges/:id/approve|reject` (prevents double-credit on concurrent calls)
