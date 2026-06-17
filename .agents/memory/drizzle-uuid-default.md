---
name: Drizzle UUID default pitfall
description: .default("gen_random_uuid()") stores a literal string as the PK, causing duplicate key errors; always use .$defaultFn() instead
---

## Rule
Never use `.default("gen_random_uuid()")` on a Drizzle `text` primary key column.

**Why:** Drizzle treats the argument to `.default()` as a literal SQL string value, not a function call. PostgreSQL stores the literal string `'gen_random_uuid()'` as the row ID. The first INSERT succeeds; every subsequent INSERT tries to insert the same string and fails with `duplicate key value violates unique constraint`.

**How to apply:** Replace every occurrence with `.$defaultFn(() => crypto.randomUUID())`. This makes Drizzle generate a unique UUID in JavaScript before sending the INSERT, so the DB never needs to evaluate a default expression. `crypto` is available globally in Node.js 20 — no import needed.

```ts
// WRONG — stores literal string 'gen_random_uuid()' as ID
id: text("id").primaryKey().default("gen_random_uuid()"),

// CORRECT — Drizzle generates a real UUID client-side
id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
```

Affected files in this project (all fixed): `shared/schema.ts`, `lib/db/src/schema/{admin,auth,content,payments,products,profiles,settings}.ts`
