import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions } from "@workspace/db";
import { eq, and, gt, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const router = Router();

const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || "5849466548400404084435113616";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function generateId(): string {
  return crypto.randomUUID();
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function generateReferralCode(phone: string): string {
  return (
    phone.slice(-4).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

/**
 * Assigns a realistic portrait photo from randomuser.me.
 * Gender + index are random at signup and stored permanently.
 * Photos are high-quality realistic portraits.
 */
function generateAvatarUrl(): string {
  const gender = Math.random() > 0.5 ? "men" : "women";
  const n = Math.floor(Math.random() * 100);
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(userSessions).values({
    id: generateId(),
    userId,
    token,
    expiresAt,
  });
  return token;
}

router.post("/auth/admin-setup", async (req, res) => {
  const { token, phone, password } = req.body;
  if (!token || token !== ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const [existing] = await db
      .select({ id: profiles.id, userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.phone, phone))
      .limit(1);

    let userId: string;

    if (existing) {
      // Update password for existing account (password reset via admin token)
      userId = existing.userId;
      await db.update(profiles).set({ passwordHash }).where(eq(profiles.userId, userId));
      // Ensure admin role exists
      const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
      if (!role) {
        await db.insert(userRoles).values({ id: generateId(), userId, role: "admin" });
      } else if (role.role !== "admin") {
        await db.update(userRoles).set({ role: "admin" }).where(eq(userRoles.userId, userId));
      }
    } else {
      userId = generateId();
      await db.insert(profiles).values({
        id: generateId(),
        userId,
        phone,
        fullName: "Administrator",
        countryCode: "+0",
        referralCode: "ADMIN001",
        passwordHash,
        avatarUrl: generateAvatarUrl(),
      });
      await db.insert(userRoles).values({ id: generateId(), userId, role: "admin" });
    }

    const accessToken = await createSession(userId);

    return res.json({ ok: true, userId, session: { access_token: accessToken } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Admin setup failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  const { phone, password, inviteCode, countryCode } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  try {
    // Resolve referrer only if an invite code was provided
    let referredByUserId: string | null = null;
    if (inviteCode?.trim()) {
      const [referrerRow] = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(ilike(profiles.referralCode, inviteCode.trim()))
        .limit(1);

      if (!referrerRow) {
        return res.status(400).json({ error: "Invalid invitation code" });
      }
      referredByUserId = referrerRow.userId;
    }

    const [existingUser] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.phone, phone))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({ error: "This number is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = generateId();
    const referralCode = generateReferralCode(phone);

    await db.insert(profiles).values({
      id: generateId(),
      userId,
      phone,
      countryCode: countryCode || "+509",
      referralCode,
      ...(referredByUserId ? { referredBy: referredByUserId } : {}),
      passwordHash,
      avatarUrl: generateAvatarUrl(),
    });

    await db.insert(userRoles).values({
      id: generateId(),
      userId,
      role: "user",
    });

    const accessToken = await createSession(userId);

    return res.json({
      ok: true,
      session: {
        access_token: accessToken,
        refresh_token: "",
        expires_in: SESSION_DURATION_MS / 1000,
        expires_at: Math.floor((Date.now() + SESSION_DURATION_MS) / 1000),
      },
      user: { id: userId },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sign up failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone, email, password } = req.body;
  const identifier = phone || email;
  if (!identifier || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.phone, identifier))
      .limit(1);

    if (!profile || !profile.passwordHash) {
      return res.status(401).json({ error: "Incorrect number or password" });
    }

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect number or password" });
    }

    if (profile.isSuspended) {
      const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, profile.userId)).limit(1);
      const isPrivileged = roleRow?.role === "admin" || roleRow?.role === "moderator";
      if (!isPrivileged) {
        return res.status(403).json({ error: "Account suspended" });
      }
    }

    const accessToken = await createSession(profile.userId);

    return res.json({
      ok: true,
      session: {
        access_token: accessToken,
        refresh_token: "",
        expires_in: SESSION_DURATION_MS / 1000,
        token_type: "Bearer",
      },
      user: { id: profile.userId },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/change-password", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "oldPassword and newPassword required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

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
    if (!profile || !profile.passwordHash) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(oldPassword, profile.passwordHash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(profiles).set({ passwordHash: newHash }).where(eq(profiles.userId, session.userId));

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (token) {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }
  return res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
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

export default router;
