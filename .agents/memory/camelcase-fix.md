---
name: CamelCase vs snake_case systemic fix
description: Drizzle ORM needs camelCase property names; frontend sends snake_case; fix applied everywhere
---

## The Rule
Drizzle ORM uses the **JS property name** (camelCase) for `set({})` and `values({})`, NOT the DB column name. Passing `{ is_active: true }` is silently ignored; `{ isActive: true }` works.

**Why:** Drizzle schema defines `isActive: boolean("is_active")` — the JS key is camelCase, the DB column is snake_case.

## How to Apply

### API side (admin.ts, settings.ts, products.ts)
Add this helper and call it before any Drizzle insert/update:
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

### Frontend reading API responses (camelCase returned by Drizzle)
Always use dual-read pattern: `item.isActive ?? item.is_active` so it works regardless of API version.

### Products page series endpoint
`/api/products/series` does NOT exist — correct path is `/api/product-series`.

## Files Fixed
- `artifacts/api-server/src/routes/admin.ts` — normalizeToCamelCase added + applied to ALL PATCH/POST routes
- `artifacts/api-server/src/routes/settings.ts` — same for popup-messages routes
- `artifacts/api-server/src/routes/products.ts` — same for products routes
- `artifacts/eskom/src/pages/AdminPanel.tsx` — InfoItemsTab + ProductsTab dual-read pattern
- `artifacts/eskom/src/pages/Products.tsx` — fixed series endpoint URL

## Consequence for Existing Data
Products/items created BEFORE the fix have null values for snake_case fields (returnPercent, imageUrl, etc.). They must be re-edited in the admin panel to populate those values.
