import { Router } from "express";
import { db } from "../db";
import { products, productSeries, userProducts, userSessions, profiles, userRoles, referralCommissions } from "../db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

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
    if (featured !== undefined) filtered = filtered.filter(p => p.isFeatured === (featured === "true"));
    if (seriesId) filtered = filtered.filter(p => p.seriesId === seriesId);
    return res.json(filtered.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
  } catch (err: any) {
    console.error("Products DB error:", err?.message, err?.cause?.message, err?.cause?.code);
    return res.status(500).json({ error: "DB error", detail: err?.message, cause: err?.cause?.message });
  }
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
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
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
  // Uses Supabase REST API — no direct pool connection required
  if (price > 0) {
    const SB_URL = process.env.VITE_SUPABASE_PROJECT_URL;
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (SB_URL && SB_KEY) {
      const SB_HEADERS = {
        "Content-Type": "application/json",
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      };

      try {
        const RATES = [
          { level: "L1", rate: 0.10 },
          { level: "L2", rate: 0.05 },
          { level: "L3", rate: 0.01 },
        ];

        let currentProfileId: string | null = me.referredBy ?? null;

        for (const { level, rate } of RATES) {
          if (!currentProfileId) break;

          // Fetch the referrer profile
          const refRes = await fetch(
            `${SB_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentProfileId)}&select=id,user_id,referred_by,balance,referral_balance&limit=1`,
            { headers: SB_HEADERS }
          );
          if (!refRes.ok) break;
          const refData = await refRes.json();
          if (!Array.isArray(refData) || !refData.length) break;
          const referrer = refData[0];

          const commission = Math.round(price * rate * 100) / 100;
          const newBalance = Number(referrer.balance ?? 0) + commission;
          const newReferralBalance = Number(referrer.referral_balance ?? 0) + commission;

          // Credit referrer's balance and referral_balance
          await fetch(
            `${SB_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(referrer.user_id)}`,
            {
              method: "PATCH",
              headers: { ...SB_HEADERS, Prefer: "return=minimal" },
              body: JSON.stringify({ balance: newBalance, referral_balance: newReferralBalance }),
            }
          );

          // Record commission in referral_commissions table
          await fetch(`${SB_URL}/rest/v1/referral_commissions`, {
            method: "POST",
            headers: { ...SB_HEADERS, Prefer: "return=minimal" },
            body: JSON.stringify({
              beneficiary_id: referrer.id,
              buyer_id: me.id,
              product_price: price,
              commission_amount: commission,
              commission_rate: rate,
              level,
            }),
          });

          currentProfileId = referrer.referred_by ?? null;
        }
      } catch (commErr) {
        // Log but don't fail the purchase — commissions are secondary
        console.error("[referral] Commission crediting error:", commErr);
      }
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
