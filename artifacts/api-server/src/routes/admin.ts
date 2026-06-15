import { Router } from "express";
import { db } from "@workspace/db";
import {
  profiles, userRoles, adminPermissions, adminLogs, vipConditions, vipHistory,
  userSessions, userProducts, referralCommissions,
  banners, infoItems, faqItems, popupMessages, officialDocuments, giftCodes, giftRewards, giftCodeUses,
  wheelPrizes, wheelSpins,
  chatMessages,
  siteSettings, socialLinks,
  countries, paymentMethods, withdrawalMethods, paymentApiConfigs,
  recharges, withdrawals, userWallets,
  productSeries, products,
} from "@workspace/db";
import { eq, inArray, desc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

async function getRole(userId: string) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  return role?.role ?? "user";
}

async function requireAdmin(req: any, res: any): Promise<{ me: any; role: string } | null> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const me = await getProfileFromToken(token);
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const role = await getRole(me.userId);
  if (role !== "admin" && role !== "moderator") { res.status(403).json({ error: "Forbidden" }); return null; }
  return { me, role };
}

async function requireAdminOnly(req: any, res: any): Promise<{ me: any } | null> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const me = await getProfileFromToken(token);
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const role = await getRole(me.userId);
  if (role !== "admin") { res.status(403).json({ error: "Forbidden" }); return null; }
  return { me };
}

// ─── Admin check ────────────────────────────────────────────────────────────
router.get("/admin/check", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const role = await getRole(me.userId);
  if (role !== "admin" && role !== "moderator") return res.status(403).json({ error: "Forbidden" });
  const perms = await db.select().from(adminPermissions).where(eq(adminPermissions.userId, me.userId));
  return res.json({ isAdmin: true, role, permissions: perms.map(p => p.permission) });
});

// ─── Admin logs ──────────────────────────────────────────────────────────────
router.post("/admin/logs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { action, targetType, targetId, details } = req.body;
  const [log] = await db.insert(adminLogs).values({
    id: crypto.randomUUID(),
    adminId: auth.me.userId,
    action,
    targetType,
    targetId,
    details,
  }).returning();
  return res.json(log);
});

router.get("/admin/logs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(adminLogs);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

// ─── Profiles batch ──────────────────────────────────────────────────────────
router.post("/profiles/batch", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) return res.json([]);
  const result = await db.select().from(profiles).where(inArray(profiles.userId, ids));
  return res.json(result);
});

// ─── User wallets batch ──────────────────────────────────────────────────────
router.post("/user-wallets/batch", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { userIds } = req.body as { userIds: string[] };
  if (!Array.isArray(userIds) || userIds.length === 0) return res.json([]);
  const result = await db.select().from(userWallets).where(inArray(userWallets.userId, userIds));
  return res.json(result);
});

// ─── Admin users ─────────────────────────────────────────────────────────────
router.patch("/admin/users/:userId", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const allowed = ["fullName", "phone", "countryCode", "balance", "depositBalance", "earningsBalance", "referralBalance", "giftPoints", "spinsBalance", "vipLevel", "isSuspended"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [updated] = await db.update(profiles).set(updates as any).where(eq(profiles.userId, req.params.userId)).returning();
  return res.json(updated);
});

router.delete("/admin/users/:userId", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(profiles).where(eq(profiles.userId, req.params.userId));
  return res.json({ ok: true });
});

// ─── Admin team (moderators) ─────────────────────────────────────────────────
router.get("/admin/team", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const mods = await db.select().from(userRoles).where(eq(userRoles.role, "moderator" as any));
  const admins = await db.select().from(userRoles).where(eq(userRoles.role, "admin" as any));
  const all = [...admins, ...mods];
  const userIds = all.map(r => r.userId);
  const teamProfiles = userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.userId, userIds)) : [];
  const perms = await db.select().from(adminPermissions);
  return res.json(all.map(r => ({
    ...r,
    profile: teamProfiles.find(p => p.userId === r.userId) ?? null,
    permissions: perms.filter(p => p.userId === r.userId).map(p => p.permission),
  })));
});

router.post("/admin/team", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const { userId, role, permissions } = req.body;
  const existing = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userRoles).set({ role }).where(eq(userRoles.userId, userId));
  } else {
    await db.insert(userRoles).values({ id: crypto.randomUUID(), userId, role });
  }
  if (Array.isArray(permissions)) {
    await db.delete(adminPermissions).where(eq(adminPermissions.userId, userId));
    for (const p of permissions) {
      await db.insert(adminPermissions).values({ id: crypto.randomUUID(), userId, permission: p, grantedBy: auth.me.userId });
    }
  }
  return res.json({ ok: true });
});

router.patch("/admin/team/:userId/permissions", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const { permissions } = req.body as { permissions: string[] };
  await db.delete(adminPermissions).where(eq(adminPermissions.userId, req.params.userId));
  for (const p of permissions ?? []) {
    await db.insert(adminPermissions).values({ id: crypto.randomUUID(), userId: req.params.userId, permission: p, grantedBy: auth.me.userId });
  }
  return res.json({ ok: true });
});

router.delete("/admin/team/:userId", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.update(userRoles).set({ role: "user" as any }).where(eq(userRoles.userId, req.params.userId));
  await db.delete(adminPermissions).where(eq(adminPermissions.userId, req.params.userId));
  return res.json({ ok: true });
});

// ─── Gift codes (admin) ───────────────────────────────────────────────────────
router.get("/admin/gift-codes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(giftCodes);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.post("/admin/gift-codes", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [code] = await db.insert(giftCodes).values({ id: crypto.randomUUID(), ...req.body, code: (req.body.code ?? "").toUpperCase() }).returning();
  return res.json(code);
});

router.patch("/admin/gift-codes/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(giftCodes).set({ ...req.body, updatedAt: new Date() }).where(eq(giftCodes.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/gift-codes/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(giftCodes).where(eq(giftCodes.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Gift rewards (admin) ─────────────────────────────────────────────────────
router.get("/admin/gift-rewards", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(giftRewards);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/gift-rewards", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [reward] = await db.insert(giftRewards).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(reward);
});

router.patch("/admin/gift-rewards/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(giftRewards).set({ ...req.body, updatedAt: new Date() }).where(eq(giftRewards.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/gift-rewards/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(giftRewards).where(eq(giftRewards.id, req.params.id));
  return res.json({ ok: true });
});

// ─── FAQ (admin) ──────────────────────────────────────────────────────────────
router.get("/admin/faq", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(faqItems);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/faq", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [item] = await db.insert(faqItems).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(item);
});

router.patch("/admin/faq/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(faqItems).set({ ...req.body, updatedAt: new Date() }).where(eq(faqItems.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/faq/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(faqItems).where(eq(faqItems.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Info items (admin) ───────────────────────────────────────────────────────
router.get("/admin/info-items", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(infoItems);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/info-items", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [item] = await db.insert(infoItems).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(item);
});

router.patch("/admin/info-items/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(infoItems).set({ ...req.body, updatedAt: new Date() }).where(eq(infoItems.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/info-items/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(infoItems).where(eq(infoItems.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Official documents (admin) ───────────────────────────────────────────────
router.get("/admin/official-documents", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(officialDocuments);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/official-documents", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [doc] = await db.insert(officialDocuments).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(doc);
});

router.patch("/admin/official-documents/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(officialDocuments).set({ ...req.body, updatedAt: new Date() }).where(eq(officialDocuments.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/official-documents/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(officialDocuments).where(eq(officialDocuments.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Banners (admin) ──────────────────────────────────────────────────────────
router.get("/admin/banners", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(banners);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/banners", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [banner] = await db.insert(banners).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(banner);
});

router.patch("/admin/banners/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(banners).set(req.body).where(eq(banners.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/banners/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(banners).where(eq(banners.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Countries (admin) ────────────────────────────────────────────────────────
router.get("/admin/countries", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(countries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/countries", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [country] = await db.insert(countries).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(country);
});

router.patch("/admin/countries/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(countries).set(req.body).where(eq(countries.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/countries/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(countries).where(eq(countries.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Withdrawal methods (admin) ───────────────────────────────────────────────
router.get("/admin/withdrawal-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(withdrawalMethods);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/withdrawal-methods", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [method] = await db.insert(withdrawalMethods).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(method);
});

router.patch("/admin/withdrawal-methods/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(withdrawalMethods).set(req.body).where(eq(withdrawalMethods.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/withdrawal-methods/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(withdrawalMethods).where(eq(withdrawalMethods.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Payment API configs (admin) ──────────────────────────────────────────────
router.get("/admin/payment-api-configs", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentApiConfigs);
  return res.json(all);
});

router.post("/admin/payment-api-configs", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [config] = await db.insert(paymentApiConfigs).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(config);
});

router.patch("/admin/payment-api-configs/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(paymentApiConfigs).set({ ...req.body, updatedAt: new Date() }).where(eq(paymentApiConfigs.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/payment-api-configs/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(paymentApiConfigs).where(eq(paymentApiConfigs.id, req.params.id));
  return res.json({ ok: true });
});

// ─── VIP conditions (admin) ───────────────────────────────────────────────────
router.get("/admin/vip-conditions", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(vipConditions);
  return res.json(all.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)));
});

router.post("/admin/vip-conditions", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [vc] = await db.insert(vipConditions).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(vc);
});

router.patch("/admin/vip-conditions/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(vipConditions).set({ ...req.body, updatedAt: new Date() }).where(eq(vipConditions.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/vip-conditions/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(vipConditions).where(eq(vipConditions.id, req.params.id));
  return res.json({ ok: true });
});

// ─── VIP update for user ──────────────────────────────────────────────────────
router.patch("/admin/users/:userId/vip", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const { vipLevel } = req.body;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.params.userId)).limit(1);
  if (!profile) return res.status(404).json({ error: "Not found" });
  await db.insert(vipHistory).values({
    id: crypto.randomUUID(),
    userId: req.params.userId,
    oldLevel: profile.vipLevel ?? 0,
    newLevel: vipLevel,
    changedBy: auth.me.userId,
  });
  const [updated] = await db.update(profiles).set({ vipLevel, updatedAt: new Date() }).where(eq(profiles.userId, req.params.userId)).returning();
  return res.json(updated);
});

// ─── Wheel prizes (admin) ─────────────────────────────────────────────────────
router.get("/admin/wheel-prizes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(wheelPrizes);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/wheel-prizes", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [prize] = await db.insert(wheelPrizes).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(prize);
});

router.patch("/admin/wheel-prizes/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(wheelPrizes).set({ ...req.body, updatedAt: new Date() }).where(eq(wheelPrizes.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/wheel-prizes/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(wheelPrizes).where(eq(wheelPrizes.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Wheel spins (admin) ──────────────────────────────────────────────────────
router.get("/admin/wheel-spins", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(wheelSpins);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/admin/wheel-spins/:id/status", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const { status } = req.body;
  const [updated] = await db.update(wheelSpins).set({ status, updatedAt: new Date() }).where(eq(wheelSpins.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Product series (admin) ───────────────────────────────────────────────────
router.get("/admin/product-series", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(productSeries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/product-series", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [series] = await db.insert(productSeries).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(series);
});

router.patch("/admin/product-series/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(productSeries).set(req.body).where(eq(productSeries.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/product-series/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(productSeries).where(eq(productSeries.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Products (admin) ────────────────────────────────────────────────────────
router.get("/admin/products", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(products);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/products", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [product] = await db.insert(products).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(product);
});

router.patch("/admin/products/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(products).set({ ...req.body, updatedAt: new Date() }).where(eq(products.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/products/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(products).where(eq(products.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Payment methods (admin) ──────────────────────────────────────────────────
router.get("/admin/payment-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentMethods);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/payment-methods", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [method] = await db.insert(paymentMethods).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(method);
});

router.patch("/admin/payment-methods/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(paymentMethods).set({ ...req.body, updatedAt: new Date() }).where(eq(paymentMethods.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/payment-methods/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(paymentMethods).where(eq(paymentMethods.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Popups / popup messages (admin) ─────────────────────────────────────────
router.get("/admin/popups", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { trigger_key } = req.query as { trigger_key?: string };
  const all = trigger_key
    ? await db.select().from(popupMessages).where(eq(popupMessages.triggerKey, trigger_key))
    : await db.select().from(popupMessages);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.post("/admin/popups", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [popup] = await db.insert(popupMessages).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(popup);
});

router.patch("/admin/popups/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(popupMessages).set({ ...req.body, updatedAt: new Date() }).where(eq(popupMessages.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/popups/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(popupMessages).where(eq(popupMessages.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Suspend / unsuspend user (admin) ─────────────────────────────────────────
router.post("/admin/users/:userId/suspend", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { suspended } = req.body as { suspended?: boolean };
  const newVal = suspended ?? true;
  const [updated] = await db.update(profiles)
    .set({ isSuspended: newVal, updatedAt: new Date() })
    .where(eq(profiles.userId, req.params.userId))
    .returning();
  if (!updated) return res.status(404).json({ error: "User not found" });
  return res.json(updated);
});

// ─── User products (admin) ────────────────────────────────────────────────────
router.get("/admin/user-products", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(userProducts);
  return res.json(all.sort((a, b) => new Date(b.purchasedAt!).getTime() - new Date(a.purchasedAt!).getTime()));
});

// ─── Referral commissions (admin) ─────────────────────────────────────────────
router.get("/admin/referral-commissions", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(referralCommissions);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

// ─── Site settings batch upsert (admin) ───────────────────────────────────────
router.post("/admin/site-settings/batch", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const { settings } = req.body as { settings: { key: string; value: string; category?: string }[] };
  if (!Array.isArray(settings)) return res.status(400).json({ error: "settings array required" });
  const results = [];
  for (const s of settings) {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, s.key)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(siteSettings).set({ value: s.value, updatedAt: new Date() }).where(eq(siteSettings.key, s.key)).returning();
      results.push(updated);
    } else {
      const [created] = await db.insert(siteSettings).values({ id: crypto.randomUUID(), key: s.key, value: s.value, category: s.category ?? "general" }).returning();
      results.push(created);
    }
  }
  return res.json(results);
});

// ─── Social links (admin) ─────────────────────────────────────────────────────
router.get("/admin/social-links", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(socialLinks);
  return res.json(all);
});

router.post("/admin/social-links", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [link] = await db.insert(socialLinks).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(link);
});

router.patch("/admin/social-links/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(socialLinks).set({ ...req.body, updatedAt: new Date() }).where(eq(socialLinks.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/social-links/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(socialLinks).where(eq(socialLinks.id, req.params.id));
  return res.json({ ok: true });
});

// ─── API configs aliases (frontend uses /admin/api-configs) ───────────────────
router.get("/admin/api-configs", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentApiConfigs);
  return res.json(all);
});

router.post("/admin/api-configs", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [config] = await db.insert(paymentApiConfigs).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(config);
});

router.patch("/admin/api-configs/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  const [updated] = await db.update(paymentApiConfigs).set({ ...req.body, updatedAt: new Date() }).where(eq(paymentApiConfigs.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/api-configs/:id", async (req, res) => {
  const auth = await requireAdminOnly(req, res);
  if (!auth) return;
  await db.delete(paymentApiConfigs).where(eq(paymentApiConfigs.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Support / chat (admin) ───────────────────────────────────────────────────
router.get("/admin/chat", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(chatMessages);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.get("/admin/chat/conversations", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const msgs = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
  // Group by user_id
  const userMap: Record<string, any[]> = {};
  for (const m of msgs) {
    if (!userMap[m.userId]) userMap[m.userId] = [];
    userMap[m.userId].push(m);
  }
  const userIds = Object.keys(userMap);
  const profileRows = userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.userId, userIds)) : [];
  const profileMap: Record<string, any> = {};
  for (const p of profileRows) profileMap[p.userId] = p;
  const convos = userIds.map((uid) => {
    const userMsgs = userMap[uid];
    const lastMsg = userMsgs[0];
    const profile = profileMap[uid];
    const unread = userMsgs.filter((m) => m.sender === "user").length;
    return { user_id: uid, full_name: profile?.fullName || "User", phone: profile?.phone || "", last_message: lastMsg.message, last_time: lastMsg.createdAt, unread_count: unread };
  }).sort((a, b) => new Date(b.last_time!).getTime() - new Date(a.last_time!).getTime());
  return res.json(convos);
});

router.get("/admin/chat/messages/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const msgs = await db.select().from(chatMessages).where(eq(chatMessages.userId, req.params.userId));
  return res.json(msgs.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
});

router.post("/admin/chat/reply", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: "user_id and message required" });
  const [msg] = await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: user_id,
    message,
    sender: "support",
    isAi: false,
  }).returning();
  return res.json(msg);
});

router.get("/admin/chat/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const msgs = await db.select().from(chatMessages).where(eq(chatMessages.userId, req.params.userId));
  return res.json(msgs.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
});

router.post("/admin/chat/:userId/reply", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  const [msg] = await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: req.params.userId,
    message,
    sender: "support",
    isAi: false,
  }).returning();
  return res.json(msg);
});

export default router;
