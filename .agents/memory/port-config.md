---
name: Port config for dual-service dev
description: How Vite frontend and Express API server ports are configured in development
---

## Rule
- Vite frontend: PORT=5000 (required for Replit webview)
- Express API server: API_PORT=8080 (reads API_PORT ?? PORT ?? 8080)
- Root dev script: `PORT=5000 pnpm --filter @workspace/eskom run dev & API_PORT=8080 pnpm --filter @workspace/api-server run dev`
- Vite proxy in `artifacts/eskom/vite.config.ts`: `/api` → `http://localhost:8080`

**Why:** Replit webview requires port 5000. If both services used the same PORT env var they would conflict. The API server's `src/index.ts` was updated to read `API_PORT ?? PORT ?? 8080`.

**How to apply:** Never change the PORT=5000 on the Vite side or the webview will break. If the API port needs to change, update both API_PORT in the dev script and the vite.config.ts proxy target.
