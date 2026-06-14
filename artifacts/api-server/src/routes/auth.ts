import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SETUP_TOKEN = "5849466548400404084435113616";

function phoneToIdentifier(phone: string): string {
  return `${phone}@users.ge-energy.app`;
}

router.post("/auth/admin-setup", async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || token !== ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Service not configured" });
  }

  try {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const userData = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: userData.message || userData.msg || "Failed to create user" });
    }

    const userId: string = userData.id;

    await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ user_id: userId, role: "admin" }),
    });

    const upsertProfile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ full_name: "Administrator", phone: "admin", country_code: "+0", referral_code: "ADMIN001" }),
    });

    if (upsertProfile.status === 404 || upsertProfile.status === 200 || upsertProfile.status === 204) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "return=minimal,resolution=ignore-duplicates",
        },
        body: JSON.stringify({ user_id: userId, full_name: "Administrator", phone: "admin", country_code: "+0", referral_code: "ADMIN001" }),
      });
    }

    return res.json({ ok: true, userId });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Admin setup failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  const { phone, password, inviteCode, countryCode } = req.body;
  if (!phone || !password || !inviteCode) {
    return res.status(400).json({ error: "phone, password and inviteCode are required" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Auth service not configured" });
  }

  try {
    // Validate referral code directly via DB (avoids needing a Supabase RPC function)
    const { pool } = await import("@workspace/db");
    const { rows: codeRows } = await pool.query(
      `SELECT id FROM profiles WHERE UPPER(referral_code) = UPPER($1) LIMIT 1`,
      [inviteCode.trim()]
    );
    const referrerId: string | null = codeRows[0]?.id ?? null;

    if (!referrerId) {
      return res.status(400).json({ error: "Invalid invitation code" });
    }

    const email = phoneToIdentifier(phone);
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const signupData = await signupRes.json();

    if (!signupRes.ok || signupData.error) {
      const msg = signupData.error?.message || signupData.msg || "Sign up failed";
      if (msg.toLowerCase().includes("already registered")) {
        return res.status(409).json({ error: "This number is already registered" });
      }
      return res.status(400).json({ error: msg });
    }

    const userId: string = signupData.user?.id || signupData.id;

    if (userId) {
      const referralCode =
        phone.slice(-4).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase();

      // Try PATCH first (profile may already exist from Supabase trigger), then INSERT
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            phone,
            country_code: countryCode || "+509",
            referral_code: referralCode,
            referred_by: referrerId,
          }),
        }
      );

      const patchData = await patchRes.json();
      // If no rows were updated (empty array), insert a new profile row
      if (!patchData || (Array.isArray(patchData) && patchData.length === 0)) {
        await pool.query(
          `INSERT INTO profiles (id, user_id, phone, country_code, referral_code, referred_by, balance, deposit_balance, earnings_balance, referral_balance, gift_points, spins_balance, vip_level)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, 0, 0, 0, 0, 0, 0)
           ON CONFLICT (user_id) DO UPDATE SET
             phone = EXCLUDED.phone,
             country_code = EXCLUDED.country_code,
             referral_code = EXCLUDED.referral_code,
             referred_by = EXCLUDED.referred_by`,
          [userId, phone, countryCode || "+509", referralCode, referrerId]
        );
      }
    }

    return res.json({
      ok: true,
      session: signupData.session ?? null,
      user: signupData.user ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sign up failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Auth service not configured" });
  }

  try {
    const email = phoneToIdentifier(phone);
    const tokenRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return res.status(401).json({ error: "Incorrect number or password" });
    }

    return res.json({
      ok: true,
      session: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
      },
      user: tokenData.user ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }
  return res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())))
      .limit(1);
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, session.userId))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const [role] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.userId))
      .limit(1);

    return res.json({ ...profile, role: role?.role ?? "user" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
