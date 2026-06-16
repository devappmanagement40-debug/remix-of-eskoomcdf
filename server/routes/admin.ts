import { Router } from "express";
import { db } from "../db";
import {
  profiles, userRoles, userSessions, adminPermissions, adminLogs,
  recharges, withdrawals, userWallets, withdrawalFeePayments,
  products as productsTable, productSeries, userProducts as userProductsTable,
  paymentMethods as paymentMethodsTable, socialLinks, siteSettings,
  popupMessages, banners, countries as countriesTable, vipConditions, vipHistory,
  withdrawalMethods as withdrawalMethodsTable, paymentApiConfigs, paymentLogs,
  giftCodes, giftRewards, faqItems, infoItems as infoItemsTable,
  officialDocuments, chatMessages, wheelPrizes, wheelSpins,
  referralCommissions, pointExchanges,
} from "../db";
import { eq, inArray, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// ─── snake_case → camelCase helper (normalize incoming body from frontend) ───
function normalizeToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeToCamelCase);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = normalizeToCamelCase(value);
    }
    return result;
  }
  return obj;
}

// ─── Global middleware: normalize body snake_case → camelCase for Drizzle ────
router.use((req: any, _res: any, next: any) => {
  if (["POST", "PATCH", "PUT"].includes(req.method) && req.body && typeof req.body === "object") {
    req.body = normalizeToCamelCase(req.body);
  }
  next();
});

// ─── camelCase → snake_case helper (for responses) ───────────────────────────
function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const snake = k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
      out[snake] = toSnake(v);
    }
    return out;
  }
  return obj;
}

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

async function getRole(userId: string) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  return role?.role ?? null;
}

async function requireAdmin(req: any, res: any): Promise<any | null> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const me = await getProfileFromToken(token);
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const role = await getRole(me.userId);
  if (role !== "admin" && role !== "moderator") { res.status(403).json({ error: "Forbidden" }); return null; }
  return { me, role };
}

// ─── Admin check ───────────────────────────────────────────────────────────
router.get("/admin/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const role = await getRole(me.userId);
  if (!role || (role !== "admin" && role !== "moderator")) return res.status(403).json({ error: "Forbidden" });
  const perms = await db.select().from(adminPermissions).where(eq(adminPermissions.userId, me.userId));
  return res.json({ ...me, role, permissions: perms.map(p => p.permission) });
});

// ─── /admin/check  (used by all admin pages) ────────────────────────────────
router.get("/admin/check", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const role = await getRole(me.userId);
  if (!role || (role !== "admin" && role !== "moderator")) return res.status(403).json({ error: "Forbidden" });
  const perms = await db.select().from(adminPermissions).where(eq(adminPermissions.userId, me.userId));
  return res.json({
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    userId: me.userId,
    profileId: me.id,
    permissions: perms.map(p => p.permission),
  });
});

// ─── /admin/all-data  (single bulk load for AdminPanel) ─────────────────────
router.get("/admin/all-data", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const [
      profilesAll, rechargesAll, withdrawalsAll, seriesAll, productsAll,
      paymentMethodsAll, socialLinksAll, siteSettingsAll, popupsAll, logsAll,
      countriesAll, vipAll, bannersAll, withdrawalMethodsAll, apiConfigsAll,
      paymentLogsAll,
    ] = await Promise.all([
      db.select().from(profiles),
      db.select().from(recharges),
      db.select().from(withdrawals),
      db.select().from(productSeries),
      db.select().from(productsTable),
      db.select().from(paymentMethodsTable),
      db.select().from(socialLinks),
      db.select().from(siteSettings),
      db.select().from(popupMessages),
      db.select().from(adminLogs),
      db.select().from(countriesTable),
      db.select().from(vipConditions),
      db.select().from(banners),
      db.select().from(withdrawalMethodsTable),
      db.select().from(paymentApiConfigs),
      db.select().from(paymentLogs),
    ]);

    const byDate = (a: any, b: any) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime();

    return res.json({
      profiles:          toSnake(profilesAll.sort(byDate)),
      recharges:         toSnake(rechargesAll.sort(byDate)),
      withdrawals:       toSnake(withdrawalsAll.sort(byDate)),
      series:            toSnake(seriesAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      products:          toSnake(productsAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      paymentMethods:    toSnake(paymentMethodsAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      socialLinks:       toSnake(socialLinksAll),
      siteSettings:      toSnake(siteSettingsAll),
      popups:            toSnake(popupsAll),
      adminLogs:         toSnake(logsAll.sort(byDate).slice(0, 100)),
      countries:         toSnake(countriesAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      vipConditions:     toSnake(vipAll.sort((a: any, b: any) => (a.level ?? 0) - (b.level ?? 0))),
      banners:           toSnake(bannersAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      withdrawalMethods: toSnake(withdrawalMethodsAll.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))),
      apiConfigs:        toSnake(apiConfigsAll),
      paymentLogs:       toSnake(paymentLogsAll.sort(byDate).slice(0, 200)),
    });
  } catch (err: any) {
    console.error("[admin/all-data] DB error:", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "Database error loading admin data" });
  }
});

// ─── /admin/recharges  (GET list) ───────────────────────────────────────────
router.get("/admin/recharges", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(recharges);
  const sorted = all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  const profileIds = [...new Set(sorted.map(r => r.userId))];
  const profs = profileIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.userId, profileIds)) : [];
  const profMap = Object.fromEntries(profs.map(p => [p.userId, toSnake(p)]));
  return res.json(sorted.map(r => ({ ...toSnake(r), profile: profMap[r.userId] ?? null })));
});

// ─── /admin/users  (alias routes using profile.id) ──────────────────────────
router.patch("/admin/users/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { id } = req.params;
  const { fullName, balance, depositBalance, earningsBalance, referralBalance, vipLevel, giftPoints, isSuspended } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (fullName !== undefined) updates.fullName = fullName;
  if (balance !== undefined) updates.balance = String(balance);
  if (depositBalance !== undefined) updates.depositBalance = String(depositBalance);
  if (earningsBalance !== undefined) updates.earningsBalance = String(earningsBalance);
  if (referralBalance !== undefined) updates.referralBalance = String(referralBalance);
  if (vipLevel !== undefined) updates.vipLevel = Number(vipLevel);
  if (giftPoints !== undefined) updates.giftPoints = Number(giftPoints);
  if (isSuspended !== undefined) updates.isSuspended = isSuspended;
  const [updated] = await db.update(profiles).set(updates).where(eq(profiles.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "User not found" });
  return res.json(toSnake(updated));
});

router.delete("/admin/users/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (auth.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { id } = req.params;
  const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });
  const uid = target.userId;
  await db.delete(userProductsTable).where(eq(userProductsTable.userId, uid));
  await db.delete(chatMessages).where(eq(chatMessages.userId, uid));
  await db.delete(withdrawals).where(eq(withdrawals.userId, uid));
  await db.delete(recharges).where(eq(recharges.userId, uid));
  await db.delete(wheelSpins).where(eq(wheelSpins.userId, uid));
  await db.delete(pointExchanges).where(eq(pointExchanges.userId, uid));
  await db.delete(profiles).where(eq(profiles.id, id));
  return res.json({ ok: true });
});

router.get("/admin/users/:id/detail", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { id } = req.params;
  const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });
  const { pool } = await import("../db");
  const upRes = await pool.query(`
    SELECT up.*, json_build_object('name', p.name, 'price', p.price, 'daily_revenue', p.daily_revenue, 'cycles', p.cycles) as products
    FROM user_products up JOIN products p ON p.id = up.product_id
    WHERE up.user_id = $1
  `, [target.userId]);
  const teamB = await db.select().from(profiles).where(eq(profiles.referredBy, target.id));
  const result: { products: any[]; teamB: any[]; teamC: any[]; teamD: any[] } = {
    products: upRes.rows,
    teamB: toSnake(teamB),
    teamC: [],
    teamD: [],
  };
  if (teamB.length > 0) {
    result.teamC = toSnake(await db.select().from(profiles).where(inArray(profiles.referredBy, teamB.map(m => m.id))));
    if (result.teamC.length > 0) {
      result.teamD = toSnake(await db.select().from(profiles).where(inArray(profiles.referredBy, result.teamC.map((m: any) => m.id))));
    }
  }
  return res.json(result);
});

// ─── Admin logs ─────────────────────────────────────────────────────────────
router.post("/admin/logs", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const { action, target_type, target_id, targetType, targetId, details } = req.body;
  await db.insert(adminLogs).values({ id: crypto.randomUUID(), adminId: me.userId, action, targetType: targetType ?? target_type, targetId: targetId ?? target_id, details: details ?? {} });
  return res.json({ ok: true });
});

router.get("/admin/logs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const logs = await db.select().from(adminLogs);
  return res.json(logs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 50));
});

// ─── Profiles (admin) ────────────────────────────────────────────────────────
router.get("/admin/profiles", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { page = "0", pageSize = "50" } = req.query as any;
  const from = Number(page) * Number(pageSize);
  const all = await db.select().from(profiles);
  const sorted = all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  return res.json(sorted.slice(from, from + Number(pageSize)));
});

router.patch("/admin/profiles/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { userId } = req.params;
  const updates = { ...req.body, updatedAt: new Date() };
  const [updated] = await db.update(profiles).set(updates).where(eq(profiles.userId, userId)).returning();
  return res.json(updated);
});

router.delete("/admin/profiles/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (auth.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { userId } = req.params;
  await db.delete(userProductsTable).where(eq(userProductsTable.userId, userId));
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db.delete(withdrawals).where(eq(withdrawals.userId, userId));
  await db.delete(recharges).where(eq(recharges.userId, userId));
  await db.delete(wheelSpins).where(eq(wheelSpins.userId, userId));
  await db.delete(pointExchanges).where(eq(pointExchanges.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));
  return res.json({ ok: true });
});

router.get("/admin/profiles/:userId/details", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { pool } = await import("../db");
  const upRes = await pool.query(`
    SELECT up.*, json_build_object('name', p.name, 'price', p.price, 'daily_revenue', p.daily_revenue, 'cycles', p.cycles) as products
    FROM user_products up JOIN products p ON p.id = up.product_id
    WHERE up.user_id = $1
  `, [req.params.userId]);
  const l1 = await db.select().from(profiles).where(eq(profiles.referredBy, req.params.userId));
  const result: { up: any[]; l1: any[]; l2: any[]; l3: any[] } = { up: upRes.rows, l1, l2: [], l3: [] };
  if (l1.length > 0) {
    const l1Ids = l1.map(m => m.userId);
    result.l2 = await db.select().from(profiles).where(inArray(profiles.referredBy, l1Ids));
    if (result.l2.length > 0) {
      const l2Ids = result.l2.map(m => m.userId);
      result.l3 = await db.select().from(profiles).where(inArray(profiles.referredBy, l2Ids));
    }
  }
  return res.json(result);
});

// ─── User products (admin) ───────────────────────────────────────────────────
router.delete("/admin/user-products/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(userProductsTable).where(eq(userProductsTable.id, req.params.id));
  return res.json({ ok: true });
});

router.post("/admin/user-products", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [up] = await db.insert(userProductsTable).values({ id: crypto.randomUUID(), ...req.body, isActive: true }).returning();
  return res.json(up);
});

router.get("/admin/user-products/count", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { product_id } = req.query as any;
  const all = await db.select().from(userProductsTable).where(eq(userProductsTable.productId, product_id));
  return res.json({ count: all.length });
});

// ─── Recharges (admin) ───────────────────────────────────────────────────────
router.patch("/admin/recharges/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { status, adminNote } = req.body;
  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });

  if (status === "approved" && recharge.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, recharge.userId)).limit(1);
    if (profile) {
      const amount = Number(recharge.amount);
      const pointSettingRows = await db.select().from(siteSettings).where(eq(siteSettings.key, "recharge_points_per_dollar")).limit(1);
      const ptsRate = Number(pointSettingRows[0]?.value ?? 0);
      const ptsAwarded = Math.floor(amount * ptsRate);
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + amount),
        depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
        giftPoints: (profile.giftPoints ?? 0) + ptsAwarded,
        updatedAt: new Date(),
      }).where(eq(profiles.userId, recharge.userId));
    }
  }

  const [updated] = await db.update(recharges).set({ status, adminNote, updatedAt: new Date() }).where(eq(recharges.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Withdrawals (admin) ─────────────────────────────────────────────────────
router.get("/admin/withdrawals", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(withdrawals);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/admin/withdrawals/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { status, adminNote } = req.body;
  const [updated] = await db.update(withdrawals).set({ status, adminNote, updatedAt: new Date() }).where(eq(withdrawals.id, req.params.id)).returning();
  return res.json(updated);
});

router.get("/admin/withdrawal-fee-payments", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(withdrawalFeePayments);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/admin/withdrawal-fee-payments/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(withdrawalFeePayments).set({ ...req.body, updatedAt: new Date() }).where(eq(withdrawalFeePayments.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Products & Series (admin) ───────────────────────────────────────────────
router.get("/admin/product-series", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(productSeries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/product-series", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [s] = await db.insert(productSeries).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(s);
});

router.patch("/admin/product-series/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(productSeries).set(req.body).where(eq(productSeries.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/product-series/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(productsTable).where(eq(productsTable.seriesId, req.params.id));
  await db.delete(productSeries).where(eq(productSeries.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/admin/products", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(productsTable);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/products", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [p] = await db.insert(productsTable).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(p);
});

router.patch("/admin/products/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(productsTable).set(req.body).where(eq(productsTable.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/products/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(productsTable).where(eq(productsTable.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Payment Methods (admin) ─────────────────────────────────────────────────
router.get("/admin/payment-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentMethodsTable);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/payment-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [m] = await db.insert(paymentMethodsTable).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(m);
});

router.patch("/admin/payment-methods/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(paymentMethodsTable).set(req.body).where(eq(paymentMethodsTable.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/payment-methods/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Social Links (admin) ────────────────────────────────────────────────────
router.get("/admin/social-links", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(socialLinks);
  return res.json(all);
});

router.patch("/admin/social-links/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(socialLinks).set(req.body).where(eq(socialLinks.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Banners (admin) ─────────────────────────────────────────────────────────
router.get("/admin/banners", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(banners);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/banners", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [b] = await db.insert(banners).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(b);
});

router.patch("/admin/banners/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(banners).set(req.body).where(eq(banners.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/banners/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(banners).where(eq(banners.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Countries (admin) ───────────────────────────────────────────────────────
router.get("/admin/countries", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(countriesTable);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/countries", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [c] = await db.insert(countriesTable).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(c);
});

router.patch("/admin/countries/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(countriesTable).set(req.body).where(eq(countriesTable.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/countries/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(countriesTable).where(eq(countriesTable.id, req.params.id));
  return res.json({ ok: true });
});

// ─── VIP Conditions (admin) ──────────────────────────────────────────────────
router.get("/admin/vip-conditions", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(vipConditions);
  return res.json(all.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)));
});

router.patch("/admin/vip-conditions/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(vipConditions).set(req.body).where(eq(vipConditions.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Withdrawal Methods (admin) ──────────────────────────────────────────────
router.get("/admin/withdrawal-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(withdrawalMethodsTable);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/withdrawal-methods", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [m] = await db.insert(withdrawalMethodsTable).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(m);
});

router.patch("/admin/withdrawal-methods/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(withdrawalMethodsTable).set(req.body).where(eq(withdrawalMethodsTable.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/withdrawal-methods/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Payment API Configs (admin) ─────────────────────────────────────────────
router.get("/admin/payment-api-configs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentApiConfigs);
  return res.json(toSnake(all));
});

router.post("/admin/payment-api-configs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [c] = await db.insert(paymentApiConfigs).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(toSnake(c));
});

router.patch("/admin/payment-api-configs/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(paymentApiConfigs).set(req.body).where(eq(paymentApiConfigs.id, req.params.id)).returning();
  return res.json(toSnake(updated));
});

router.delete("/admin/payment-api-configs/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(paymentApiConfigs).where(eq(paymentApiConfigs.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/admin/payment-logs", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(paymentLogs);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 100));
});

// ─── Gift Codes (admin) ──────────────────────────────────────────────────────
router.get("/admin/gift-codes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(giftCodes);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.post("/admin/gift-codes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [c] = await db.insert(giftCodes).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(c);
});

router.patch("/admin/gift-codes/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(giftCodes).set(req.body).where(eq(giftCodes.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/gift-codes/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(giftCodes).where(eq(giftCodes.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Gift Rewards (admin) ────────────────────────────────────────────────────
router.get("/admin/gift-rewards", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(giftRewards);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/gift-rewards", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [r] = await db.insert(giftRewards).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(r);
});

router.patch("/admin/gift-rewards/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(giftRewards).set(req.body).where(eq(giftRewards.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/gift-rewards/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(giftRewards).where(eq(giftRewards.id, req.params.id));
  return res.json({ ok: true });
});

// ─── FAQ Items (admin) ───────────────────────────────────────────────────────
router.get("/admin/faq-items", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(faqItems);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/faq-items", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [item] = await db.insert(faqItems).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(item);
});

router.patch("/admin/faq-items/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(faqItems).set(req.body).where(eq(faqItems.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/faq-items/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(faqItems).where(eq(faqItems.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Info Items (admin) ──────────────────────────────────────────────────────
router.get("/admin/info-items", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(infoItemsTable);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/info-items", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [item] = await db.insert(infoItemsTable).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(item);
});

router.patch("/admin/info-items/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(infoItemsTable).set(req.body).where(eq(infoItemsTable.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/info-items/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(infoItemsTable).where(eq(infoItemsTable.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Official Documents (admin) ──────────────────────────────────────────────
router.get("/admin/official-documents", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(officialDocuments);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/official-documents", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [doc] = await db.insert(officialDocuments).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(doc);
});

router.patch("/admin/official-documents/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(officialDocuments).set(req.body).where(eq(officialDocuments.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/official-documents/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(officialDocuments).where(eq(officialDocuments.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Wheel Prizes (admin) ────────────────────────────────────────────────────
router.get("/admin/wheel-prizes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(wheelPrizes);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/admin/wheel-prizes", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [prize] = await db.insert(wheelPrizes).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(prize);
});

router.patch("/admin/wheel-prizes/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const [updated] = await db.update(wheelPrizes).set(req.body).where(eq(wheelPrizes.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/admin/wheel-prizes/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(wheelPrizes).where(eq(wheelPrizes.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Wheel Spins (admin) ─────────────────────────────────────────────────────
router.get("/admin/wheel-spins", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const all = await db.select().from(wheelSpins);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 100));
});

router.patch("/admin/wheel-spins/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { status, vip_level, user_id } = req.body;
  const [updated] = await db.update(wheelSpins).set({ status }).where(eq(wheelSpins.id, req.params.id)).returning();
  if (status === "approved" && vip_level !== undefined && user_id) {
    await db.update(profiles).set({ vipLevel: vip_level }).where(eq(profiles.userId, user_id));
    await db.insert(vipHistory).values({ id: crypto.randomUUID(), userId: user_id, newLevel: vip_level, reason: "wheel_spin" }).catch(() => {});
  }
  return res.json(updated);
});

router.delete("/admin/wheel-spins", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(wheelSpins);
  return res.json({ ok: true });
});

// ─── Admin Permissions / Team ────────────────────────────────────────────────
router.post("/admin/permissions", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { userId, permissions, grantedBy } = req.body;
  const rows = permissions.map((p: string) => ({ id: crypto.randomUUID(), userId, permission: p, grantedBy }));
  await db.insert(adminPermissions).values(rows);
  return res.json({ ok: true });
});

router.delete("/admin/permissions/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { permission } = req.query as any;
  if (permission) {
    await db.delete(adminPermissions).where(and(eq(adminPermissions.userId, req.params.userId), eq(adminPermissions.permission, permission)));
  } else {
    await db.delete(adminPermissions).where(eq(adminPermissions.userId, req.params.userId));
  }
  return res.json({ ok: true });
});

// ─── Profiles with bulk IDs ──────────────────────────────────────────────────
router.post("/admin/profiles/by-ids", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json([]);
  const result = await db.select().from(profiles).where(inArray(profiles.userId, ids));
  return res.json(result);
});

// ─── User wallets (admin) ────────────────────────────────────────────────────
router.post("/admin/wallets/by-ids", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json([]);
  const result = await db.select().from(userWallets).where(inArray(userWallets.id, ids));
  return res.json(result);
});

// ─── History (user) ──────────────────────────────────────────────────────────
router.get("/user/history", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { pool } = await import("../db");
  const [depositsRes, withdrawalsRes, purchasesRes, exchangesRes, commissionsRes] = await Promise.all([
    db.select().from(recharges).where(eq(recharges.userId, me.userId)),
    db.select().from(withdrawals).where(eq(withdrawals.userId, me.userId)),
    pool.query(`
      SELECT up.id, up.purchased_at, up.total_collected,
        json_build_object('name', p.name, 'price', p.price, 'daily_revenue', p.daily_revenue, 'cycles', p.cycles) as products
      FROM user_products up JOIN products p ON p.id = up.product_id
      WHERE up.user_id = $1 ORDER BY up.purchased_at DESC
    `, [me.userId]),
    db.select().from(pointExchanges).where(eq(pointExchanges.userId, me.userId)),
    db.select().from(referralCommissions).where(eq(referralCommissions.beneficiaryId, me.userId)),
  ]);

  return res.json({
    deposits: depositsRes.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
    withdrawals: withdrawalsRes.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
    purchases: purchasesRes.rows,
    exchanges: exchangesRes.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
    commissions: commissionsRes.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()),
  });
});

// ─── User team (referral levels) ─────────────────────────────────────────────
router.get("/user/team", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const l1 = await db.select().from(profiles).where(eq(profiles.referredBy, me.id));
  const l2 = l1.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l1.map(p => p.id))) : [];
  const l3 = l2.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l2.map(p => p.id))) : [];

  const allUserIds = [...l1, ...l2, ...l3].map(p => p.userId).filter(Boolean);
  let investedUserIds = new Set<string>();
  if (allUserIds.length > 0) {
    const prods = await db.select().from(userProductsTable).where(inArray(userProductsTable.userId, allUserIds));
    investedUserIds = new Set(prods.map(p => p.userId));
  }

  const enrich = (members: typeof l1) => members.map(m => ({
    ...m,
    hasInvested: investedUserIds.has(m.userId),
    bonusEarned: 0,
  }));

  return res.json({
    l1: enrich(l1),
    l2: enrich(l2),
    l3: enrich(l3),
    referralCode: me.referralCode,
  });
});

// ─── VIP conditions (public) ─────────────────────────────────────────────────
router.get("/vip-conditions", async (req, res) => {
  const all = await db.select().from(vipConditions);
  return res.json(all.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)));
});

// ─── VIP progress (user) ─────────────────────────────────────────────────────
router.get("/user/vip-progress", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [conditions, userProductRows, settingRow, teamMembers] = await Promise.all([
    db.select().from(vipConditions),
    db.select().from(userProductsTable).where(and(eq(userProductsTable.userId, me.userId), eq(userProductsTable.isActive, true))),
    db.select().from(siteSettings).where(eq(siteSettings.key, "vip_conditions_enabled")).limit(1),
    db.select().from(profiles).where(eq(profiles.referredBy, me.id)),
  ]);

  const sorted = conditions.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const vipConditionsEnabled = settingRow[0]?.value !== "false";
  const upList = userProductRows;
  const totalPurchases = upList.length;
  const uniqueProducts = new Set(upList.map(up => up.productId)).size;
  const personalInvestment = Number(me.depositBalance ?? 0);
  const teamInvestment = teamMembers.reduce((s, m) => s + Number(m.depositBalance ?? 0), 0);
  const teamUserIds = teamMembers.map(m => m.userId);

  let activeMembers = 0;
  if (teamUserIds.length > 0) {
    const teamProds = await db.select().from(userProductsTable).where(inArray(userProductsTable.userId, teamUserIds));
    activeMembers = new Set(teamProds.map(tp => tp.userId)).size;
  }

  return res.json({
    conditions: sorted,
    vipConditionsEnabled,
    totalPurchases,
    uniqueProducts,
    personalInvestment,
    teamInvestment,
    activeMembers,
    currentVipLevel: me.vipLevel ?? 0,
  });
});

// ─── Referral tree ───────────────────────────────────────────────────────────
router.get("/admin/referral-tree/:profileId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const l1 = await db.select().from(profiles).where(eq(profiles.referredBy, req.params.profileId));
  const l2 = l1.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l1.map(p => p.id))) : [];
  const l3 = l2.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l2.map(p => p.id))) : [];
  return res.json({ l1, l2, l3 });
});

// ─── Site settings (admin upsert) ───────────────────────────────────────────
router.patch("/admin/site-settings", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  try {
    const { key, value, category } = req.body;
    if (!key) return res.status(400).json({ error: "key required" });
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(siteSettings).set({ value, updatedAt: new Date() }).where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ id: crypto.randomUUID(), key, value, category: category ?? "general" });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/site-settings PATCH] error:", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "Failed to save setting" });
  }
});

// ─── Popup messages ──────────────────────────────────────────────────────────
router.get("/admin/popup-messages", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { key } = req.query as any;
  if (key) {
    const [row] = await db.select().from(popupMessages).where(eq(popupMessages.triggerKey, key)).limit(1);
    return res.json(row ?? null);
  }
  const all = await db.select().from(popupMessages);
  return res.json(all);
});

router.patch("/admin/popup-messages/:id", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { title, message, buttonConfirm, buttonCancel, tabs, isActive } = req.body;
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (message !== undefined) updates.message = message;
  if (buttonConfirm !== undefined) updates.buttonConfirm = buttonConfirm;
  if (buttonCancel !== undefined) updates.buttonCancel = buttonCancel;
  if (tabs !== undefined) updates.tabs = tabs;
  if (isActive !== undefined) updates.isActive = isActive;
  await db.update(popupMessages).set(updates).where(eq(popupMessages.id, req.params.id));
  return res.json({ ok: true });
});

// ─── Sub-admins ──────────────────────────────────────────────────────────────
router.get("/admin/sub-admins", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const roles = await db.select().from(userRoles).where(eq(userRoles.role, "moderator" as any));
  if (roles.length === 0) return res.json([]);
  const userIds = roles.map(r => r.userId);
  const [profs, perms] = await Promise.all([
    db.select().from(profiles).where(inArray(profiles.userId, userIds)),
    db.select().from(adminPermissions).where(inArray(adminPermissions.userId, userIds)),
  ]);
  const result = userIds.map(uid => {
    const prof = profs.find(p => p.userId === uid);
    const userPerms = perms.filter(p => p.userId === uid).map(p => p.permission);
    return { user_id: uid, phone: prof?.phone ?? null, full_name: prof?.fullName ?? null, permissions: userPerms };
  });
  return res.json(result);
});

router.post("/admin/sub-admins", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { userId, permissions, grantedBy } = req.body;
  await db.insert(userRoles).values({ id: crypto.randomUUID(), userId, role: "moderator" as any });
  const rows = permissions.map((p: string) => ({ id: crypto.randomUUID(), userId, permission: p, grantedBy }));
  if (rows.length > 0) await db.insert(adminPermissions).values(rows);
  return res.json({ ok: true });
});

router.delete("/admin/sub-admins/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(adminPermissions).where(eq(adminPermissions.userId, req.params.userId));
  await db.delete(userRoles).where(and(eq(userRoles.userId, req.params.userId), eq(userRoles.role, "moderator" as any)));
  return res.json({ ok: true });
});

router.patch("/admin/sub-admins/:userId/permissions", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { permission, hasIt, grantedBy } = req.body;
  if (hasIt) {
    await db.delete(adminPermissions).where(and(eq(adminPermissions.userId, req.params.userId), eq(adminPermissions.permission, permission)));
  } else {
    await db.insert(adminPermissions).values({ id: crypto.randomUUID(), userId: req.params.userId, permission, grantedBy });
  }
  return res.json({ ok: true });
});

router.get("/admin/search-user", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { phone } = req.query as any;
  if (!phone) return res.status(400).json({ error: "phone required" });
  const [prof] = await db.select().from(profiles).where(eq(profiles.phone, phone)).limit(1);
  if (!prof) return res.json({ error: "not_found" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, prof.userId)).limit(1);
  if (role?.role === "admin") return res.json({ error: "already_admin" });
  if (role?.role === "moderator") return res.json({ error: "already_moderator" });
  return res.json({ user_id: prof.userId, phone: prof.phone, full_name: prof.fullName });
});

// ─── User team (referral) ─────────────────────────────────────────────────────
router.get("/admin/user-team/:profileId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const l1 = await db.select().from(profiles).where(eq(profiles.referredBy, req.params.profileId));
  const l2 = l1.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l1.map(p => p.id))) : [];
  const l3 = l2.length > 0 ? await db.select().from(profiles).where(inArray(profiles.referredBy, l2.map(p => p.id))) : [];
  return res.json({ l1, l2, l3 });
});

// ─── Profiles by IDs (GET, comma-separated) ───────────────────────────────────
router.get("/admin/profiles-by-ids", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { ids } = req.query as any;
  if (!ids) return res.json([]);
  const idList = ids.split(",").filter(Boolean);
  if (idList.length === 0) return res.json([]);
  const result = await db.select().from(profiles).where(inArray(profiles.userId, idList));
  return res.json(result);
});

// ─── Wheel spins delete all ───────────────────────────────────────────────────
router.delete("/admin/wheel-spins/all", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  await db.delete(wheelSpins);
  return res.json({ ok: true });
});

// ─── Chat (admin) ─────────────────────────────────────────────────────────────
router.get("/admin/chat-conversations", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const msgs = await db.select().from(chatMessages);
  const sorted = msgs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  const userMap: Record<string, typeof msgs> = {};
  sorted.forEach(m => { if (!userMap[m.userId!]) userMap[m.userId!] = []; userMap[m.userId!].push(m); });
  const userIds = Object.keys(userMap);
  if (userIds.length === 0) return res.json([]);
  const profs = await db.select().from(profiles).where(inArray(profiles.userId, userIds));
  const profMap: Record<string, any> = {};
  profs.forEach(p => { profMap[p.userId] = p; });
  const convos = userIds.map(uid => {
    const userMsgs = userMap[uid];
    const lastMsg = userMsgs[0];
    const prof = profMap[uid];
    return {
      user_id: uid,
      full_name: prof?.fullName ?? "User",
      phone: prof?.phone ?? "",
      last_message: lastMsg.message,
      last_time: lastMsg.createdAt,
      unread_count: userMsgs.filter(m => m.sender === "user").length,
    };
  }).sort((a, b) => new Date(b.last_time!).getTime() - new Date(a.last_time!).getTime());
  return res.json(convos);
});

router.get("/admin/chat-messages/:userId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const msgs = await db.select().from(chatMessages).where(eq(chatMessages.userId, req.params.userId));
  return res.json(msgs.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
});

router.post("/admin/chat-reply", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { userId, message } = req.body;
  const id = crypto.randomUUID();
  await db.insert(chatMessages).values({ id, userId, sender: "support", message, isAi: false });
  const [inserted] = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  return res.json(inserted);
});

// ─── Admin users (with extra fields) ─────────────────────────────────────────
router.patch("/admin/users/:profileId", async (req, res) => {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { referralCode, referredBy } = req.body;
  const updates: any = {};
  if (referralCode !== undefined) updates.referralCode = referralCode;
  if (referredBy !== undefined) updates.referredBy = referredBy;
  await db.update(profiles).set(updates).where(eq(profiles.id, req.params.profileId));
  return res.json({ ok: true });
});

export default router;
