import { Router } from "express";
import { db } from "../db";
import { products, productSeries, userProducts, userSessions, profiles, userRoles, referralCommissions } from "../db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { toSnake } from "../utils/toSnake";

const router = Router();

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

router.get("/products", async (req, res) => {
  const { seriesId, series_id, featured, active } = req.query;
  const sid = (seriesId ?? series_id) as string | undefined;
  try {
    const all = await db.select().from(products);
    let filtered = all;
    if (active !== undefined) filtered = filtered.filter(p => p.isActive === (active === "true"));
    if (featured !== undefined) filtered = filtered.filter(p => featured === "true" ? (p.isFeatured === true || p.isNew === true) : p.isFeatured === false);
    if (sid) filtered = filtered.filter(p => p.seriesId === sid);
    return res.json(toSnake(filtered.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
  } catch (err: any) {
    console.error("Products DB error:", err?.message, err?.cause?.message, err?.cause?.code);
    return res.status(500).json({ error: "DB error", detail: err?.message, cause: err?.cause?.message });
  }
});

router.get("/products/:id", async (req, res) => {
  const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
  if (!product) return res.status(404).json({ error: "Not found" });
  return res.json(toSnake(product));
});

router.post("/products", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [product] = await db.insert(products).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(product);
});

router.patch("/products/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [product] = await db.update(products).set({ ...req.body, updatedAt: new Date() }).where(eq(products.id, req.params.id)).returning();
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
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.post("/product-series", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [series] = await db.insert(productSeries).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(series);
});

router.patch("/product-series/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const [series] = await db.update(productSeries).set({ ...req.body, updatedAt: new Date() }).where(eq(productSeries.id, req.params.id)).returning();
  return res.json(series);
});

router.delete("/product-series/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, me.userId)).limit(1);
  if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  await db.delete(productSeries).where(eq(productSeries.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/user-products/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { pool } = await import("../db");
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

// ─── Alias: /products/purchase → buy a product (body: { productId }) ──────────
router.post("/products/purchase", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const productId = req.body.productId ?? req.body.product_id;
  if (!productId) return res.status(400).json({ error: "productId required" });

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
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

  if (price > 0) {
    try {
      const RATES = [
        { level: "L1", rate: 0.10 },
        { level: "L2", rate: 0.05 },
        { level: "L3", rate: 0.01 },
      ];
      let currentProfileId: string | null = me.referredBy ?? null;
      for (const { level, rate } of RATES) {
        if (!currentProfileId) break;
        const [referrer] = await db.select().from(profiles).where(eq(profiles.id, currentProfileId)).limit(1);
        if (!referrer) break;
        const commission = Math.round(price * rate * 100) / 100;
        await db.update(profiles).set({
          balance: String(Number(referrer.balance ?? 0) + commission),
          referralBalance: String(Number(referrer.referralBalance ?? 0) + commission),
          updatedAt: new Date(),
        }).where(eq(profiles.userId, referrer.userId));
        await db.insert(referralCommissions).values({
          id: crypto.randomUUID(),
          beneficiaryId: referrer.id,
          buyerId: me.id,
          productPrice: String(price),
          commissionAmount: String(commission),
          commissionRate: String(rate),
          level,
        });
        currentProfileId = referrer.referredBy ?? null;
      }
    } catch (commErr) {
      console.error("[referral] Commission crediting error:", commErr);
    }
  }

  return res.json(toSnake(userProduct));
});

// ─── Alias: /products/collect → collect daily revenue (body: { userProductId }) ─
router.post("/products/collect", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const upId = req.body.userProductId ?? req.body.user_product_id;
  if (!upId) return res.status(400).json({ error: "userProductId required" });

  const [up] = await db.select().from(userProducts).where(
    and(eq(userProducts.id, upId), eq(userProducts.userId, me.userId))
  ).limit(1);
  if (!up) return res.status(404).json({ error: "Not found" });

  const [product] = await db.select().from(products).where(eq(products.id, up.productId)).limit(1);
  const dailyRev = Number(product?.dailyRevenue ?? 0);
  const newCollected = Number(up.totalCollected ?? 0) + dailyRev;

  await db.update(userProducts).set({
    lastCollectedAt: new Date(),
    totalCollected: String(newCollected),
  }).where(eq(userProducts.id, up.id));

  await db.update(profiles).set({
    balance: String(Number(me.balance ?? 0) + dailyRev),
    earningsBalance: String(Number(me.earningsBalance ?? 0) + dailyRev),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json({ collected: dailyRev });
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

  if (price > 0) {
    try {
      const RATES = [
        { level: "L1", rate: 0.10 },
        { level: "L2", rate: 0.05 },
        { level: "L3", rate: 0.01 },
      ];
      let currentProfileId: string | null = me.referredBy ?? null;
      for (const { level, rate } of RATES) {
        if (!currentProfileId) break;
        const [referrer] = await db.select().from(profiles).where(eq(profiles.id, currentProfileId)).limit(1);
        if (!referrer) break;
        const commission = Math.round(price * rate * 100) / 100;
        await db.update(profiles).set({
          balance: String(Number(referrer.balance ?? 0) + commission),
          referralBalance: String(Number(referrer.referralBalance ?? 0) + commission),
          updatedAt: new Date(),
        }).where(eq(profiles.userId, referrer.userId));
        await db.insert(referralCommissions).values({
          id: crypto.randomUUID(),
          beneficiaryId: referrer.id,
          buyerId: me.id,
          productPrice: String(price),
          commissionAmount: String(commission),
          commissionRate: String(rate),
          level,
        });
        currentProfileId = referrer.referredBy ?? null;
      }
    } catch (commErr) {
      console.error("[referral] Commission crediting error:", commErr);
    }
  }

  return res.json(toSnake(userProduct));
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

  const [product] = await db.select().from(products).where(eq(products.id, up.productId)).limit(1);
  const dailyRev = Number(product?.dailyRevenue ?? 0);
  const newCollected = Number(up.totalCollected ?? 0) + dailyRev;

  await db.update(userProducts).set({
    lastCollectedAt: new Date(),
    totalCollected: String(newCollected),
  }).where(eq(userProducts.id, up.id));

  await db.update(profiles).set({
    balance: String(Number(me.balance ?? 0) + dailyRev),
    earningsBalance: String(Number(me.earningsBalance ?? 0) + dailyRev),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json({ collected: dailyRev });
});

export default router;
