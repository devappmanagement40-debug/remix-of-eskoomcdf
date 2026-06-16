#!/bin/bash
set -e
pnpm install --frozen-lockfile
cd lib/db && npx drizzle-kit migrate 2>&1 || true
