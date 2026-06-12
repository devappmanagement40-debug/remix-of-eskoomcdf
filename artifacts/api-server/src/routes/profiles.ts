import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions, adminPermissions } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

router.get("/profiles/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const profile = await getProfileFromToken(token);
  if (!profile) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, profile.userId)).limit(1);
  return res.json({ ...profile, role: role?.role ?? "user" });
});

router.patch("/profiles/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const allowed = ["fullName", "phone", "countryCode"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  updates.updatedAt = new Date();

  const [updated] = await db.update(profiles).set(updates as any).where(eq(profiles.userId, me.userId)).returning();
  return res.json(updated);
});

router.get("/profiles/:userId", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin" && role?.role !== "moderator") return res.status(403).json({ error: "Forbidden" });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.params.userId)).limit(1);
  if (!profile) return res.status(404).json({ error: "Not found" });
  return res.json(profile);
});

router.get("/profiles", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin" && role?.role !== "moderator") return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(profiles);
  return res.json(all);
});

router.patch("/profiles/:userId/suspend", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { isSuspended } = req.body;
  const [updated] = await db.update(profiles).set({ isSuspended }).where(eq(profiles.userId, req.params.userId)).returning();
  return res.json(updated);
});

router.get("/team/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const teamMembers = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  return res.json(teamMembers);
});

export default router;
