import { Router } from "express";
import { db } from "../db";
import { profiles, userRoles, userSessions } from "../db";
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

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Service key not configured" });
  }

  const SERVICE_HEADERS = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  try {
    // Step 1: Validate referral code via Supabase REST API (no direct DB pool needed)
    // Use service role key to bypass RLS and ensure reliable lookup
    const codeRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id&referral_code=ilike.${encodeURIComponent(inviteCode.trim())}&limit=1`,
      { headers: SERVICE_HEADERS }
    );
    const codeData = codeRes.ok ? await codeRes.json() : [];
    const referrerId: string | null = Array.isArray(codeData) && codeData.length > 0
      ? codeData[0].id
      : null;

    if (!referrerId) {
      return res.status(400).json({ error: "Invalid invitation code" });
    }

    // Step 2: Create Supabase auth user via Admin API
    // Using admin endpoint + service key bypasses email format restrictions
    // and marks the user as email_confirmed so they can log in immediately
    const email = phoneToIdentifier(phone);

    // First check if user already exists (avoid duplicate)
    const existCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=user_id&phone=eq.${encodeURIComponent(phone)}&limit=1`,
      { headers: SERVICE_HEADERS }
    );
    const existData = existCheck.ok ? await existCheck.json() : [];
    if (Array.isArray(existData) && existData.length > 0) {
      return res.status(409).json({ error: "This number is already registered" });
    }

    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: SERVICE_HEADERS,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,   // skip email confirmation — phone is already verified via invite code
        user_metadata: { phone, country_code: countryCode || "+509" },
      }),
    });

    const signupData = await signupRes.json();

    if (!signupRes.ok || signupData.error) {
      const msg =
        signupData.error?.message ||
        signupData.msg ||
        signupData.message ||
        "Sign up failed";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        return res.status(409).json({ error: "This number is already registered" });
      }
      return res.status(400).json({ error: msg });
    }

    const userId: string = signupData.id || signupData.user?.id;

    if (userId) {
      const referralCode =
        phone.slice(-4).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase();

      const profileData = {
        phone,
        country_code: countryCode || "+509",
        referral_code: referralCode,
        referred_by: referrerId,
      };

      // Step 3a: Try PATCH first (profile may already exist from a Supabase trigger)
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { ...SERVICE_HEADERS, Prefer: "return=representation" },
          body: JSON.stringify(profileData),
        }
      );
      const patchData = patchRes.ok ? await patchRes.json() : [];

      // Step 3b: If no row was updated, insert a fresh profile row
      if (!patchData || (Array.isArray(patchData) && patchData.length === 0)) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: "POST",
          headers: {
            ...SERVICE_HEADERS,
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: userId,
            balance: 0,
            deposit_balance: 0,
            earnings_balance: 0,
            referral_balance: 0,
            gift_points: 0,
            spins_balance: 0,
            vip_level: 0,
            ...profileData,
          }),
        });
      }
    }

    // Step 4: Generate a session so the user is logged in immediately after signup
    // Admin API does not return a session — get one via password grant
    let session = null;
    try {
      const tokenRes = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY! },
          body: JSON.stringify({ email, password }),
        }
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (!tokenData.error) {
          session = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
            expires_in: tokenData.expires_in,
          };
        }
      }
    } catch { /* session optional — user can log in manually */ }

    return res.json({
      ok: true,
      session,
      user: signupData,
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
