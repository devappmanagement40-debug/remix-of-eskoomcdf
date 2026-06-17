import { Router } from "express";
import { db } from "../db";
import { profiles, userRoles, userSessions, adminPermissions, referralCommissions, userWallets } from "../db";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { toSnake } from "../utils/toSnake";

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
  const { passwordHash: _pw, ...safeProfile } = profile;
  return res.json(toSnake({ ...safeProfile, role: role?.role ?? "user" }));
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
    if (req.body[key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)] !== undefined)
      updates[key] = req.body[key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)];
  }
  updates.updatedAt = new Date();

  const [updated] = await db.update(profiles).set(updates as any).where(eq(profiles.userId, me.userId)).returning();
  return res.json(toSnake(updated));
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
  return res.json(toSnake(profile));
});

router.get("/profiles", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin" && role?.role !== "moderator") return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(profiles);
  return res.json(toSnake(all));
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
  return res.json(toSnake(updated));
});

router.get("/team/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const teamMembers = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  return res.json(toSnake(teamMembers));
});

router.get("/team", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const teamMembers = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  return res.json(toSnake(teamMembers));
});

router.get("/profiles/team/direct", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const teamMembers = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  return res.json(toSnake(teamMembers));
});

router.post("/profiles/batch", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json([]);
  const result = await db.select().from(profiles).where(inArray(profiles.userId, ids));
  const { passwordHash: _pw, ..._ } = result[0] ?? {};
  return res.json(toSnake(result.map(({ passwordHash: _p, ...p }) => p)));
});

router.get("/referral-commissions/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const commissions = await db.select().from(referralCommissions).where(eq(referralCommissions.beneficiaryId, me.id));
  return res.json(toSnake(commissions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())));
});

router.get("/user-wallets/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const wallets = await db.select().from(userWallets).where(eq(userWallets.userId, me.userId));
  return res.json(toSnake(wallets));
});

router.get("/user-wallets", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const wallets = await db.select().from(userWallets).where(eq(userWallets.userId, me.userId));
  return res.json(toSnake(wallets));
});

router.post("/user-wallets", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const { phone, network, countryCode, holderName, label } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });
  const [wallet] = await db.insert(userWallets).values({
    userId: me.userId, phone, network, countryCode, holderName, label,
  }).returning();
  return res.json(toSnake(wallet));
});

router.post("/user-wallets/batch", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json([]);
  const result = await db.select().from(userWallets).where(inArray(userWallets.id, ids));
  return res.json(toSnake(result));
});

export default router;
