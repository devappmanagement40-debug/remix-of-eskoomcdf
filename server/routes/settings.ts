import { Router } from "express";
import { db } from "../db";
import { siteSettings, popupMessages, faqItems, socialLinks, officialDocuments, banners, infoItems, userSessions, profiles, userRoles } from "../db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { toSnake } from "../utils/toSnake";

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

router.get("/site-settings", async (req, res) => {
  const all = await db.select().from(siteSettings);
  return res.json(all);
});

router.get("/site-settings/:key", async (req, res) => {
  const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, req.params.key)).limit(1);
  if (!setting) return res.status(404).json({ error: "Not found" });
  return res.json(setting);
});

router.put("/site-settings/:key", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, req.params.key)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(siteSettings).set({ value: req.body.value, updatedAt: new Date() }).where(eq(siteSettings.key, req.params.key)).returning();
    return res.json(updated);
  } else {
    const [created] = await db.insert(siteSettings).values({ id: crypto.randomUUID(), key: req.params.key, value: req.body.value, category: req.body.category ?? "general" }).returning();
    return res.json(created);
  }
});

router.get("/popup-messages", async (req, res) => {
  const { triggerKey, trigger_key } = req.query as Record<string, string>;
  const key = triggerKey || trigger_key;
  const all = await db.select().from(popupMessages).where(eq(popupMessages.isActive, true));
  const filtered = key ? all.filter(p => p.triggerKey === key) : all;
  return res.json(toSnake(filtered));
});

router.post("/popup-messages", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [popup] = await db.insert(popupMessages).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(popup);
});

router.patch("/popup-messages/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(popupMessages).set({ ...req.body, updatedAt: new Date() }).where(eq(popupMessages.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/popup-messages/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  await db.delete(popupMessages).where(eq(popupMessages.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/faq", async (req, res) => {
  const all = await db.select().from(faqItems).where(eq(faqItems.isActive, true));
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.get("/faq-items", async (req, res) => {
  const all = await db.select().from(faqItems).where(eq(faqItems.isActive, true));
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.get("/social-links", async (req, res) => {
  const all = await db.select().from(socialLinks).where(eq(socialLinks.isActive, true));
  return res.json(toSnake(all));
});

router.get("/documents", async (req, res) => {
  const all = await db.select().from(officialDocuments).where(eq(officialDocuments.isActive, true));
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.get("/banners", async (req, res) => {
  const all = await db.select().from(banners).where(eq(banners.isActive, true));
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.post("/banners", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [banner] = await db.insert(banners).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(banner);
});

router.patch("/banners/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(banners).set({ ...req.body, updatedAt: new Date() }).where(eq(banners.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/banners/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  await db.delete(banners).where(eq(banners.id, req.params.id));
  return res.json({ ok: true });
});

router.get("/info-items", async (req, res) => {
  const all = await db.select().from(infoItems).where(eq(infoItems.isActive, true));
  return res.json(toSnake(all.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))));
});

router.post("/info-items", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [item] = await db.insert(infoItems).values({ id: crypto.randomUUID(), ...req.body }).returning();
  return res.json(item);
});

router.patch("/info-items/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(infoItems).set({ ...req.body, updatedAt: new Date() }).where(eq(infoItems.id, req.params.id)).returning();
  return res.json(updated);
});

router.delete("/info-items/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const me = await getProfileFromToken(token);
  if (!me || !await isAdmin(me.userId)) return res.status(403).json({ error: "Forbidden" });

  await db.delete(infoItems).where(eq(infoItems.id, req.params.id));
  return res.json({ ok: true });
});

export default router;
