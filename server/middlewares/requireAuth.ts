import { Request, Response, NextFunction } from "express";

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/** Look up user role via Supabase REST API (no direct DB pool needed) */
async function getRoleViaApi(userId: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return "user";
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!res.ok) return "user";
    const data = await res.json();
    return data?.[0]?.role ?? "user";
  } catch {
    return "user";
  }
}

async function resolveUser(token: string): Promise<AuthUser | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  // Verify the Supabase JWT via REST API (no pool dependency)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      const uid: string = data.id;
      if (!uid) return null;
      const role = await getRoleViaApi(uid);
      return { userId: uid, role };
    }
  } catch { /* fall through */ }

  return null;
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
