import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Note: Signup/login via Express are not used by the frontend (which uses Supabase Auth directly).
// These routes exist for internal/admin tooling only and require a valid session token.

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }
  return res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token)))
      .limit(1);
    if (!session || session.expiresAt < new Date())
      return res.status(401).json({ error: "Unauthorized" });

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.userId))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const [role] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.userId))
      .limit(1);

    return res.json({ ...profile, role: role?.role ?? "user" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
