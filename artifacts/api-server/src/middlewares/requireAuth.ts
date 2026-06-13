import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { userSessions } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function verifySupabaseToken(token: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const now = new Date();
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, now)))
      .limit(1);
    return !!session;
  } catch {
    return false;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const valid = (await verifySupabaseToken(token)) || (await verifySessionToken(token));
  if (!valid) return res.status(401).json({ error: "Invalid or expired token" });

  return next();
}
