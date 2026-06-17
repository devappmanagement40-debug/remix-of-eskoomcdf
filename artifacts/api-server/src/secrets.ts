import { db, siteSettings } from "@workspace/db";

const SECRET_PREFIX = "secret_";
const REFRESH_MS = 5 * 60 * 1000;

let cache: Record<string, string> = {};
let lastLoaded = 0;

export async function loadSecrets(): Promise<void> {
  try {
    const rows = await db.select().from(siteSettings);
    const fresh: Record<string, string> = {};
    for (const row of rows) {
      if (row.key.startsWith(SECRET_PREFIX) && row.value?.trim()) {
        const envName = row.key.slice(SECRET_PREFIX.length).toUpperCase();
        fresh[envName] = row.value.trim();
      }
    }
    cache = fresh;
    lastLoaded = Date.now();
    const count = Object.keys(fresh).length;
    console.log(`[secrets] ${count} secret(s) loaded from Supabase DB`);
  } catch (err: any) {
    console.error("[secrets] Failed to load from DB:", err?.message);
  }
}

export function getSecret(envKey: string): string {
  if (Date.now() - lastLoaded > REFRESH_MS) {
    loadSecrets().catch(() => {});
  }
  return cache[envKey] || process.env[envKey] || "";
}
