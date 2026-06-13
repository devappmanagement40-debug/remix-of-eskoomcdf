---
name: Supabase project credentials
description: The correct Supabase project ID and variable naming for ESKOM Energy
---

## Correct Supabase Project

- **Project ID**: `pgyqeokxqfpwxpaysdku`
- **URL**: `https://pgyqeokxqfpwxpaysdku.supabase.co`
- This was the original Lovable project, found in the `.env` file from git history (commit `1e1336c`)

## Wrong project (do not use)

- `vigdgbydpumkauibuxmn` — a different Supabase project the user confused with the original

## Environment variable names

The client.ts uses:
- `VITE_SUPABASE_PROJECT_URL` — for the project URL (set as shared env var)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — for the anon/public key (set as shared env var)

**Why non-standard names?**: The secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were set pointing to the wrong project and cannot be deleted from code. Using different variable names avoids the conflict.

**How to apply**: Always use `VITE_SUPABASE_PROJECT_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in client.ts. Never use `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` for this project.
