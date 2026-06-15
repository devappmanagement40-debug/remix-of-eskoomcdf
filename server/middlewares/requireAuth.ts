import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { userRoles } from "../db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "ge-energy-jwt-secret-change-in-production";

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
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!payload?.userId) return null;
    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, payload.userId))
      .limit(1);
    return { userId: payload.userId, role: roleRow?.role ?? "user" };
  } catch {
    return null;
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (token) {
    req.authUser = (await resolveUser(token)) ?? undefined;
  }
  return next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Authentication required" });
  const user = await resolveUser(token);
  if (!user) return res.status(401).json({ error: "Invalid or expired token" });
  req.authUser = user;
  return next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (req.authUser?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  });
}
