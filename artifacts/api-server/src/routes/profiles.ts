import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions, adminPermissions, userProducts, products, referralCommissions } from "@workspace/db";
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
  const { passwordHash: _pw, ...safeProfile } = profile;
  return res.json({ ...safeProfile, role: role?.role ?? "user" });
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

// ─── GET /profiles/batch?userIds=id1,id2 (admin) — must be BEFORE /:userId ────
router.get("/profiles/batch", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin" && role?.role !== "moderator") return res.status(403).json({ error: "Forbidden" });

  const userIds = ((req.query.userIds as string) || "").split(",").filter(Boolean);
  if (userIds.length === 0) return res.json([]);
  const result = await db.select().from(profiles).where(inArray(profiles.userId, userIds));
  return res.json(result);
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

router.get("/profiles/team/direct", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const directMembers = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  return res.json(directMembers);
});

// Full team tree endpoint used by Team.tsx
router.get("/team", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  // Level B: directly referred by me
  const bRaw = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  const bIds = bRaw.map(m => m.id);

  // Level C
  let cRaw: typeof bRaw = [];
  if (bIds.length > 0) {
    cRaw = await db.select().from(profiles).where(inArray(profiles.referredBy, bIds));
  }
  const cIds = cRaw.map(m => m.id);

  // Level D
  let dRaw: typeof bRaw = [];
  if (cIds.length > 0) {
    dRaw = await db.select().from(profiles).where(inArray(profiles.referredBy, cIds));
  }

  const allUserIds = [...bRaw, ...cRaw, ...dRaw].map(m => m.userId).filter(Boolean) as string[];
  let bonusMap = new Map<string, number>();

  if (allUserIds.length > 0) {
    const userProds = await db.select({ userId: userProducts.userId, price: products.price })
      .from(userProducts)
      .leftJoin(products, eq(userProducts.productId, products.id))
      .where(inArray(userProducts.userId, allUserIds));

    const bUserIds = new Set(bRaw.map(m => m.userId));
    const cUserIds = new Set(cRaw.map(m => m.userId));
    const dUserIds = new Set(dRaw.map(m => m.userId));
    for (const up of userProds) {
      const price = Number(up.price) || 0;
      const rate = bUserIds.has(up.userId) ? 0.10 : cUserIds.has(up.userId) ? 0.05 : dUserIds.has(up.userId) ? 0.01 : 0;
      bonusMap.set(up.userId, (bonusMap.get(up.userId) || 0) + price * rate);
    }
  }

  const investedSet = new Set(allUserIds.filter(id => bonusMap.has(id)));

  const enrich = (members: typeof bRaw) => members.map(m => ({
    id: m.id,
    user_id: m.userId,
    full_name: m.fullName,
    phone: m.phone,
    country_code: m.countryCode,
    balance: m.balance,
    created_at: m.createdAt,
    is_suspended: m.isSuspended,
    hasInvested: investedSet.has(m.userId),
    bonusEarned: bonusMap.get(m.userId) || 0,
  }));

  return res.json({
    referralCode: me.referralCode,
    levelB: enrich(bRaw),
    levelC: enrich(cRaw),
    levelD: enrich(dRaw),
  });
});

router.get("/referral-commissions/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const commissions = await db.select().from(referralCommissions).where(eq(referralCommissions.beneficiaryId, me.id));
  return res.json(commissions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

export default router;
