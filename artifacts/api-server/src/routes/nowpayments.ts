import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { recharges, profiles, withdrawals } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

// ---- Config helpers ----
function getApiKey(): string { return process.env["NOWPAYMENTS_API_KEY"] ?? ""; }
function getIpnSecret(): string { return process.env["NOWPAYMENTS_IPN_SECRET"] ?? ""; }
function getPayoutEmail(): string { return process.env["NOWPAYMENTS_EMAIL"] ?? ""; }
function getPayoutPassword(): string { return process.env["NOWPAYMENTS_PASSWORD"] ?? ""; }
function getWebhookUrl(path: string): string {
  const base = process.env["NOWPAYMENTS_WEBHOOK_URL"];
  if (base) return path === "webhook" ? base : base.replace(/webhook$/, path);
  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (domain) return `https://${domain}/api/nowpayments/${path}`;
  return "";
}

// ---- Signature helper ----
function sortObjectKeys(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.fromEntries(
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .map((k) => [k, sortObjectKeys((obj as Record<string, unknown>)[k])])
  );
}

function verifyNpSignature(secret: string, body: unknown, sig: string): boolean {
  const sorted = sortObjectKeys(body);
  const expected = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(sorted))
    .digest("hex");
  return expected === sig;
}

// ---- Fallback currencies (when API key not configured) ----
const FALLBACK_CURRENCIES = [
  { code: "usdtbsc",   name: "Tether USD (BEP20)",   logo: "" },
  { code: "usdtmatic", name: "Tether USD (Polygon)",  logo: "" },
  { code: "usdterc20", name: "Tether USD (ERC20)",    logo: "" },
  { code: "usdttrc20", name: "Tether USD (TRC20)",    logo: "" },
  { code: "trx",       name: "TRON",                  logo: "" },
  { code: "bnbbsc",    name: "Binance Coin (BEP20)",  logo: "" },
  { code: "eth",       name: "Ethereum",              logo: "" },
];

// ---- In-memory currencies cache (10 minutes) ----
type CurrencyItem = { code: string; name: string; logo: string };
let currenciesCache: { data: CurrencyItem[]; ts: number } | null = null;

// ---- DB helpers ----
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
  await db.update(profiles).set({
    balance: String(Number(profile.balance ?? 0) + amount),
    depositBalance: String(Number(profile.depositBalance ?? 0) + amount),
    updatedAt: new Date(),
  }).where(eq(profiles.userId, recharge.userId));

  await db.update(recharges)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(recharges.id, recharge.id));
}

async function approveWithdrawalByExternalId(externalId: string): Promise<void> {
  await db.update(withdrawals)
    .set({
      status: "approved",
      adminNote: "✅ Auto-approved via NowPayments payout IPN",
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, externalId));
}

// ---- Payout JWT auth ----
async function getPayoutToken(): Promise<string> {
  const email = getPayoutEmail();
  const password = getPayoutPassword();
  if (!email || !password) {
    throw new Error("NOWPAYMENTS_EMAIL and NOWPAYMENTS_PASSWORD are not configured");
  }
  const res = await fetch(`${NOWPAYMENTS_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NowPayments auth failed: ${errText}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

// ============================================================
// ROUTES
// ============================================================

// GET /nowpayments/currencies — Available currencies with logos (cached 10min)
router.get("/nowpayments/currencies", async (req, res) => {
  if (currenciesCache && Date.now() - currenciesCache.ts < 600_000) {
    return res.json({ currencies: currenciesCache.data });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.json({ currencies: FALLBACK_CURRENCIES });
  }

  try {
    const [fullRes, merchantRes] = await Promise.all([
      fetch(`${NOWPAYMENTS_API}/full-currencies`, { headers: { "x-api-key": apiKey } }),
      fetch(`${NOWPAYMENTS_API}/merchant/coins`, { headers: { "x-api-key": apiKey } }),
    ]);

    const fullData = fullRes.ok
      ? ((await fullRes.json()) as { currencies?: Record<string, unknown>[] })
      : null;
    const merchantData = merchantRes.ok
      ? ((await merchantRes.json()) as { selectedCurrencies?: string[] })
      : null;

    if (fullData?.currencies && Array.isArray(fullData.currencies)) {
      const all: CurrencyItem[] = (fullData.currencies as Record<string, unknown>[]).map((c) => ({
        code: String(c["code"] ?? c["id"] ?? "").toLowerCase(),
        name: String(c["name"] ?? c["code"] ?? ""),
        logo: String(c["logo_url"] ?? c["logo"] ?? c["image"] ?? ""),
      })).filter((c) => c.code.length > 0);

      const enabledCodes = merchantData?.selectedCurrencies?.map((s: string) => s.toLowerCase());
      const filtered = enabledCodes && enabledCodes.length > 0
        ? all.filter((c) => enabledCodes.includes(c.code))
        : all;

      const result = filtered.length > 0 ? filtered : all;
      currenciesCache = { data: result, ts: Date.now() };
      return res.json({ currencies: result });
    }

    return res.json({ currencies: FALLBACK_CURRENCIES });
  } catch (err) {
    console.error("currencies error:", err);
    return res.json({ currencies: FALLBACK_CURRENCIES });
  }
});

// GET /nowpayments/estimate?amount=&currency_from=usd&currency_to=usdtbsc
router.get("/nowpayments/estimate", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  const { amount, currency_from = "usd", currency_to } = req.query as Record<string, string>;
  if (!amount || !currency_to) {
    return res.status(400).json({ error: "amount and currency_to are required" });
  }

  try {
    const url = `${NOWPAYMENTS_API}/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`;
    const npRes = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!npRes.ok) return res.status(502).json({ error: "NowPayments API error" });
    return res.json(await npRes.json());
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /nowpayments/min-amount?currency_from=usd&currency_to=usdtbsc
router.get("/nowpayments/min-amount", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  const { currency_from = "usd", currency_to } = req.query as Record<string, string>;
  if (!currency_to) return res.status(400).json({ error: "currency_to is required" });

  try {
    const url = `${NOWPAYMENTS_API}/min-amount?currency_from=${currency_from}&currency_to=${currency_to}`;
    const npRes = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!npRes.ok) return res.status(502).json({ error: "NowPayments API error" });
    return res.json(await npRes.json());
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /nowpayments/create — Create deposit payment
router.post("/nowpayments/create", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: "Payment gateway not configured. Please contact support." });
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
    const webhookUrl = getWebhookUrl("webhook");
    const body: Record<string, unknown> = {
      price_amount: amount,
      price_currency: "usd",
      pay_currency: currency,
      order_id: rechargeId,
      order_description: "ESKOM Energy deposit",
      is_fee_paid_by_user: false,
    };
    if (webhookUrl) body["ipn_callback_url"] = webhookUrl;

    const npRes = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
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
      network?: string;
    };

    await db.update(recharges)
      .set({ transactionRef: String(data.payment_id), updatedAt: new Date() })
      .where(eq(recharges.id, rechargeId));

    return res.json({
      paymentId: data.payment_id,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      payCurrency: data.pay_currency,
      network: data.network ?? null,
      expirationDate: data.expiration_estimate_date ?? null,
    });
  } catch (err) {
    console.error("nowpayments/create error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /nowpayments/status/:paymentId — Check deposit status + auto-approve
router.get("/nowpayments/status/:paymentId", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  const { paymentId } = req.params;
  try {
    const npRes = await fetch(`${NOWPAYMENTS_API}/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
    });
    if (!npRes.ok) return res.status(502).json({ error: "NowPayments API error" });

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

// POST /nowpayments/webhook — IPN for deposits (HMAC-SHA512 verified)
router.post("/nowpayments/webhook", async (req, res) => {
  const ipnSecret = getIpnSecret();
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;

  if (ipnSecret && sig) {
    if (!verifyNpSignature(ipnSecret, req.body, sig)) {
      console.warn("NowPayments deposit IPN: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body as { payment_id?: string; payment_status?: string };
  const status = payload.payment_status;
  console.log(`[NowPayments IPN deposit] status=${status} id=${payload.payment_id}`);

  if (status === "finished" || status === "confirmed") {
    await approveRechargeByPaymentId(String(payload.payment_id));
  }

  return res.json({ ok: true });
});

// POST /nowpayments/payout — Automatic withdrawal via NowPayments Payouts API
router.post("/nowpayments/payout", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "NowPayments not configured" });

  const { withdrawalId } = req.body as { withdrawalId?: string };
  if (!withdrawalId) return res.status(400).json({ error: "withdrawalId is required" });

  try {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if (withdrawal.status !== "pending") {
      return res.status(400).json({ error: `Withdrawal already ${withdrawal.status}` });
    }

    const address = withdrawal.phone;
    const currency = (withdrawal.countryCode ?? "").toLowerCase();
    const amount = Number(withdrawal.netAmount);

    if (!address || !currency || amount <= 0) {
      return res.status(400).json({ error: "Missing wallet address, currency or amount" });
    }

    const token = await getPayoutToken();

    const webhookUrl = getWebhookUrl("payout-webhook");
    const payoutBody: Record<string, unknown> = {
      batch_withdrawal: [
        {
          address,
          currency,
          amount,
          unique_external_id: withdrawalId,
          payout_description: "ESKOM Energy withdrawal",
        },
      ],
    };
    if (webhookUrl) payoutBody["ipn_callback_url"] = webhookUrl;

    const npRes = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payoutBody),
    });

    if (!npRes.ok) {
      const errText = await npRes.text();
      console.error("NowPayments payout error:", errText);
      return res.status(502).json({ error: errText });
    }

    const data = (await npRes.json()) as { id: string };
    const payoutId = data.id;

    await db.update(withdrawals).set({
      status: "processing",
      adminNote: `🚀 NowPayments payout submitted — ID: ${payoutId}`,
      updatedAt: new Date(),
    }).where(eq(withdrawals.id, withdrawalId));

    return res.json({ success: true, payoutId });
  } catch (err) {
    console.error("nowpayments/payout error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /nowpayments/payout/:payoutId — Get payout status
router.get("/nowpayments/payout/:payoutId", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  try {
    const token = await getPayoutToken();
    const npRes = await fetch(`${NOWPAYMENTS_API}/payout/${req.params.payoutId}`, {
      headers: { "x-api-key": apiKey, "Authorization": `Bearer ${token}` },
    });
    if (!npRes.ok) return res.status(502).json({ error: "NowPayments API error" });
    return res.json(await npRes.json());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /nowpayments/payout-webhook — IPN for payouts (HMAC-SHA512 verified)
router.post("/nowpayments/payout-webhook", async (req, res) => {
  const ipnSecret = getIpnSecret();
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;

  if (ipnSecret && sig) {
    if (!verifyNpSignature(ipnSecret, req.body, sig)) {
      console.warn("NowPayments payout IPN: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  type PayoutWebhookPayload = {
    id?: string;
    status?: string;
    batch_withdrawal?: Array<{
      unique_external_id?: string;
      status?: string;
    }>;
    withdrawals?: Array<{
      unique_external_id?: string;
      status?: string;
    }>;
  };

  const payload = req.body as PayoutWebhookPayload;
  console.log(`[NowPayments IPN payout] status=${payload.status} id=${payload.id}`);

  const items = payload.batch_withdrawal ?? payload.withdrawals ?? [];
  for (const item of items) {
    const extId = item.unique_external_id;
    const st = (item.status ?? "").toUpperCase();
    if (extId && (st === "FINISHED" || st === "COMPLETE" || st === "COMPLETED")) {
      await approveWithdrawalByExternalId(extId);
    }
  }

  return res.json({ ok: true });
});

export default router;
