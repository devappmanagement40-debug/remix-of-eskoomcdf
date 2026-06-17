import { Router } from "express";
import { db } from "@workspace/db";
import { giftCodes, giftCodeUses, giftRewards, pointExchanges, wheelPrizes, wheelSpins, chatMessages, userSessions, profiles, userRoles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

router.post("/gift-codes/redeem", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code required" });

  const [giftCode] = await db.select().from(giftCodes).where(eq(giftCodes.code, code.trim().toUpperCase())).limit(1);
  if (!giftCode || !giftCode.isActive) return res.status(400).json({ error: "Invalid code" });
  if (giftCode.expiresAt && giftCode.expiresAt < new Date()) return res.status(400).json({ error: "Code expired" });
  if (giftCode.usedCount >= giftCode.maxUses) return res.status(400).json({ error: "Code already used" });

  const alreadyUsed = await db.select().from(giftCodeUses).where(
    and(eq(giftCodeUses.codeId, giftCode.id), eq(giftCodeUses.userId, me.userId))
  ).limit(1);
  if (alreadyUsed.length > 0) return res.status(400).json({ error: "Code already used by you" });

  const points = giftCode.pointsValue ?? 0;
  await db.insert(giftCodeUses).values({ id: crypto.randomUUID(), codeId: giftCode.id, userId: me.userId, pointsAwarded: points });
  await db.update(giftCodes).set({ usedCount: giftCode.usedCount + 1 }).where(eq(giftCodes.id, giftCode.id));
  await db.update(profiles).set({ giftPoints: (me.giftPoints ?? 0) + points, updatedAt: new Date() }).where(eq(profiles.userId, me.userId));

  return res.json({ ok: true, pointsAwarded: points });
});

router.get("/gift-rewards", async (req, res) => {
  const all = await db.select().from(giftRewards).where(eq(giftRewards.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/gift-rewards/:id/redeem", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const [reward] = await db.select().from(giftRewards).where(eq(giftRewards.id, req.params.id)).limit(1);
  if (!reward || !reward.isActive) return res.status(400).json({ error: "Reward not available" });

  const pointsRequired = reward.pointsRequired ?? 0;
  if ((me.giftPoints ?? 0) < pointsRequired) return res.status(400).json({ error: "Insufficient points" });

  const [exchange] = await db.insert(pointExchanges).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    rewardId: reward.id,
    rewardName: reward.name,
    pointsSpent: pointsRequired,
    moneyCredited: String(reward.moneyValue),
  }).returning();

  await db.update(profiles).set({
    giftPoints: (me.giftPoints ?? 0) - pointsRequired,
    balance: String(Number(me.balance ?? 0) + Number(reward.moneyValue)),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json(exchange);
});

router.get("/point-exchanges/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const exchanges = await db.select().from(pointExchanges).where(eq(pointExchanges.userId, me.userId));
  return res.json(exchanges.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.get("/wheel-prizes", async (req, res) => {
  const all = await db.select().from(wheelPrizes).where(eq(wheelPrizes.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.post("/wheel/spin", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  if ((me.spinsBalance ?? 0) < 1) return res.status(400).json({ error: "No spins available" });

  // All active prizes (sorted) — used to determine winIndex for the wheel animation
  const allActive = await db.select().from(wheelPrizes)
    .where(eq(wheelPrizes.isActive, true));
  allActive.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  // Only winnable prizes are eligible for selection
  const winnable = allActive.filter(p => p.isWinnable !== false);
  if (!winnable.length) return res.status(400).json({ error: "No prizes available" });

  // Weighted random selection — probabilities stored as percentages (0-100 scale)
  const totalProb = winnable.reduce((sum, p) => sum + Number(p.probability ?? 0), 0);
  const rand = Math.random() * (totalProb || 100);
  let cumulative = 0;
  let selected = winnable[winnable.length - 1];
  for (const prize of winnable) {
    cumulative += Number(prize.probability ?? 0);
    if (rand <= cumulative) { selected = prize; break; }
  }

  // winIndex = position of selected prize in the full wheel (for animation)
  const winIndex = allActive.findIndex(p => p.id === selected.id);

  const isVip = selected.prizeType === "vip";
  const isCash = selected.prizeType === "cash";
  const newSpinsBalance = (me.spinsBalance ?? 0) - 1;
  const newBalance = isCash
    ? String(Number(me.balance ?? 0) + Number(selected.value ?? 0))
    : String(me.balance ?? 0);

  const [spin] = await db.insert(wheelSpins).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    prizeId: selected.id,
    prizeLabel: selected.label ?? "",
    prizeType: selected.prizeType ?? "cash",
    prizeValue: String(selected.value ?? 0),
    vipLevel: isVip ? (selected.vipLevel ?? null) : null,
    status: isVip ? "pending_vip" : "completed",
  }).returning();

  await db.update(profiles).set({
    spinsBalance: newSpinsBalance,
    balance: newBalance,
    updatedAt: new Date(),
  }).where(eq(profiles.userId, me.userId));

  return res.json({ winIndex, prize: selected, spinsLeft: newSpinsBalance, spin });
});

router.get("/wheel/recent-winners", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 10), 50);
  const spins = await db.select().from(wheelSpins);
  const winners = spins
    .filter(s => s.status === "completed" && Number(s.prizeValue) > 0)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, limit);
  return res.json(winners);
});

router.get("/chat/my", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const messages = await db.select().from(chatMessages).where(eq(chatMessages.userId, me.userId));
  return res.json(messages.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
});

router.post("/chat/send", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const [msg] = await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    message,
    sender: "user",
    isAi: false,
  }).returning();

  const aiReply = await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    message: "Thank you for your message! Our support team will respond shortly.",
    sender: "sarah",
    isAi: true,
  }).returning();

  return res.json({ message: msg, reply: aiReply[0] });
});

router.post("/chat/send-system", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const { message, sender } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const [msg] = await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: me.userId,
    message,
    sender: sender ?? "system",
    isAi: true,
  }).returning();

  return res.json(msg);
});

// ─── Wheel aliases (frontend uses /wheel/prizes and /wheel/my-spins) ─────────
router.get("/wheel/prizes", async (req, res) => {
  const all = await db.select().from(wheelPrizes).where(eq(wheelPrizes.isActive, true));
  return res.json(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
});

router.get("/wheel/my-spins", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const spins = await db.select().from(wheelSpins).where(eq(wheelSpins.userId, me.userId));
  return res.json(spins.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, limit));
});

export default router;
