import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { userSessions, profiles, userRoles } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface AuthUser {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

async function resolveUser(token: string): Promise<AuthUser | null> {
  // 1. Try Supabase JWT
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        const uid: string = data.id;
        const [role] = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, uid))
          .limit(1);
        return { userId: uid, role: role?.role ?? "user" };
      }
    } catch { /* fall through */ }
  }

  // 2. Try local session token
  try {
    const now = new Date();
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, now)))
      .limit(1);
    if (!session) return null;
    const [role] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, session.userId))
      .limit(1);
    return { userId: session.userId, role: role?.role ?? "user" };
  } catch {
    return null;
  }
}

/** Attaches authUser to req if token is valid — does NOT reject, for optional auth */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (token) {
    req.authUser = (await resolveUser(token)) ?? undefined;
  }
  return next();
}

/** Requires a valid authenticated user — returns 401 otherwise */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Authentication required" });
  const user = await resolveUser(token);
  if (!user) return res.status(401).json({ error: "Invalid or expired token" });
  req.authUser = user;
  return next();
}

/** Requires admin role */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (req.authUser?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  });
}
