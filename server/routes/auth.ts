import { Router } from "express";
import { db } from "../db";
import { profiles, userRoles, userSessions } from "../db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "ge-energy-jwt-secret-change-in-production";
const SESSION_DURATION_DAYS = 30;

function phoneToId(phone: string): string {
  return crypto.createHash("sha256").update(phone).digest("hex").substring(0, 36);
}

function generateReferralCode(phone: string): string {
  return (
    phone.slice(-4).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

function issueToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: `${SESSION_DURATION_DAYS}d` });
}

router.post("/auth/signup", async (req, res) => {
  const { phone, password, inviteCode, countryCode } = req.body;
  if (!phone || !password || !inviteCode) {
    return res.status(400).json({ error: "phone, password and inviteCode are required" });
  }

  try {
    const [referrer] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.referralCode, inviteCode.trim().toUpperCase()))
      .limit(1);

    if (!referrer) {
      return res.status(400).json({ error: "Invalid invitation code" });
    }

    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.phone, phone))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "This number is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const referralCode = generateReferralCode(phone);

    await db.insert(profiles).values({
      userId,
      phone,
      countryCode: countryCode || "+509",
      referralCode,
      referredBy: referrer.id,
      passwordHash,
      balance: "0",
      depositBalance: "0",
      earningsBalance: "0",
      referralBalance: "0",
      giftPoints: 0,
      spinsBalance: 0,
      vipLevel: 0,
    });

    const token = issueToken(userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await db.insert(userSessions).values({
      userId,
      token,
      expiresAt,
    });

    return res.json({
      ok: true,
      token,
      session: { access_token: token },
      user: { id: userId },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sign up failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone, email, password } = req.body;
  if ((!phone && !email) || !password) {
    return res.status(400).json({ error: "phone or email, and password are required" });
  }

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(email ? eq(profiles.email, email.trim().toLowerCase()) : eq(profiles.phone, phone))
      .limit(1);

    if (!profile || !profile.passwordHash) {
      return res.status(401).json({ error: "Incorrect number or password" });
    }

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect number or password" });
    }

    if (profile.isSuspended) {
      return res.status(403).json({ error: "Account is suspended" });
    }

    const token = issueToken(profile.userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await db.insert(userSessions).values({
      userId: profile.userId,
      token,
      expiresAt,
    });

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, profile.userId))
      .limit(1);

    const isAdmin = roleRow?.role === "admin" || roleRow?.role === "moderator";

    return res.json({
      ok: true,
      token,
      isAdmin,
      session: { access_token: token },
      user: { id: profile.userId, role: roleRow?.role ?? "user" },
      profile: {
        userId: profile.userId,
        phone: profile.phone,
        fullName: profile.fullName,
        full_name: profile.fullName,
      },
    });
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
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())))
      .limit(1);
    if (!session) return res.status(401).json({ error: "Unauthorized" });

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

router.post("/auth/change-password", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const [session] = await db.select().from(userSessions).where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date()))).limit(1);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: "oldPassword and newPassword required" });

  const valid = await bcrypt.compare(oldPassword, profile.passwordHash!);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(profiles).set({ passwordHash: newHash }).where(eq(profiles.userId, session.userId));
  return res.json({ ok: true });
});

router.post("/auth/admin-setup", async (req, res) => {
  const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || "5849466548400404084435113616";
  const { token, phone, password } = req.body;

  if (!token || token !== ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password required" });
  }

  try {
    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.phone, phone))
      .limit(1);

    if (existing) {
      const [existingRole] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, existing.userId))
        .limit(1);

      if (!existingRole) {
        await db.insert(userRoles).values({ userId: existing.userId, role: "admin" });
      } else {
        await db.update(userRoles).set({ role: "admin" }).where(eq(userRoles.userId, existing.userId));
      }
      return res.json({ ok: true, userId: existing.userId, message: "Existing user promoted to admin" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    await db.insert(profiles).values({
      userId,
      phone,
      fullName: "Administrator",
      countryCode: "+0",
      referralCode: "ADMIN001",
      passwordHash,
      balance: "0",
      depositBalance: "0",
      earningsBalance: "0",
      referralBalance: "0",
      giftPoints: 0,
      spinsBalance: 0,
      vipLevel: 0,
    });

    await db.insert(userRoles).values({ userId, role: "admin" });

    return res.json({ ok: true, userId });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Admin setup failed" });
  }
});

export default router;
