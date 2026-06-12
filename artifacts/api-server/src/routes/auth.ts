import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = Router();

router.post("/auth/signup", async (req, res) => {
  const { phone, password, countryCode, referralCode } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "Phone and password required" });

  try {
    const email = `${phone}@users.eskom.app`;
    const userId = crypto.randomUUID();

    const existing = await db.select().from(profiles).where(eq(profiles.phone, phone)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "Phone already registered" });

    let referredById: string | null = null;
    if (referralCode) {
      const ref = await db.select().from(profiles).where(eq(profiles.referralCode, referralCode)).limit(1);
      if (ref.length > 0) referredById = ref[0].id;
    }

    const newReferralCode = phone.slice(-4).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);

    const [profile] = await db.insert(profiles).values({
      id: crypto.randomUUID(),
      userId,
      phone,
      countryCode,
      referralCode: newReferralCode,
      referredBy: referredById,
      balance: "0",
      depositBalance: "0",
      earningsBalance: "0",
      referralBalance: "0",
    }).returning();

    await db.insert(userRoles).values({ id: crypto.randomUUID(), userId, role: "user" });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(userSessions).values({ id: crypto.randomUUID(), userId, token, expiresAt });

    // @ts-ignore
    profile.passwordHash = passwordHash;

    return res.json({ token, userId, profile });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sign up failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "Phone and password required" });

  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.phone, phone)).limit(1);
    if (!profile) return res.status(401).json({ error: "Invalid credentials" });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(userSessions).values({ id: crypto.randomUUID(), userId: profile.userId, token, expiresAt });

    return res.json({ token, userId: profile.userId, profile });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

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
    const [session] = await db.select().from(userSessions).where(
      and(eq(userSessions.token, token))
    ).limit(1);
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Unauthorized" });

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, session.userId)).limit(1);

    return res.json({ ...profile, role: role?.role ?? "user" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
