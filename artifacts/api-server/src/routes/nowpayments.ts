import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { recharges, profiles } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

function getApiKey(): string {
  return process.env["NOWPAYMENTS_API_KEY"] ?? "";
}

function getIpnSecret(): string {
  return process.env["NOWPAYMENTS_IPN_SECRET"] ?? "";
}

function getWebhookUrl(): string {
  if (process.env["NOWPAYMENTS_WEBHOOK_URL"]) {
    return process.env["NOWPAYMENTS_WEBHOOK_URL"];
  }
  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (domain) return `https://${domain}/api/nowpayments/webhook`;
  return "";
}

function sortObjectKeys(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.fromEntries(
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .map((k) => [k, sortObjectKeys((obj as Record<string, unknown>)[k])])
  );
}

async function approveRechargeByPaymentId(paymentId: string): Promise<void> {
  const [recharge] = await db
    .select()
    .from(recharges)
    .where(eq(recharges.transactionRef, paymentId))
    .limit(1);

  if (!recharge || recharge.status !== "pending") return;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, recharge.userId))
    .limit(1);

  if (!profile) return;

  const amount = Number(recharge.amount);

  await db
    .update(profiles)
    .set({
      balance: String(Number(profile.balance ?? 0) + amount),
      depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, recharge.userId));

  await db
    .update(recharges)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(recharges.id, recharge.id));
}

router.post("/nowpayments/create", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: "NowPayments API key not configured. Please contact support." });
  }

  const { amount, currency, rechargeId } = req.body as {
    amount?: number;
    currency?: string;
    rechargeId?: string;
  };

  if (!amount || !currency || !rechargeId) {
    return res.status(400).json({ error: "amount, currency and rechargeId are required" });
  }

  try {
    const webhookUrl = getWebhookUrl();
    const body: Record<string, unknown> = {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: currency,
      order_id: rechargeId,
      order_description: "ESKOM Energy deposit",
    };
    if (webhookUrl) body.ipn_callback_url = webhookUrl;

    const npRes = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!npRes.ok) {
      const errText = await npRes.text();
      console.error("NowPayments create error:", errText);
      return res.status(502).json({ error: "Payment gateway error. Please try again." });
    }

    const data = (await npRes.json()) as {
      payment_id: string;
      pay_address: string;
      pay_amount: number;
      pay_currency: string;
      expiration_estimate_date?: string;
    };

    await db
      .update(recharges)
      .set({ transactionRef: String(data.payment_id), updatedAt: new Date() })
      .where(eq(recharges.id, rechargeId));

    return res.json({
      paymentId: data.payment_id,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      payCurrency: data.pay_currency,
      expirationDate: data.expiration_estimate_date ?? null,
    });
  } catch (err) {
    console.error("nowpayments/create error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nowpayments/status/:paymentId", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  const { paymentId } = req.params;

  try {
    const npRes = await fetch(`${NOWPAYMENTS_API}/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!npRes.ok) {
      return res.status(502).json({ error: "NowPayments API error" });
    }

    const data = (await npRes.json()) as {
      payment_status: string;
      actually_paid?: number;
      pay_currency?: string;
    };

    const status = data.payment_status;

    if (status === "finished" || status === "confirmed") {
      await approveRechargeByPaymentId(String(paymentId));
    }

    return res.json({
      status,
      actuallyPaid: data.actually_paid ?? null,
      payCurrency: data.pay_currency ?? null,
    });
  } catch (err) {
    console.error("nowpayments/status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nowpayments/webhook", async (req, res) => {
  const ipnSecret = getIpnSecret();
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;

  if (ipnSecret && sig) {
    const sorted = sortObjectKeys(req.body);
    const expected = crypto
      .createHmac("sha512", ipnSecret)
      .update(JSON.stringify(sorted))
      .digest("hex");

    if (expected !== sig) {
      console.warn("NowPayments webhook: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body as { payment_id?: string; payment_status?: string };
  const status = payload.payment_status;

  if (status === "finished" || status === "confirmed") {
    await approveRechargeByPaymentId(String(payload.payment_id));
  }

  return res.json({ ok: true });
});

export default router;
