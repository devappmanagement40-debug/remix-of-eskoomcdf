---
name: Auth token response format
description: artifacts/api-server auth routes must return top-level token field; frontend reads data.token not data.session.access_token
---

# Auth token response format

## The rule
`artifacts/api-server/src/routes/auth.ts` login AND signup responses must include `token: accessToken` at the top level alongside `session.access_token`.

**Why:** `Login.tsx` line 70 reads `data.token ?? data.session?.access_token`. If only `session.access_token` is returned (the original format), `data.token` is undefined and the string `"undefined"` gets stored in localStorage as `auth_token`, breaking all protected API calls with 401.

**How to apply:** Any time auth.ts login/signup response is modified, ensure both fields are present:
```typescript
return res.json({
  ok: true,
  token: accessToken,          // ← required by Login.tsx
  session: {
    access_token: accessToken, // ← also kept for compatibility
    ...
  },
  user: { id: profile.userId },
});
```

After any change to auth.ts, rebuild: `pnpm --filter @workspace/api-server run build` then restart the workflow.
