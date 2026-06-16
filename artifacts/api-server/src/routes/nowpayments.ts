import { Router } from "express";
import crypto from "crypto";
import { db, recharges, withdrawals, profiles } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();
const NP_API = "https://api.nowpayments.io/v1";

// ---- Config helpers ----
function getApiKey(): string { return process.env["NOWPAYMENTS_API_KEY"] ?? ""; }
function getIpnSecret(): string { return process.env["NOWPAYMENTS_IPN_SECRET"] ?? ""; }
function getPayoutEmail(): string { return process.env["NOWPAYMENTS_EMAIL"] ?? ""; }
function getPayoutPassword(): string { return process.env["NOWPAYMENTS_PASSWORD"] ?? ""; }

function getWebhookUrl(path: string): string {
  const base = process.env["NOWPAYMENTS_WEBHOOK_URL"];
  if (base) {
    const clean = base.replace(/\/$/, "");
    return path === "webhook" ? clean : `${clean.replace(/\/webhook$/, "")}/${path}`;
  }
  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (domain) return `https://${domain}/api/nowpayments/${path}`;
  return "";
}

// ---- HMAC-SHA512 signature verification ----
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
type CurrencyItem = { code: string; name: string; logo: string };

const FALLBACK_CURRENCIES: CurrencyItem[] = [
  { code: "usdtbsc",   name: "Tether USD (BEP20)",   logo: "" },
  { code: "usdttrc20", name: "Tether USD (TRC20)",   logo: "" },
  { code: "usdterc20", name: "Tether USD (ERC20)",   logo: "" },
  { code: "usdtmatic", name: "Tether USD (Polygon)", logo: "" },
  { code: "trx",       name: "TRON",                 logo: "" },
  { code: "bnbbsc",    name: "Binance Coin (BEP20)", logo: "" },
  { code: "eth",       name: "Ethereum",             logo: "" },
  { code: "btc",       name: "Bitcoin",              logo: "" },
  { code: "sol",       name: "Solana",               logo: "" },
  { code: "ltc",       name: "Litecoin",             logo: "" },
];

// ---- In-memory currencies cache (10 minutes) ----
let currenciesCache: { data: CurrencyItem[]; ts: number } | null = null;

// ============================================================
// IDEMPOTENT DB HELPERS — protected against double execution
// ============================================================

/**
 * Approve a recharge by NowPayments payment_id.
 * IDEMPOTENT: uses atomic WHERE status='pending' so concurrent calls only credit once.
 */
async function approveRechargeByPaymentId(paymentId: string): Promise<boolean> {
  // 1. Find the pending recharge for this payment_id
  const [recharge] = await db
    .select({ id: recharges.id, userId: recharges.userId, amount: recharges.amount, status: recharges.status })
    .from(recharges)
    .where(eq(recharges.transactionRef, paymentId))
    .limit(1);

  if (!recharge) {
    console.warn(`[NP] approveRecharge: no recharge found for paymentId=${paymentId}`);
    return false;
  }

  // 2. Already processed — skip (idempotency guard)
  if (recharge.status !== "pending") {
    console.log(`[NP] approveRecharge: already ${recharge.status} for paymentId=${paymentId} — skipping`);
    return false;
  }

  const amount = Number(recharge.amount);

  // 3. Atomically update recharge status to approved, only if still pending
  const [updated] = await db
    .update(recharges)
    .set({ status: "approved", updatedAt: new Date() })
    .where(and(eq(recharges.id, recharge.id), eq(recharges.status, "pending")))
    .returning({ id: recharges.id });

  if (!updated) {
    // Another concurrent call already approved it
    console.warn(`[NP] approveRecharge: concurrent update blocked for rechargeId=${recharge.id} — no double credit`);
    return false;
  }

  // 4. Atomically increment user balance (SQL-level, race-condition safe)
  await db
    .update(profiles)
    .set({
      balance: sql`${profiles.balance} + ${amount}`,
      depositBalance: sql`${profiles.depositBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, recharge.userId));

  console.log(`[NP] ✅ Recharge approved: ${recharge.id} — +${amount} USD → user ${recharge.userId}`);
  return true;
}

/**
 * Approve a withdrawal by our local withdrawal ID (used as unique_external_id in NowPayments).
 * IDEMPOTENT: skips if already approved.
 */
async function approveWithdrawalByExternalId(externalId: string): Promise<boolean> {
  const [withdrawal] = await db
    .select({ id: withdrawals.id, status: withdrawals.status })
    .from(withdrawals)
    .where(eq(withdrawals.id, externalId))
    .limit(1);

  if (!withdrawal) {
    console.warn(`[NP] approveWithdrawal: not found externalId=${externalId}`);
    return false;
  }

  if (withdrawal.status === "approved") {
    console.log(`[NP] approveWithdrawal: already approved externalId=${externalId} — skipping`);
    return false;
  }

  const [updated] = await db
    .update(withdrawals)
    .set({
      status: "approved",
      adminNote: "✅ Auto-approved via NowPayments payout IPN",
      updatedAt: new Date(),
    })
    .where(and(eq(withdrawals.id, externalId), eq(withdrawals.status, "processing")))
    .returning({ id: withdrawals.id });

  if (!updated) {
    console.warn(`[NP] approveWithdrawal: status not 'processing' for externalId=${externalId} — skipped`);
    return false;
  }

  console.log(`[NP] ✅ Withdrawal auto-approved: ${externalId}`);
  return true;
}

/**
 * Reject a withdrawal that NowPayments failed to process and refund the user's balance.
 * IDEMPOTENT: only acts if status is 'processing'.
 */
async function rejectWithdrawalByExternalId(externalId: string, reason: string): Promise<boolean> {
  const [withdrawal] = await db
    .select({ id: withdrawals.id, status: withdrawals.status, userId: withdrawals.userId, amount: withdrawals.amount })
    .from(withdrawals)
    .where(eq(withdrawals.id, externalId))
    .limit(1);

  if (!withdrawal) {
    console.warn(`[NP] rejectWithdrawal: not found externalId=${externalId}`);
    return false;
  }

  if (withdrawal.status !== "processing") {
    console.log(`[NP] rejectWithdrawal: status is '${withdrawal.status}' (not processing) — skipping`);
    return false;
  }

  const [updated] = await db
    .update(withdrawals)
    .set({
      status: "rejected",
      adminNote: `❌ NowPayments payout ${reason} — balance refunded automatically`,
      updatedAt: new Date(),
    })
    .where(and(eq(withdrawals.id, externalId), eq(withdrawals.status, "processing")))
    .returning({ id: withdrawals.id });

  if (!updated) {
    console.warn(`[NP] rejectWithdrawal: concurrent update blocked for externalId=${externalId}`);
    return false;
  }

  // Refund user balance atomically
  const amount = Number(withdrawal.amount);
  await db
    .update(profiles)
    .set({
      balance: sql`${profiles.balance} + ${amount}`,
      earningsBalance: sql`${profiles.earningsBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, withdrawal.userId));

  console.log(`[NP] ❌ Withdrawal rejected + ${amount} refunded to user ${withdrawal.userId} — externalId=${externalId}`);
  return true;
}

// ---- Payout JWT ----
async function getPayoutToken(): Promise<string> {
  const email = getPayoutEmail();
  const password = getPayoutPassword();
  if (!email || !password) {
    throw new Error("NOWPAYMENTS_EMAIL and NOWPAYMENTS_PASSWORD are required for payouts");
  }
  const res = await fetch(`${NP_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NowPayments auth failed (${res.status}): ${errText}`);
  }
  const data = (await res.json()) as { token: string };
  if (!data.token) throw new Error("NowPayments auth: no token returned");
  return data.token;
}

// ============================================================
// ROUTES
// ============================================================

// GET /nowpayments/ping
router.get("/nowpayments/ping", async (_req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.json({ ok: false, reason: "NOWPAYMENTS_API_KEY not set" });
  try {
    const r = await fetch(`${NP_API}/status`, { headers: { "x-api-key": apiKey } });
    const data = await r.json() as { message?: string };
    return res.json({ ok: r.ok, message: data.message ?? null });
  } catch (err) {
    return res.json({ ok: false, reason: String(err) });
  }
});

// GET /nowpayments/diagnostic — Full system diagnostic for production debugging (no auth required)
router.get("/nowpayments/diagnostic", async (_req, res) => {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NOWPAYMENTS_API_KEY: !!process.env["NOWPAYMENTS_API_KEY"] ? "✅ set" : "❌ MISSING",
      NOWPAYMENTS_IPN_SECRET: !!process.env["NOWPAYMENTS_IPN_SECRET"] ? "✅ set" : "⚠️ not set",
      NOWPAYMENTS_PASSWORD: !!process.env["NOWPAYMENTS_PASSWORD"] ? "✅ set" : "⚠️ not set",
      SUPABASE_DATABASE_URL: !!process.env["SUPABASE_DATABASE_URL"] ? "✅ set" : "❌ MISSING",
      DATABASE_URL: !!process.env["DATABASE_URL"] ? "✅ set" : "not set",
      NODE_ENV: process.env["NODE_ENV"] ?? "not set",
    },
    db: { ok: false, error: null as string | null, tablesFound: [] as string[] },
    nowpayments: { ok: false, error: null as string | null },
  };

  // Test DB connectivity
  try {
    const rows = await db.select({ id: recharges.id }).from(recharges).limit(1);
    result.db.ok = true;
    result.db.tablesFound.push("recharges ✅");
  } catch (err: any) {
    result.db.error = err?.message ?? String(err);
  }

  // Test NowPayments API key
  const apiKey = getApiKey();
  if (!apiKey) {
    result.nowpayments.error = "NOWPAYMENTS_API_KEY not configured";
  } else {
    try {
      const r = await fetch(`${NP_API}/status`, { headers: { "x-api-key": apiKey } });
      const data = await r.json() as { message?: string };
      result.nowpayments.ok = r.ok;
      result.nowpayments.message = data.message ?? null;
      if (!r.ok) result.nowpayments.error = `API returned ${r.status}`;
    } catch (err: any) {
      result.nowpayments.error = err?.message ?? String(err);
    }
  }

  return res.json(result);
});

// GET /nowpayments/currencies
router.get("/nowpayments/currencies", async (_req, res) => {
  if (currenciesCache && Date.now() - currenciesCache.ts < 600_000) {
    return res.json({ currencies: currenciesCache.data });
  }

  const apiKey = getApiKey();
  if (!apiKey) return res.json({ currencies: FALLBACK_CURRENCIES });

  try {
    const [fullRes, merchantRes] = await Promise.all([
      fetch(`${NP_API}/full-currencies`, { headers: { "x-api-key": apiKey } }),
      fetch(`${NP_API}/merchant/coins`,  { headers: { "x-api-key": apiKey } }),
    ]);

    const merchantData = merchantRes.ok
      ? ((await merchantRes.json()) as { selectedCurrencies?: string[] })
      : null;
    const enabledCodes = merchantData?.selectedCurrencies?.map((s) => s.toLowerCase()) ?? [];

    let currencies: CurrencyItem[] = [];

    if (fullRes.ok) {
      const fullBody = await fullRes.json() as { currencies?: (Record<string, unknown> | string)[] };
      if (Array.isArray(fullBody.currencies) && fullBody.currencies.length > 0) {
        const first = fullBody.currencies[0];
        if (typeof first === "string") {
          currencies = (fullBody.currencies as string[]).map((code) => ({
            code: code.toLowerCase(), name: code.toUpperCase(), logo: "",
          }));
        } else {
          currencies = (fullBody.currencies as Record<string, unknown>[]).map((c) => ({
            code: String(c["code"] ?? c["id"] ?? "").toLowerCase(),
            name: String(c["name"] ?? c["code"] ?? ""),
            logo: String(c["logo_url"] ?? c["logo"] ?? c["image"] ?? ""),
          })).filter((c) => c.code.length > 0);
        }
      }
    }

    if (currencies.length === 0) {
      const simpleRes = await fetch(`${NP_API}/currencies`, { headers: { "x-api-key": apiKey } });
      if (simpleRes.ok) {
        const simpleBody = await simpleRes.json() as { currencies?: string[] };
        if (Array.isArray(simpleBody.currencies)) {
          currencies = simpleBody.currencies.map((code: string) => ({
            code: code.toLowerCase(), name: code.toUpperCase(), logo: "",
          }));
        }
      }
    }

    if (currencies.length === 0) return res.json({ currencies: FALLBACK_CURRENCIES });

    const result = enabledCodes.length > 0
      ? currencies.filter((c) => enabledCodes.includes(c.code))
      : currencies;

    const final = result.length > 0 ? result : currencies;
    currenciesCache = { data: final, ts: Date.now() };
    return res.json({ currencies: final });

  } catch (err) {
    console.error("[NP] currencies error:", err);
    return res.json({ currencies: FALLBACK_CURRENCIES });
  }
});

// GET /nowpayments/estimate
router.get("/nowpayments/estimate", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });
  const { amount, currency_from = "usd", currency_to } = req.query as Record<string, string>;
  if (!amount || !currency_to) return res.status(400).json({ error: "amount and currency_to are required" });
  try {
    const url = `${NP_API}/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`;
    const r = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!r.ok) return res.status(502).json({ error: "NowPayments estimate failed" });
    return res.json(await r.json());
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /nowpayments/min-amount
router.get("/nowpayments/min-amount", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });
  const { currency_from = "usd", currency_to } = req.query as Record<string, string>;
  if (!currency_to) return res.status(400).json({ error: "currency_to is required" });
  try {
    const url = `${NP_API}/min-amount?currency_from=${currency_from}&currency_to=${currency_to}`;
    const r = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!r.ok) return res.status(502).json({ error: "NowPayments min-amount failed" });
    return res.json(await r.json());
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /nowpayments/create — Create a crypto deposit payment
router.post("/nowpayments/create", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Payment gateway not configured. Please contact support." });

  const { amount, currency, rechargeId } = req.body as {
    amount?: number; currency?: string; rechargeId?: string;
  };

  if (!amount || !currency || !rechargeId) {
    return res.status(400).json({ error: "amount, currency and rechargeId are required" });
  }

  // Guard: ensure recharge exists and is still pending before creating NowPayments payment
  const [existingRecharge] = await db
    .select({ id: recharges.id, status: recharges.status, transactionRef: recharges.transactionRef })
    .from(recharges)
    .where(eq(recharges.id, rechargeId))
    .limit(1);

  if (!existingRecharge) return res.status(404).json({ error: "Recharge not found" });
  if (existingRecharge.status !== "pending") {
    return res.status(400).json({ error: `Recharge already ${existingRecharge.status}` });
  }
  // If already has a payment_id — return error to avoid duplicate NowPayments payment
  if (existingRecharge.transactionRef) {
    return res.status(400).json({ error: "Payment already created for this recharge" });
  }

  try {
    const webhookUrl = getWebhookUrl("webhook");
    const payCurrency = currency.toLowerCase();

    const body: Record<string, unknown> = {
      price_amount:        amount,
      price_currency:      "usd",
      pay_currency:        payCurrency,
      order_id:            rechargeId,
      order_description:   "GE Energy deposit",
      is_fee_paid_by_user: false,
    };
    if (webhookUrl) body["ipn_callback_url"] = webhookUrl;

    console.log(`[NP] Creating payment: ${amount} USD → ${currency} | rechargeId=${rechargeId}`);

    const r = await fetch(`${NP_API}/payment`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error(`[NP] create payment error (${r.status}):`, errText);
      return res.status(502).json({ error: "Payment gateway error. Please try again." });
    }

    const data = (await r.json()) as {
      payment_id: string | number;
      payment_status: string;
      pay_address: string;
      pay_amount: number;
      pay_currency: string;
      price_amount: number;
      expiration_estimate_date?: string;
      network?: string;
    };

    // Store payment_id in local DB
    await db
      .update(recharges)
      .set({ transactionRef: String(data.payment_id), updatedAt: new Date() })
      .where(eq(recharges.id, rechargeId));

    console.log(`[NP] Payment created: id=${data.payment_id} addr=${data.pay_address?.slice(0, 10)}...`);

    return res.json({
      paymentId:      String(data.payment_id),
      payAddress:     data.pay_address,
      payAmount:      data.pay_amount,
      payCurrency:    data.pay_currency,
      status:         data.payment_status,
      network:        data.network ?? null,
      expirationDate: data.expiration_estimate_date ?? null,
    });
  } catch (err) {
    console.error("[NP] create payment exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /nowpayments/status/:paymentId — Poll deposit status + auto-approve on finish
router.get("/nowpayments/status/:paymentId", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });

  const { paymentId } = req.params;
  try {
    const r = await fetch(`${NP_API}/payment/${paymentId}`, { headers: { "x-api-key": apiKey } });
    if (!r.ok) {
      console.error(`[NP] status error (${r.status}):`, await r.text());
      return res.status(502).json({ error: "NowPayments API error" });
    }

    const data = (await r.json()) as {
      payment_id: string | number;
      payment_status: string;
      actually_paid?: number;
      pay_amount?: number;
      pay_currency?: string;
    };

    const status = data.payment_status;

    // Auto-approve on finished/confirmed — idempotent, safe to call multiple times
    if (status === "finished" || status === "confirmed") {
      try {
        await approveRechargeByPaymentId(String(paymentId));
      } catch (dbErr) {
        console.error("[NP] approveRecharge error:", dbErr);
      }
    }

    return res.json({
      status,
      actuallyPaid: data.actually_paid ?? null,
      payAmount:    data.pay_amount ?? null,
      payCurrency:  data.pay_currency ?? null,
    });
  } catch (err) {
    console.error("[NP] status exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /nowpayments/webhook — IPN for incoming deposits (HMAC-SHA512 verified)
router.post("/nowpayments/webhook", async (req, res) => {
  const ipnSecret = getIpnSecret();
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;

  if (ipnSecret) {
    if (!sig) {
      console.warn("[NP] Deposit IPN: missing signature header");
      return res.status(401).json({ error: "Missing signature" });
    }
    if (!verifyNpSignature(ipnSecret, req.body, sig)) {
      console.warn("[NP] Deposit IPN: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body as {
    payment_id?: string | number;
    payment_status?: string;
    order_id?: string;
    actually_paid?: number;
    pay_amount?: number;
  };
  const status = payload.payment_status ?? "";
  const paymentId = String(payload.payment_id ?? "");

  console.log(`[NP IPN deposit] status=${status} payment_id=${paymentId} order_id=${payload.order_id}`);

  // Idempotent — approveRechargeByPaymentId will no-op if already approved
  if (status === "finished" || status === "confirmed") {
    try {
      const approved = await approveRechargeByPaymentId(paymentId);
      console.log(`[NP IPN deposit] approved=${approved} for payment_id=${paymentId}`);
    } catch (err) {
      console.error("[NP] webhook approveRecharge error:", err);
      // Still return 200 so NowPayments doesn't retry indefinitely
    }
  }

  return res.status(200).json({ ok: true });
});

// POST /nowpayments/payout — Automatic withdrawal via NowPayments Payouts API
router.post("/nowpayments/payout", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "NowPayments not configured" });

  const { withdrawalId } = req.body as { withdrawalId?: string };
  if (!withdrawalId) return res.status(400).json({ error: "withdrawalId is required" });

  try {
    const [withdrawal] = await db
      .select({
        id: withdrawals.id,
        status: withdrawals.status,
        phone: withdrawals.phone,
        countryCode: withdrawals.countryCode,
        netAmount: withdrawals.netAmount,
      })
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if (withdrawal.status !== "pending") {
      return res.status(400).json({ error: `Withdrawal already ${withdrawal.status}` });
    }

    const address  = withdrawal.phone;
    const currency = (withdrawal.countryCode ?? "").toLowerCase();
    const amount   = Number(withdrawal.netAmount);

    if (!address)   return res.status(400).json({ error: "Missing wallet address" });
    if (!currency)  return res.status(400).json({ error: "Missing currency code" });
    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    console.log(`[NP] Creating payout: ${amount} ${currency} → ${address.slice(0, 10)}... (id=${withdrawalId})`);

    const token = await getPayoutToken();
    const webhookUrl = getWebhookUrl("payout-webhook");

    const payoutBody: Record<string, unknown> = {
      withdrawals: [
        {
          address,
          currency,
          amount,
          unique_external_id: withdrawalId,
          payout_description: "GE Energy withdrawal",
        },
      ],
    };
    if (webhookUrl) payoutBody["ipn_callback_url"] = webhookUrl;

    const r = await fetch(`${NP_API}/payout`, {
      method: "POST",
      headers: {
        "x-api-key":     apiKey,
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payoutBody),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error(`[NP] payout error (${r.status}):`, errText);
      return res.status(502).json({ error: errText });
    }

    const data = (await r.json()) as { id?: string; batch_withdrawal_id?: string };
    const payoutId = data.id ?? data.batch_withdrawal_id ?? "unknown";

    // Set to processing — balance already deducted at submission time
    await db
      .update(withdrawals)
      .set({
        status: "processing",
        adminNote: `🚀 NowPayments payout submitted — batch ID: ${payoutId}`,
        updatedAt: new Date(),
      })
      .where(and(eq(withdrawals.id, withdrawalId), eq(withdrawals.status, "pending")));

    console.log(`[NP] Payout submitted: batchId=${payoutId}`);
    return res.json({ success: true, payoutId });

  } catch (err) {
    console.error("[NP] payout exception:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /nowpayments/payout/:payoutId — Get payout batch status
router.get("/nowpayments/payout/:payoutId", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(503).json({ error: "Not configured" });
  try {
    const token = await getPayoutToken();
    const r = await fetch(`${NP_API}/payout/${req.params.payoutId}`, {
      headers: { "x-api-key": apiKey, "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    return res.json(await r.json());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /nowpayments/payout-webhook — IPN for outgoing payouts (HMAC-SHA512 verified)
router.post("/nowpayments/payout-webhook", async (req, res) => {
  const ipnSecret = getIpnSecret();
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;

  if (ipnSecret) {
    if (!sig) {
      console.warn("[NP] Payout IPN: missing signature header");
      return res.status(401).json({ error: "Missing signature" });
    }
    if (!verifyNpSignature(ipnSecret, req.body, sig)) {
      console.warn("[NP] Payout IPN: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  type PayoutItem = { id?: string; status?: string; unique_external_id?: string };
  type PayoutWebhookPayload = {
    id?: string; batch_withdrawal_id?: string;
    status?: string; withdrawals?: PayoutItem[];
  };

  const payload = req.body as PayoutWebhookPayload;
  const batchStatus = (payload.status ?? "").toUpperCase();
  console.log(`[NP IPN payout] batchId=${payload.id ?? payload.batch_withdrawal_id} status=${batchStatus}`);

  const SUCCESS_STATUSES = new Set(["FINISHED", "COMPLETE", "COMPLETED", "DONE", "CONFIRMED"]);
  const FAILURE_STATUSES = new Set(["REJECTED", "FAILED", "ERROR", "CANCELLED", "CANCELED"]);

  const items: PayoutItem[] = payload.withdrawals ?? [];
  for (const item of items) {
    const extId = item.unique_external_id;
    const st = (item.status ?? "").toUpperCase();
    console.log(`  [NP IPN payout item] extId=${extId} status=${st}`);
    if (!extId) continue;

    if (SUCCESS_STATUSES.has(st)) {
      try {
        const approved = await approveWithdrawalByExternalId(extId);
        console.log(`  [NP IPN payout item] approved=${approved} for extId=${extId}`);
      } catch (err) {
        console.error("[NP] payout-webhook approveWithdrawal error:", err);
      }
    } else if (FAILURE_STATUSES.has(st)) {
      // IMPORTANT: refund the user's balance when NowPayments rejects/fails the payout
      try {
        const rejected = await rejectWithdrawalByExternalId(extId, st);
        console.log(`  [NP IPN payout item] rejected+refunded=${rejected} for extId=${extId}`);
      } catch (err) {
        console.error("[NP] payout-webhook rejectWithdrawal error:", err);
      }
    }
  }

  if (items.length === 0 && (batchStatus === "FINISHED" || batchStatus === "COMPLETE")) {
    console.warn("[NP IPN payout] No withdrawal items in payload — cannot map to local withdrawal ID");
  }

  return res.status(200).json({ ok: true });
});

export default router;
