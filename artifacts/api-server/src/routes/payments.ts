import { Router } from "express";
import { db } from "@workspace/db";
import { recharges, withdrawals, userWallets, withdrawalMethods, paymentMethods, countries, paymentApiConfigs, withdrawalFeePayments, userSessions, profiles, userRoles } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

async function getProfileFromToken(token: string) {
  const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
  return profile ?? null;
}

async function isAdmin(userId: string) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  return role?.role === "admin";
}

router.get("/countries", async (req, res) => {
  const all = await db.select().from(countries).where(eq(countries.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/payment-methods", async (req, res) => {
  const all = await db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/withdrawal-methods", async (req, res) => {
  const all = await db.select().from(withdrawalMethods).where(eq(withdrawalMethods.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { amount, phone, countryCode, paymentMethod, transactionRef, proofImageUrl } = req.body;
  if (!amount || !phone) return res.status(400).json({ error: "Amount and phone required" });

  const [recharge] = await db.insert(recharges).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    amount: String(amount),
    phone,
    countryCode,
    paymentMethod,
    transactionRef,
    proofImageUrl,
    status: "pending",
  }).returning();

  return res.json(recharge);
});

router.get("/recharges/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const myRecharges = await db.select().from(recharges).where(eq(recharges.userId, me.userId));
  return res.json(myRecharges.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.get("/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  if (!await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(recharges);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/recharges/:id/approve", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });
  if (recharge.status !== "pending") return res.status(400).json({ error: "Already processed" });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, recharge.userId)).limit(1);
  if (profile) {
    const amount = Number(recharge.amount);
    await db.update(profiles).set({
      balance: String(Number(profile.balance ?? 0) + amount),
      depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
      updatedAt: new Date(),
    }).where(eq(profiles.userId, recharge.userId));
  }

  const [updated] = await db.update(recharges).set({ status: "approved", adminNote: req.body.adminNote, updatedAt: new Date() }).where(eq(recharges.id, req.params.id)).returning();
  return res.json(updated);
});

router.patch("/recharges/:id/reject", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(recharges).set({ status: "rejected", adminNote: req.body.adminNote, updatedAt: new Date() }).where(eq(recharges.id, req.params.id)).returning();
  return res.json(updated);
});

router.get("/wallets/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const wallets = await db.select().from(userWallets).where(eq(userWallets.userId, me.userId));
  return res.json(wallets);
});

router.post("/wallets", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { phone, network, countryCode, holderName, label } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  const [wallet] = await db.insert(userWallets).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    phone, network, countryCode, holderName, label,
  }).returning();
  return res.json(wallet);
});

router.post("/withdrawals", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { amount, phone, network, countryCode, walletId, feeAmount } = req.body;
  if (!amount || !phone) return res.status(400).json({ error: "Amount and phone required" });

  const totalAmount = Number(amount);
  const fee = Number(feeAmount ?? 0);
  const net = totalAmount - fee;

  if (Number(me.balance ?? 0) < totalAmount) return res.status(400).json({ error: "Insufficient balance" });

  const [withdrawal] = await db.insert(withdrawals).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    amount: String(totalAmount),
    feeAmount: String(fee),
    netAmount: String(net),
    phone, network, countryCode,
    walletId: walletId ?? null,
    status: "pending",
  }).returning();

  await db.update(profiles).set({
    balance: String(Number(me.balance ?? 0) - totalAmount),
    earningsBalance: String(Math.max(0, Number(me.earningsBalance ?? 0) - totalAmount)),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json(withdrawal);
});

router.get("/withdrawals/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const myWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.userId, me.userId));
  return res.json(myWithdrawals.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.get("/withdrawals", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(withdrawals);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/withdrawals/:id/approve", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(withdrawals).set({ status: "approved", adminNote: req.body.adminNote, updatedAt: new Date() }).where(eq(withdrawals.id, req.params.id)).returning();
  return res.json(updated);
});

router.patch("/withdrawals/:id/reject", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (withdrawal && withdrawal.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, withdrawal.userId)).limit(1);
    if (profile) {
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + Number(withdrawal.amount)),
        earningsBalance: String(Number(profile.earningsBalance ?? 0) + Number(withdrawal.amount)),
        updatedAt: new Date(),
      }).where(eq(profiles.userId, withdrawal.userId));
    }
  }

  const [updated] = await db.update(withdrawals).set({ status: "rejected", adminNote: req.body.adminNote, updatedAt: new Date() }).where(eq(withdrawals.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── Generic status route (approve or reject based on status value) ───────────
router.patch("/recharges/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });

  if (status === "approved" && recharge.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, recharge.userId)).limit(1);
    if (profile) {
      const amount = Number(recharge.amount);
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + amount),
        depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
        updatedAt: new Date(),
      }).where(eq(profiles.userId, recharge.userId));
    }
  }

  const [updated] = await db.update(recharges)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(recharges.id, req.params.id))
    .returning();
  return res.json(updated);
});

router.post("/withdrawals/:id/process", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(withdrawals)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(withdrawals.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.patch("/withdrawals/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Not found" });

  if (status === "rejected" && withdrawal.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, withdrawal.userId)).limit(1);
    if (profile) {
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + Number(withdrawal.amount)),
        earningsBalance: String(Number(profile.earningsBalance ?? 0) + Number(withdrawal.amount)),
        updatedAt: new Date(),
      }).where(eq(profiles.userId, withdrawal.userId));
    }
  }

  const [updated] = await db.update(withdrawals)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(withdrawals.id, req.params.id))
    .returning();
  return res.json(updated);
});

// User proof upload for processing fee
router.patch("/withdrawals/:id/proof", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { processing_fee_proof_url } = req.body;
  const [updated] = await db.update(withdrawals).set({ processingFeeProofUrl: processing_fee_proof_url, updatedAt: new Date() }).where(eq(withdrawals.id, req.params.id)).returning();
  return res.json(updated);
});

// ─── /api/payments/* aliases for AdminRecharges & AdminRetraits pages ─────────

router.get("/payments/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });
  const all = await db.select().from(recharges);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/payments/recharges/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });

  if (status === "approved" && recharge.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, recharge.userId)).limit(1);
    if (profile) {
      const amount = Number(recharge.amount);
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + amount),
        depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
        updatedAt: new Date(),
      }).where(eq(profiles.userId, recharge.userId));
    }
  }

  const [updated] = await db.update(recharges)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(recharges.id, req.params.id))
    .returning();
  return res.json(updated);
});

router.get("/payments/withdrawals", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });
  const all = await db.select().from(withdrawals);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/payments/withdrawals/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Not found" });

  if (status === "rejected" && withdrawal.status === "pending") {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, withdrawal.userId)).limit(1);
    if (profile) {
      await db.update(profiles).set({
        balance: String(Number(profile.balance ?? 0) + Number(withdrawal.amount)),
        earningsBalance: String(Number(profile.earningsBalance ?? 0) + Number(withdrawal.amount)),
        updatedAt: new Date(),
      }).where(eq(profiles.userId, withdrawal.userId));
    }
  }

  const [updated] = await db.update(withdrawals)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(withdrawals.id, req.params.id))
    .returning();
  return res.json(updated);
});

router.get("/payments/fee-payments", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });
  const all = await db.select().from(withdrawalFeePayments);
  return res.json(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.patch("/payments/fee-payments/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [updated] = await db.update(withdrawalFeePayments)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(withdrawalFeePayments.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

// ─── GET /user-wallets/batch?ids=id1,id2 ────────────────────────────────────
import { inArray } from "drizzle-orm";

router.get("/user-wallets/batch", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const ids = ((req.query.ids as string) || "").split(",").filter(Boolean);
  if (ids.length === 0) return res.json([]);
  const result = await db.select().from(userWallets).where(inArray(userWallets.id, ids));
  return res.json(result);
});

export default router;
