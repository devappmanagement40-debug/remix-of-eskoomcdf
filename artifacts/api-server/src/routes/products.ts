import { Router } from "express";
import { db } from "@workspace/db";
import { products, productSeries, userProducts, userSessions, profiles, userRoles, referralCommissions, vipConditions } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function normalizeToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = value;
  }
  return result;
}

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

router.get("/products", async (req, res) => {
  const { seriesId, featured, active } = req.query;
  try {
    const all = await db.select().from(products);
    let filtered = all;
    if (active !== undefined) filtered = filtered.filter(p => p.isActive === (active === "true"));
    if (featured !== undefined) filtered = filtered.filter(p => featured === "true" ? (p.isFeatured === true || p.isNew === true) : p.isFeatured === false);
    if (seriesId) filtered = filtered.filter(p => p.seriesId === seriesId);
    return res.json(filtered.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
  } catch (err: any) {
    console.error("Products DB error:", err?.message, err?.cause?.message, err?.cause?.code);
    return res.status(500).json({ error: "DB error", detail: err?.message, cause: err?.cause?.message });
  }
});

router.get("/products/series", async (req, res) => {
  const all = await db.select().from(productSeries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/products/:id", async (req, res) => {
  const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
  if (!product) return res.status(404).json({ error: "Not found" });
  return res.json(product);
});

router.post("/products", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [product] = await db.insert(products).values({ id: crypto.randomUUID(), ...normalizeToCamelCase(req.body) }).returning();
  return res.json(product);
});

router.patch("/products/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [product] = await db.update(products).set({ ...normalizeToCamelCase(req.body), updatedAt: new Date() }).where(eq(products.id, req.params.id)).returning();
  return res.json(product);
});

router.delete("/products/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  await db.delete(products).where(eq(products.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/product-series", async (req, res) => {
  const all = await db.select().from(productSeries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/products/series", async (req, res) => {
  const all = await db.select().from(productSeries);
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/vip-conditions", async (req, res) => {
  const all = await db.select().from(vipConditions);
  return res.json(all.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)));
});

router.get("/user-products/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { pool } = await import("@workspace/db");
  const { rows } = await pool.query(`
    SELECT
      up.id, up.user_id, up.product_id, up.is_active,
      up.purchased_at, up.expires_at, up.last_collected_at, up.total_collected,
      json_build_object(
        'name', p.name, 'price', p.price, 'daily_revenue', p.daily_revenue,
        'total_revenue', p.total_revenue, 'cycles', p.cycles,
        'description', p.description, 'image_url', p.image_url,
        'series_id', p.series_id, 'gain_type', p.gain_type
      ) as products
    FROM user_products up
    JOIN products p ON p.id = up.product_id
    WHERE up.user_id = $1
    ORDER BY up.purchased_at DESC
  `, [me.userId]);
  return res.json(rows);
});

router.post("/user-products/buy/:productId", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [product] = await db.select().from(products).where(eq(products.id, req.params.productId)).limit(1);
  if (!product || !product.isActive) return res.status(400).json({ error: "Product not available" });

  const price = Number(product.price ?? 0);
  const balance = Number(me.balance ?? 0);
  if (balance < price) return res.status(400).json({ error: "Insufficient balance" });

  const cycles = product.cycles ?? 30;
  const expiresAt = new Date(Date.now() + cycles * 24 * 60 * 60 * 1000);

  const [userProduct] = await db.insert(userProducts).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    productId: product.id,
    expiresAt,
  }).returning();

  await db.update(profiles).set({
    balance: String(balance - price),
    depositBalance: String(Math.max(0, Number(me.depositBalance ?? 0) - price)),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  // Credit referral commissions to the upline (up to 3 levels)
  // L1 (direct referrer): 10%, L2: 5%, L3: 1%
  if (price > 0) {
    try {
      const { pool: dbPool } = await import("@workspace/db");
      const RATES = [
        { level: "L1", rate: 0.10 },
        { level: "L2", rate: 0.05 },
        { level: "L3", rate: 0.01 },
      ];
      let currentProfileId: string | null = me.referredBy ?? null;
      for (const { level, rate } of RATES) {
        if (!currentProfileId) break;
        const { rows: refRows } = await dbPool.query(
          `SELECT id, user_id, referred_by, balance, referral_balance FROM profiles WHERE id = $1 LIMIT 1`,
          [currentProfileId]
        );
        if (!refRows.length) break;
        const referrer = refRows[0];
        const commission = Math.round(price * rate * 100) / 100;
        await dbPool.query(
          `UPDATE profiles SET balance = balance + $1, referral_balance = referral_balance + $1, updated_at = now() WHERE user_id = $2`,
          [commission, referrer.user_id]
        );
        await dbPool.query(
          `INSERT INTO referral_commissions (id, beneficiary_id, buyer_id, product_price, commission_amount, commission_rate, level, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())`,
          [referrer.id, me.id, price, commission, rate, level]
        );
        currentProfileId = referrer.referred_by ?? null;
      }
    } catch (commErr) {
      console.error("[referral] Commission crediting error:", commErr);
    }
  }

  return res.json(userProduct);
});

router.post("/user-products/:id/collect", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [up] = await db.select().from(userProducts).where(
    and(eq(userProducts.id, req.params.id), eq(userProducts.userId, me.userId))
  ).limit(1);
  if (!up) return res.status(404).json({ error: "Not found" });

  const now = new Date();
  if (!up.isActive) return res.status(400).json({ error: "Produit inactif" });
  if (up.expiresAt && up.expiresAt < now) return res.status(400).json({ error: "Produit expiré" });

  const [product] = await db.select().from(products).where(eq(products.id, up.productId)).limit(1);
  if (!product) return res.status(404).json({ error: "Produit introuvable" });

  const gainType = product.gainType ?? "daily";

  if (gainType === "blocked") {
    if (Number(up.totalCollected ?? 0) > 0)
      return res.status(400).json({ error: "Gains déjà collectés pour ce produit" });
    const cycles = product.cycles ?? 365;
    const purchasedAt = up.purchasedAt ? new Date(up.purchasedAt) : null;
    if (!purchasedAt) return res.status(400).json({ error: "Date d'achat introuvable" });
    const endDate = new Date(purchasedAt.getTime() + cycles * 24 * 60 * 60 * 1000);
    if (now < endDate)
      return res.status(400).json({ error: `Gains disponibles le ${endDate.toLocaleString("fr-FR")}` });
  } else {
    const referenceTime = up.lastCollectedAt ?? up.purchasedAt;
    if (referenceTime) {
      const ref = new Date(referenceTime);
      const hoursSince = (now.getTime() - ref.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const nextCollect = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
        return res.status(400).json({ error: `Prochain collecte le ${nextCollect.toLocaleString("fr-FR")}` });
      }
    }
  }

  const dailyRev = Number(product.dailyRevenue ?? 0);
  const newCollected = Number(up.totalCollected ?? 0) + dailyRev;

  await db.update(userProducts).set({
    lastCollectedAt: now,
    totalCollected: String(newCollected),
  }).where(eq(userProducts.id, up.id));

  await db.update(profiles).set({
    balance: String(Number(me.balance ?? 0) + dailyRev),
    earningsBalance: String(Number(me.earningsBalance ?? 0) + dailyRev),
    updatedAt: now,
  }).where(eq(profiles.userId, me.userId));

  return res.json({ collected: dailyRev });
});

// ── ALIAS ROUTES (correspondance avec les appels frontend) ───────────────────

router.post("/products/purchase", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "productId requis" });

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || !product.isActive) return res.status(400).json({ error: "Produit non disponible" });

  const price = Number(product.price ?? 0);
  const balance = Number(me.balance ?? 0);
  if (balance < price) return res.status(400).json({ error: "Solde insuffisant" });

  const cycles = product.cycles ?? 30;
  const expiresAt = new Date(Date.now() + cycles * 24 * 60 * 60 * 1000);

  const [userProduct] = await db.insert(userProducts).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    productId: product.id,
    expiresAt,
  }).returning();

  await db.update(profiles).set({
    balance: String(balance - price),
    depositBalance: String(Math.max(0, Number(me.depositBalance ?? 0) - price)),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  if (price > 0) {
    try {
      const { pool: dbPool } = await import("@workspace/db");
      const RATES = [
        { level: "L1", rate: 0.10 },
        { level: "L2", rate: 0.05 },
        { level: "L3", rate: 0.01 },
      ];
      let currentProfileId: string | null = me.referredBy ?? null;
      for (const { level, rate } of RATES) {
        if (!currentProfileId) break;
        const { rows: refRows } = await dbPool.query(
          `SELECT id, user_id, referred_by, balance, referral_balance FROM profiles WHERE id = $1 LIMIT 1`,
          [currentProfileId]
        );
        if (!refRows.length) break;
        const referrer = refRows[0];
        const commission = Math.round(price * rate * 100) / 100;
        await dbPool.query(
          `UPDATE profiles SET balance = balance + $1, referral_balance = referral_balance + $1, updated_at = now() WHERE user_id = $2`,
          [commission, referrer.user_id]
        );
        await dbPool.query(
          `INSERT INTO referral_commissions (id, beneficiary_id, buyer_id, product_price, commission_amount, commission_rate, level, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())`,
          [referrer.id, me.id, price, commission, rate, level]
        );
        currentProfileId = referrer.referred_by ?? null;
      }
    } catch (commErr) {
      console.error("[referral] Commission crediting error:", commErr);
    }
  }

  return res.json(userProduct);
});

router.get("/products/user-products/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { pool } = await import("@workspace/db");
  const { rows } = await pool.query(`
    SELECT
      up.id, up.user_id, up.product_id, up.is_active,
      up.purchased_at, up.expires_at, up.last_collected_at, up.total_collected,
      json_build_object(
        'name', p.name, 'price', p.price, 'daily_revenue', p.daily_revenue,
        'total_revenue', p.total_revenue, 'cycles', p.cycles,
        'description', p.description, 'image_url', p.image_url,
        'series_id', p.series_id, 'gain_type', p.gain_type
      ) as products
    FROM user_products up
    JOIN products p ON p.id = up.product_id
    WHERE up.user_id = $1
    ORDER BY up.purchased_at DESC
  `, [me.userId]);
  return res.json(rows);
});

router.post("/products/user-products/collect", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { userProductId } = req.body;
  if (!userProductId) return res.status(400).json({ error: "userProductId requis" });

  const [up] = await db.select().from(userProducts).where(
    and(eq(userProducts.id, userProductId), eq(userProducts.userId, me.userId))
  ).limit(1);
  if (!up) return res.status(404).json({ error: "Produit introuvable" });

  const now = new Date();
  if (!up.isActive) return res.status(400).json({ error: "Produit inactif" });
  if (up.expiresAt && up.expiresAt < now) return res.status(400).json({ error: "Produit expiré" });

  const [product] = await db.select().from(products).where(eq(products.id, up.productId)).limit(1);
  if (!product) return res.status(404).json({ error: "Produit introuvable" });

  const gainType = product.gainType ?? "daily";

  if (gainType === "blocked") {
    if (Number(up.totalCollected ?? 0) > 0)
      return res.status(400).json({ error: "Gains déjà collectés pour ce produit" });
    const cycles = product.cycles ?? 365;
    const purchasedAt = up.purchasedAt ? new Date(up.purchasedAt) : null;
    if (!purchasedAt) return res.status(400).json({ error: "Date d'achat introuvable" });
    const endDate = new Date(purchasedAt.getTime() + cycles * 24 * 60 * 60 * 1000);
    if (now < endDate)
      return res.status(400).json({ error: `Gains disponibles le ${endDate.toLocaleString("fr-FR")}` });
  } else {
    const referenceTime = up.lastCollectedAt ?? up.purchasedAt;
    if (referenceTime) {
      const ref = new Date(referenceTime);
      const hoursSince = (now.getTime() - ref.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const nextCollect = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
        return res.status(400).json({ error: `Prochain collecte le ${nextCollect.toLocaleString("fr-FR")}` });
      }
    }
  }

  const dailyRev = Number(product.dailyRevenue ?? 0);
  const newCollected = Number(up.totalCollected ?? 0) + dailyRev;

  await db.update(userProducts).set({
    lastCollectedAt: now,
    totalCollected: String(newCollected),
  }).where(eq(userProducts.id, up.id));

  await db.update(profiles).set({
    balance: String(Number(me.balance ?? 0) + dailyRev),
    earningsBalance: String(Number(me.earningsBalance ?? 0) + dailyRev),
    updatedAt: now,
  }).where(eq(profiles.userId, me.userId));

  return res.json({ collected: dailyRev, amount: dailyRev });
});

router.get("/products/user-products/active-by-users", async (req, res) => {
  const { userIds } = req.query as { userIds?: string };
  if (!userIds) return res.json([]);
  const ids = userIds.split(",").filter(Boolean);
  if (!ids.length) return res.json([]);

  const { pool } = await import("@workspace/db");
  const { rows } = await pool.query(
    `SELECT up.user_id as "userId", up.id
     FROM user_products up
     WHERE up.user_id = ANY($1::text[])
     AND up.is_active = true`,
    [ids]
  );
  return res.json(rows);
});

export default router;

