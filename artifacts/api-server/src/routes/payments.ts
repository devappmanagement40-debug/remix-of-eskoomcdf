import { Router } from "express";
import { db } from "@workspace/db";
import { recharges, withdrawals, userWallets, withdrawalMethods, paymentMethods, countries, paymentApiConfigs, withdrawalFeePayments, userSessions, profiles, userRoles, siteSettings } from "@workspace/db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

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

async function isAdmin(userId: string) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
  return role?.role === "admin";
}

// ────────────────────────────────────────────────────────────────────────────
// ATOMIC HELPERS — prevent double-credit / double-refund
// ────────────────────────────────────────────────────────────────────────────

/**
 * Atomically approve a recharge (status: pending → approved) and credit balance.
 * Uses WHERE status='pending' so concurrent calls only succeed once (no double-credit).
 * Returns the updated recharge or null if already processed.
 */
async function atomicApproveRecharge(rechargeId: string, adminNote?: string | null) {
  const [updated] = await db
    .update(recharges)
    .set({ status: "approved", adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(and(eq(recharges.id, rechargeId), eq(recharges.status, "pending")))
    .returning({ id: recharges.id, userId: recharges.userId, amount: recharges.amount });

  if (!updated) return null; // Already approved or rejected — no balance change

  // SQL-level atomic increment — safe against concurrent reads
  await db
    .update(profiles)
    .set({
      balance: sql`${profiles.balance} + ${Number(updated.amount)}`,
      depositBalance: sql`${profiles.depositBalance} + ${Number(updated.amount)}`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, updated.userId));

  return updated;
}

/**
 * Atomically reject a withdrawal (pending or processing → rejected) and refund balance.
 * Handles both pending and processing so NowPayments payout failures are also refunded.
 */
async function atomicRejectWithdrawal(withdrawalId: string, adminNote?: string | null) {
  const [withdrawal] = await db
    .select({ id: withdrawals.id, status: withdrawals.status, userId: withdrawals.userId, amount: withdrawals.amount })
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  if (!withdrawal) return null;
  if (withdrawal.status !== "pending" && withdrawal.status !== "processing") return null;

  const [updated] = await db
    .update(withdrawals)
    .set({ status: "rejected", adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(and(
      eq(withdrawals.id, withdrawalId),
      sql`${withdrawals.status} IN ('pending', 'processing')`,
    ))
    .returning({ id: withdrawals.id });

  if (!updated) return null; // Already handled by another concurrent call

  // SQL-level atomic refund — restore balance + sub-balances (earnings first approximation)
  const amount = Number(withdrawal.amount);
  // Fetch current sub-balances to compute split restoration
  const [currentProfile] = await db.select({
    earningsBalance: profiles.earningsBalance,
    referralBalance: profiles.referralBalance,
    balance: profiles.balance,
  }).from(profiles).where(eq(profiles.userId, withdrawal.userId)).limit(1);

  const curEarnings = Number(currentProfile?.earningsBalance ?? 0);
  const curReferral = Number(currentProfile?.referralBalance ?? 0);

  // Restore proportionally: if both are 0 (fully depleted), restore all to earningsBalance
  // Otherwise split proportionally to what remains, so total withdrawable is restored correctly
  let restoreEarnings: number;
  let restoreReferral: number;
  if (curEarnings === 0 && curReferral === 0) {
    restoreEarnings = amount;
    restoreReferral = 0;
  } else if (curEarnings === 0) {
    restoreEarnings = 0;
    restoreReferral = amount;
  } else if (curReferral === 0) {
    restoreEarnings = amount;
    restoreReferral = 0;
  } else {
    const total = curEarnings + curReferral;
    restoreEarnings = Math.round((curEarnings / total) * amount);
    restoreReferral = amount - restoreEarnings;
  }

  await db
    .update(profiles)
    .set({
      balance:         sql`${profiles.balance}         + ${amount}`,
      earningsBalance: sql`${profiles.earningsBalance} + ${restoreEarnings}`,
      referralBalance: sql`${profiles.referralBalance} + ${restoreReferral}`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, withdrawal.userId));

  return updated;
}

// ────────────────────────────────────────────────────────────────────────────
// LOOKUP ROUTES
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// RECHARGES (DEPOSITS)
// ────────────────────────────────────────────────────────────────────────────

router.post("/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let me: Awaited<ReturnType<typeof getProfileFromToken>>;
  try {
    me = await getProfileFromToken(token);
  } catch (dbErr: any) {
    console.error("[recharges] DB error in getProfileFromToken:", dbErr?.message);
    return res.status(503).json({ error: "Database unavailable. Please check server configuration." });
  }
  if (!me) return res.status(401).json({ error: "Session expired. Please login again." });

  // Accept both camelCase and snake_case from the frontend
  const body = req.body as Record<string, any>;
  const amount        = body.amount;
  const phone         = body.phone        ?? body.phone         ?? "";
  const countryCode   = body.countryCode  ?? body.country_code  ?? "";
  const paymentMethod = body.paymentMethod ?? body.payment_method ?? null;
  const transactionRef  = body.transactionRef  ?? body.transaction_ref  ?? null;
  const proofImageUrl   = body.proofImageUrl   ?? body.proof_image_url  ?? null;

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  try {
    const insertValues: Record<string, any> = {
      id: crypto.randomUUID(),
      userId: me.userId,
      amount: String(amount),
      status: "pending",
    };
    if (phone)          insertValues.phone          = phone;
    if (countryCode)    insertValues.countryCode    = countryCode;
    if (paymentMethod)  insertValues.paymentMethod  = paymentMethod;
    if (transactionRef) insertValues.transactionRef = transactionRef;
    if (proofImageUrl)  insertValues.proofImageUrl  = proofImageUrl;

    const [recharge] = await db.insert(recharges).values(insertValues as any).returning();
    return res.json(recharge);
  } catch (err: any) {
    console.error("[recharges] DB insert error:", err?.message, err?.code);
    const detail = err?.message || "Unknown database error";
    return res.status(500).json({ error: `Failed to create deposit: ${detail}` });
  }
});

router.get("/recharges/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const statusFilter = req.query.status as string | undefined;
  let myRecharges = await db.select().from(recharges).where(eq(recharges.userId, me.userId));
  if (statusFilter) myRecharges = myRecharges.filter(r => r.status === statusFilter);
  return res.json(myRecharges.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

// Alias: /api/payments/recharges/my  (frontend uses this path)
router.get("/payments/recharges/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const statusFilter = req.query.status as string | undefined;
  let myRecharges = await db.select().from(recharges).where(eq(recharges.userId, me.userId));
  if (statusFilter) myRecharges = myRecharges.filter(r => r.status === statusFilter);
  return res.json(myRecharges.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.get("/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  if (!await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(recharges);
  return res.json(toSnake(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())));
});

// FIXED: atomic approve — no double-credit even if IPN fires concurrently
router.patch("/recharges/:id/approve", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const updated = await atomicApproveRecharge(req.params.id, req.body.adminNote);
  if (!updated) {
    const [current] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
    return current
      ? res.status(409).json({ error: "Already processed", status: current.status })
      : res.status(404).json({ error: "Not found" });
  }
  return res.json(updated);
});

router.patch("/recharges/:id/reject", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  // GUARD: only reject if still pending — never reject an already-approved recharge
  // (approved = balance already credited; rejecting it without debiting would cause inconsistency)
  const [current] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!current) return res.status(404).json({ error: "Not found" });
  if (current.status === "approved") {
    return res.status(409).json({ error: "Cannot reject: recharge is already approved (balance credited)" });
  }
  if (current.status === "rejected") {
    return res.status(409).json({ error: "Already rejected" });
  }

  const [updated] = await db
    .update(recharges)
    .set({ status: "rejected", adminNote: req.body.adminNote, updatedAt: new Date() })
    .where(and(eq(recharges.id, req.params.id), eq(recharges.status, "pending")))
    .returning();
  if (!updated) return res.status(409).json({ error: "Concurrent update — please refresh" });
  return res.json(updated);
});

// FIXED: atomic approve/reject on generic status route
router.patch("/recharges/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };

  if (status === "approved") {
    const updated = await atomicApproveRecharge(req.params.id, adminNote);
    if (!updated) {
      const [current] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
      return current
        ? res.status(409).json({ error: "Already processed", status: current.status })
        : res.status(404).json({ error: "Not found" });
    }
    return res.json(updated);
  }

  // Rejection — no balance change needed
  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(recharges)
    .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(recharges.id, req.params.id))
    .returning();
  return res.json(updated);
});

// ────────────────────────────────────────────────────────────────────────────
// WALLETS
// ────────────────────────────────────────────────────────────────────────────

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

router.post("/user-wallets", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const { phone, network, countryCode, holderName, label } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });
  const [wallet] = await db.insert(userWallets).values({
    id: crypto.randomUUID(), userId: me.userId, phone, network, countryCode, holderName, label,
  }).returning();
  return res.json(wallet);
});

// ────────────────────────────────────────────────────────────────────────────
// WITHDRAWALS (RETRAITS)
// ────────────────────────────────────────────────────────────────────────────

// Core withdrawal submission logic (shared by both URL patterns)
async function handleWithdrawalSubmit(req: any, res: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { amount, phone, network, countryCode, walletId } = req.body;
  // feeAmount/netAmount from client are IGNORED — recalculated server-side for security
  if (!amount || !phone) return res.status(400).json({ error: "Amount and phone required" });

  const totalAmount = Number(amount);
  if (isNaN(totalAmount) || totalAmount <= 0) return res.status(400).json({ error: "Invalid amount" });

  // Load settings server-side (fee, limits, deposit_not_withdrawable)
  const settingsRows = await db.select().from(siteSettings)
    .where(inArray(siteSettings.key, ["withdrawal_fee_percent", "deposit_not_withdrawable", "withdrawal_min", "withdrawal_max"]));
  const sm: Record<string, string> = {};
  settingsRows.forEach(r => { sm[r.key] = r.value ?? ""; });

  const feePercent = Number(sm["withdrawal_fee_percent"] ?? 0);
  const depositNotWithdrawable = (sm["deposit_not_withdrawable"] ?? "true") !== "false";
  const wMin = sm["withdrawal_min"] ? Number(sm["withdrawal_min"]) : 0;
  const wMax = sm["withdrawal_max"] ? Number(sm["withdrawal_max"]) : 0;

  // Server-side fee calculation — cannot be bypassed by client
  const fee = Math.round(totalAmount * feePercent / 100);
  const net = totalAmount - fee;

  // Min / Max validation
  if (wMin > 0 && totalAmount < wMin) {
    return res.status(400).json({ error: `Montant minimum : ${wMin} USDT` });
  }
  if (wMax > 0 && totalAmount > wMax) {
    return res.status(400).json({ error: `Montant maximum : ${wMax} USDT` });
  }

  const currentBalance    = Number(me.balance         ?? 0);
  const currentEarnings   = Number(me.earningsBalance  ?? 0);
  const currentReferral   = Number(me.referralBalance  ?? 0);

  // Balance validation — respect deposit_not_withdrawable rule
  if (depositNotWithdrawable) {
    const withdrawable = currentEarnings + currentReferral;
    if (totalAmount > withdrawable) {
      return res.status(400).json({ error: "Solde retirable insuffisant (gains + parrainage uniquement)" });
    }
  } else {
    if (totalAmount > currentBalance) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }
  }

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

  // Proportional deduction: earnings first, then referral, then (if allowed) deposit
  const deductFromEarnings = Math.min(totalAmount, currentEarnings);
  const deductFromReferral = Math.min(totalAmount - deductFromEarnings, currentReferral);

  await db.update(profiles).set({
    balance:         sql`${profiles.balance}         - ${totalAmount}`,
    earningsBalance: sql`GREATEST(${profiles.earningsBalance} - ${deductFromEarnings}, 0)`,
    referralBalance: sql`GREATEST(${profiles.referralBalance} - ${deductFromReferral}, 0)`,
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json(withdrawal);
}

// Core my-withdrawals logic
async function handleWithdrawalsMyGet(req: any, res: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const myWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.userId, me.userId));
  const sorted = myWithdrawals.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  // Support ?since=today filter (for daily limit check on Retrait page)
  if (req.query.since === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return res.json(sorted.filter(w => new Date(w.createdAt!).getTime() >= start.getTime()));
  }

  return res.json(sorted);
}

// POST /withdrawals — original URL (keep for backward compatibility)
router.post("/withdrawals", handleWithdrawalSubmit);

// POST /payments/withdrawals — URL used by Retrait.tsx frontend (was missing!)
router.post("/payments/withdrawals", handleWithdrawalSubmit);

// GET /withdrawals/my — original URL
router.get("/withdrawals/my", handleWithdrawalsMyGet);

// GET /payments/withdrawals/my — URL used by Retrait.tsx for daily count (was missing!)
router.get("/payments/withdrawals/my", handleWithdrawalsMyGet);

router.get("/withdrawals", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const all = await db.select().from(withdrawals);
  return res.json(toSnake(all.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())));
});

router.patch("/withdrawals/:id/approve", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  // GUARD: only approve if still pending or processing — never approve a rejected withdrawal
  // (rejected = balance already refunded; approving it would create a double-payment)
  const [current] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (!current) return res.status(404).json({ error: "Not found" });
  if (current.status === "rejected" || current.status === "approved") {
    return res.status(409).json({ error: `Cannot approve: withdrawal is already '${current.status}'` });
  }

  // Balance already deducted at submission — just mark approved
  const [updated] = await db
    .update(withdrawals)
    .set({ status: "approved", adminNote: req.body.adminNote, updatedAt: new Date() })
    .where(and(eq(withdrawals.id, req.params.id), sql`${withdrawals.status} IN ('pending', 'processing')`))
    .returning();
  if (!updated) return res.status(409).json({ error: "Concurrent update — please refresh" });
  return res.json(updated);
});

// FIXED: restores balance from both "pending" and "processing" status
router.patch("/withdrawals/:id/reject", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const updated = await atomicRejectWithdrawal(req.params.id, req.body.adminNote);
  if (!updated) {
    const [current] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
    return current
      ? res.status(409).json({ error: "Already processed", status: current.status })
      : res.status(404).json({ error: "Not found" });
  }
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

// FIXED: restores balance from both "pending" and "processing"
router.patch("/withdrawals/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Not found" });

  if (status === "rejected") {
    const updated = await atomicRejectWithdrawal(req.params.id, adminNote);
    if (!updated) {
      return res.status(409).json({ error: "Already processed", status: withdrawal.status });
    }
    return res.json(updated);
  }

  // Approved — balance already deducted, just update status
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

// POST alias used by RechargePaiement.tsx frontend (was missing — caused "Failed to create deposit record")
router.post("/payments/recharges", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let me: Awaited<ReturnType<typeof getProfileFromToken>>;
  try {
    me = await getProfileFromToken(token);
  } catch (dbErr: any) {
    console.error("[payments/recharges] DB error:", dbErr?.message);
    return res.status(503).json({ error: "Database unavailable." });
  }
  if (!me) return res.status(401).json({ error: "Session expired. Please login again." });

  const body = req.body as Record<string, any>;
  const amount        = body.amount;
  const phone         = body.phone        ?? "";
  const countryCode   = body.countryCode  ?? body.country_code  ?? "";
  const paymentMethod = body.paymentMethod ?? body.payment_method ?? null;
  const transactionRef  = body.transactionRef  ?? body.transaction_ref  ?? null;
  const proofImageUrl   = body.proofImageUrl   ?? body.proof_image_url  ?? null;

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    // Validate min/max from site_settings
    const settingRows = await db.select().from(siteSettings)
      .where(inArray(siteSettings.key, ["deposit_min", "deposit_max"]));
    const getSetting = (key: string) => {
      const row = settingRows.find((r) => r.key === key);
      return row ? Number(row.value) : null;
    };
    const depMin = getSetting("deposit_min");
    const depMax = getSetting("deposit_max");
    if (depMin !== null && !isNaN(depMin) && numAmount < depMin) {
      return res.status(400).json({ error: `Le montant minimum de dépôt est ${depMin} USDT` });
    }
    if (depMax !== null && !isNaN(depMax) && numAmount > depMax) {
      return res.status(400).json({ error: `Le montant maximum de dépôt est ${depMax} USDT` });
    }
  } catch (settErr: any) {
    console.warn("[payments/recharges] Could not fetch site settings for validation:", settErr?.message);
  }

  try {
    const insertValues: Record<string, any> = {
      id: crypto.randomUUID(),
      userId: me.userId,
      amount: String(numAmount),
      status: "pending",
    };
    if (phone)          insertValues.phone          = phone;
    if (countryCode)    insertValues.countryCode    = countryCode;
    if (paymentMethod)  insertValues.paymentMethod  = paymentMethod;
    if (transactionRef) insertValues.transactionRef = transactionRef;
    if (proofImageUrl)  insertValues.proofImageUrl  = proofImageUrl;

    const [recharge] = await db.insert(recharges).values(insertValues as any).returning();
    return res.json(recharge);
  } catch (err: any) {
    console.error("[payments/recharges POST] DB insert error:", err?.message, err?.code);
    const detail = err?.message || "Unknown database error";
    return res.status(500).json({ error: `Failed to create deposit: ${detail}` });
  }
});

// FIXED: atomic approve — no double-credit even if IPN fires concurrently
router.patch("/payments/recharges/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };

  if (status === "approved") {
    const updated = await atomicApproveRecharge(req.params.id, adminNote);
    if (!updated) {
      const [current] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
      return current
        ? res.status(409).json({ error: "Already processed", status: current.status })
        : res.status(404).json({ error: "Not found" });
    }
    return res.json(updated);
  }

  const [recharge] = await db.select().from(recharges).where(eq(recharges.id, req.params.id)).limit(1);
  if (!recharge) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(recharges)
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

// FIXED: restores balance from both "pending" and "processing"
router.patch("/payments/withdrawals/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, req.params.id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Not found" });

  if (status === "rejected") {
    const updated = await atomicRejectWithdrawal(req.params.id, adminNote);
    if (!updated) {
      return res.status(409).json({ error: "Already processed", status: withdrawal.status });
    }
    return res.json(updated);
  }

  // Approved — balance already deducted, just update status
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

// ─── GET /user-wallets/my (alias for /wallets/my) ────────────────────────────
router.get("/user-wallets/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const wallets = await db.select().from(userWallets).where(eq(userWallets.userId, me.userId));
  return res.json(wallets);
});

// ─── GET /user-wallets/batch?ids=id1,id2 ────────────────────────────────────

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

// ─── DELETE /user-wallets/:id ────────────────────────────────────────────────
router.delete("/user-wallets/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const walletId = req.params.id;
  const [existing] = await db.select().from(userWallets).where(eq(userWallets.id, walletId)).limit(1);
  if (!existing) return res.status(404).json({ error: "Wallet not found" });
  if (existing.userId !== me.userId) return res.status(403).json({ error: "Forbidden" });
  await db.delete(userWallets).where(eq(userWallets.id, walletId));
  return res.json({ ok: true });
});

export { atomicRejectWithdrawal };
export default router;
