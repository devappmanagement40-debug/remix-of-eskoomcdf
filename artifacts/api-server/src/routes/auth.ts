import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, userRoles, userSessions } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function phoneToIdentifier(phone: string): string {
  return `${phone}@users.eskom.app`;
}

router.post("/auth/signup", async (req, res) => {
  const { phone, password, inviteCode } = req.body;
  if (!phone || !password || !inviteCode) {
    return res.status(400).json({ error: "phone, password and inviteCode are required" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Auth service not configured" });
  }

  try {
    const { data: referrerId, error: codeError } = await (async () => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_referral_code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      if (!r.ok) return { data: null, error: true };
      const data = await r.json();
      return { data, error: null };
    })();

    if (codeError || !referrerId) {
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
      const updateData: Record<string, unknown> = {
        phone,
        country_code: "+509",
        referral_code: referralCode,
        ...(referrerId ? { referred_by: referrerId } : {}),
      };

      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(updateData),
        }
      );
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
