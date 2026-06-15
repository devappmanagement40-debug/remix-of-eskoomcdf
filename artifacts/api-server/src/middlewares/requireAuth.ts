import { Request, Response, NextFunction } from "express";
import { db, userSessions, userRoles } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

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
  try {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())))
      .limit(1);

    if (!session) return null;

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.userId))
      .limit(1);

    return { userId: session.userId, role: roleRow?.role ?? "user" };
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
