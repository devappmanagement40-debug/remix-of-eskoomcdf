import { Router } from "express";
import { db, pool } from "@workspace/db";
import { userSessions, profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, attachUser } from "../middlewares/requireAuth";

const router = Router();

const TABLE_ALLOWLIST: Record<string, string> = {
  profiles: "profiles",
  banners: "banners",
  products: "products",
  product_series: "product_series",
  user_products: "user_products",
  site_settings: "site_settings",
  popup_messages: "popup_messages",
  payment_methods: "payment_methods",
  withdrawal_methods: "withdrawal_methods",
  countries: "countries",
  recharges: "recharges",
  withdrawals: "withdrawals",
  user_wallets: "user_wallets",
  withdrawal_fee_payments: "withdrawal_fee_payments",
  info_items: "info_items",
  faq_items: "faq_items",
  social_links: "social_links",
  official_documents: "official_documents",
  gift_codes: "gift_codes",
  gift_code_uses: "gift_code_uses",
  gift_rewards: "gift_rewards",
  point_exchanges: "point_exchanges",
  wheel_prizes: "wheel_prizes",
  wheel_spins: "wheel_spins",
  chat_messages: "chat_messages",
  vip_conditions: "vip_conditions",
  vip_history: "vip_history",
  admin_logs: "admin_logs",
  admin_permissions: "admin_permissions",
  user_roles: "user_roles",
  payment_api_configs: "payment_api_configs",
  payment_logs: "payment_logs",
  referral_commissions: "referral_commissions",
};

const CAMEL_TO_SNAKE: Record<string, string> = {
  userId: "user_id",
  isActive: "is_active",
  isFeatured: "is_featured",
  isNew: "is_new",
  createdAt: "created_at",
  updatedAt: "updated_at",
  sortOrder: "sort_order",
  fullName: "full_name",
  countryCode: "country_code",
  referralCode: "referral_code",
  referredBy: "referred_by",
  depositBalance: "deposit_balance",
  earningsBalance: "earnings_balance",
  referralBalance: "referral_balance",
  giftPoints: "gift_points",
  spinsBalance: "spins_balance",
  vipLevel: "vip_level",
  isSuspended: "is_suspended",
  prizeType: "prize_type",
  prizeValue: "prize_value",
  prizeLabel: "prize_label",
  prizeId: "prize_id",
  triggerKey: "trigger_key",
  buttonConfirm: "button_confirm",
  buttonCancel: "button_cancel",
  pointsValue: "points_value",
  maxUses: "max_uses",
  usedCount: "used_count",
  expiresAt: "expires_at",
  linkPath: "link_path",
  imageUrl: "image_url",
  logoUrl: "logo_url",
  fileUrl: "file_url",
  holderName: "holder_name",
  levelName: "level_name",
  conditionLogic: "condition_logic",
  minInvestment: "min_investment",
  minPurchases: "min_purchases",
  minProductsBought: "min_products_bought",
  minActiveMembers: "min_active_members",
  minTeamInvestment: "min_team_investment",
  productId: "product_id",
  seriesId: "series_id",
  returnPercent: "return_percent",
  dailyRevenue: "daily_revenue",
  totalRevenue: "total_revenue",
  maxPurchases: "max_purchases",
  stockStatus: "stock_status",
  gainType: "gain_type",
  totalCollected: "total_collected",
  lastCollectedAt: "last_collected_at",
  purchasedAt: "purchased_at",
  networkCode: "network_code",
  paymentType: "payment_type",
  apiProvider: "api_provider",
  apiEnabled: "api_enabled",
  validationEnabled: "validation_enabled",
  phoneDigits: "phone_digits",
  feeAmount: "fee_amount",
  netAmount: "net_amount",
  processingFeeAmount: "processing_fee_amount",
  processingFeePaid: "processing_fee_paid",
  processingFeeProofUrl: "processing_fee_proof_url",
  proofImageUrl: "proof_image_url",
  transactionRef: "transaction_ref",
  paymentMethod: "payment_method",
  adminNote: "admin_note",
  walletId: "wallet_id",
  capitalAmount: "capital_amount",
  proofUrl: "proof_url",
  codeId: "code_id",
  pointsAwarded: "points_awarded",
  pointsRequired: "points_required",
  moneyValue: "money_value",
  rewardId: "reward_id",
  rewardName: "reward_name",
  pointsSpent: "points_spent",
  moneyCredited: "money_credited",
  isWinnable: "is_winnable",
  isAi: "is_ai",
  docType: "doc_type",
  changedBy: "changed_by",
  oldLevel: "old_level",
  newLevel: "new_level",
  grantedBy: "granted_by",
  targetType: "target_type",
  targetId: "target_id",
  adminId: "admin_id",
  beneficiaryId: "beneficiary_id",
  buyerId: "buyer_id",
  commissionAmount: "commission_amount",
  commissionRate: "commission_rate",
  productPrice: "product_price",
  apiConfigId: "api_config_id",
  apiKey: "api_key",
  secretKey: "secret_key",
  endpointUrl: "endpoint_url",
  callbackUrl: "callback_url",
  countryId: "country_id",
  paymentMethodId: "payment_method_id",
  providerRef: "provider_ref",
  providerResponse: "provider_response",
  errorMessage: "error_message",
  statusCode: "status_code",
  statusResult: "status_result",
  omnipayId: "omnipay_id",
  withdrawalId: "withdrawal_id",
  rawPayload: "raw_payload",
  externalUrl: "external_url",
  minVipLevel: "min_vip_level",
  minPersonalInvestment: "min_personal_investment",
  color: "color",
};

function toSnake(col: string): string {
  return CAMEL_TO_SNAKE[col] ?? col;
}

// Tables readable without authentication (public config/catalog data)
const PUBLIC_READ_TABLES = new Set([
  "banners", "products", "product_series", "site_settings", "popup_messages",
  "payment_methods", "withdrawal_methods", "countries", "info_items", "faq_items",
  "social_links", "official_documents", "gift_codes", "gift_rewards",
  "wheel_prizes", "vip_conditions",
]);

// Tables that require admin role for any write operation
const ADMIN_ONLY_WRITE_TABLES = new Set([
  "admin_logs", "admin_permissions", "user_roles", "payment_api_configs",
  "banners", "products", "product_series", "site_settings", "popup_messages",
  "payment_methods", "withdrawal_methods", "countries", "info_items", "faq_items",
  "social_links", "official_documents", "gift_codes", "gift_rewards",
  "wheel_prizes", "vip_conditions",
]);

// Tables scoped to the authenticated user — reads auto-filtered to user_id for non-admins
const USER_SCOPED_TABLES = new Set([
  "user_products", "recharges", "withdrawals", "user_wallets",
  "withdrawal_fee_payments", "gift_code_uses", "point_exchanges",
  "wheel_spins", "vip_history", "referral_commissions", "payment_logs",
]);

// Tables that require admin role for reads (internal/admin data)
const ADMIN_READ_TABLES = new Set([
  "admin_logs", "admin_permissions", "user_roles", "payment_api_configs",
]);

function buildWhereClause(filters: string[], params: any[]): string[] {
  const conditions: string[] = [];
  for (const f of filters) {
    const [type, col, ...rest] = f.split(":");
    const val = rest.join(":");
    const colName = toSnake(col);
    if (!/^[a-z_][a-z0-9_]*$/.test(colName)) continue;
    if (type === "in") {
      const vals = val.split(",");
      const placeholders = vals.map((_, i) => `$${params.length + i + 1}`).join(", ");
      params.push(...vals);
      conditions.push(`"${colName}" IN (${placeholders})`);
    } else {
      params.push(val === "true" ? true : val === "false" ? false : val === "null" ? null : val);
      const idx = params.length;
      if (type === "eq") conditions.push(`"${colName}" = $${idx}`);
      else if (type === "neq") conditions.push(`"${colName}" != $${idx}`);
      else if (type === "gt") conditions.push(`"${colName}" > $${idx}`);
      else if (type === "gte") conditions.push(`"${colName}" >= $${idx}`);
      else if (type === "lt") conditions.push(`"${colName}" < $${idx}`);
      else if (type === "lte") conditions.push(`"${colName}" <= $${idx}`);
    }
  }
  return conditions;
}

router.get("/db", attachUser, async (req, res) => {
  try {
    const { table, select, filter, order, limit, count } = req.query as Record<string, string | string[]>;
    const tableName = TABLE_ALLOWLIST[String(table)];
    if (!tableName) return res.status(400).json({ error: "Unknown table" });

    const tableKey = String(table);
    const isAdmin = req.authUser?.role === "admin";

    // Require auth for non-public tables
    if (!PUBLIC_READ_TABLES.has(tableKey) && !req.authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Admin-only read tables require admin role
    if (ADMIN_READ_TABLES.has(tableKey) && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const rawFilters = Array.isArray(filter) ? filter : filter ? [filter] : [];
    const params: any[] = [];

    // Always use SELECT * to prevent SQL injection via column names
    let sql = `SELECT * FROM "${tableName}"`;

    const conditions = buildWhereClause(rawFilters, params);

    // For user-scoped tables: non-admin users can only read their own rows
    if (USER_SCOPED_TABLES.has(tableKey) && !isAdmin && req.authUser) {
      params.push(req.authUser.userId);
      conditions.push(`"user_id" = $${params.length}`);
    }

    // Handle count-only queries
    if (count === "exact") {
      let countSql = `SELECT COUNT(*) FROM "${tableName}"`;
      if (conditions.length) countSql += ` WHERE ${conditions.join(" AND ")}`;
      const { rows } = await pool.query(countSql, params);
      return res.json({ count: parseInt(rows[0].count) });
    }

    if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;

    if (order) {
      const [col, dir] = String(order).split(":");
      const colName = toSnake(col);
      if (/^[a-z_][a-z0-9_]*$/.test(colName)) {
        sql += ` ORDER BY "${colName}" ${dir === "desc" ? "DESC" : "ASC"}`;
      }
    }

    if (limit) {
      const lim = parseInt(String(limit));
      if (!isNaN(lim) && lim > 0) sql += ` LIMIT ${lim}`;
    }

    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Query failed" });
  }
});

router.post("/db", requireAuth, async (req, res) => {
  try {
    const { table, upsert } = req.query as Record<string, string>;
    const tableName = TABLE_ALLOWLIST[String(table)];
    if (!tableName) return res.status(400).json({ error: "Unknown table" });

    const isAdmin = req.authUser?.role === "admin";

    // Admin tables require admin role
    if (ADMIN_ONLY_WRITE_TABLES.has(String(table)) && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const row of rows) {
      // For non-admin writes, enforce that user_id matches the authenticated user
      if (!isAdmin && row.user_id && row.user_id !== req.authUser?.userId) {
        return res.status(403).json({ error: "Cannot write data for another user" });
      }

      const cols = Object.keys(row).map(k => toSnake(k)).filter(c => /^[a-z_][a-z0-9_]*$/.test(c));
      const origKeys = Object.keys(row);
      const vals = origKeys.map(k => row[k]);
      if (!cols.length) continue;

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colList = cols.map(c => `"${c}"`).join(", ");
      let sql = `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`;

      if (upsert === "true") {
        const idCol = cols.find(c => c === "id");
        if (idCol) sql += ` ON CONFLICT (id) DO UPDATE SET ${cols.filter(c => c !== "id").map((c) => `"${c}" = $${cols.indexOf(c) + 1}`).join(", ")}`;
      }

      sql += " RETURNING *";
      const { rows: inserted } = await pool.query(sql, vals);
      if (inserted[0]) results.push(inserted[0]);
    }

    return res.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Insert failed" });
  }
});

router.patch("/db", requireAuth, async (req, res) => {
  try {
    const { table, filter } = req.query as Record<string, string | string[]>;
    const tableName = TABLE_ALLOWLIST[String(table)];
    if (!tableName) return res.status(400).json({ error: "Unknown table" });

    const isAdmin = req.authUser?.role === "admin";
    if (ADMIN_ONLY_WRITE_TABLES.has(String(table)) && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const updates = req.body;
    const setCols = Object.keys(updates).map(k => toSnake(k)).filter(c => /^[a-z_][a-z0-9_]*$/.test(c));
    const origKeys = Object.keys(updates);
    const setVals = origKeys.map(k => updates[k]);

    if (!setCols.length) return res.status(400).json({ error: "No updates" });

    const params: any[] = [...setVals];
    const filters = Array.isArray(filter) ? filter : filter ? [String(filter)] : [];
    const conditions = buildWhereClause(filters, params);

    // For non-admin, only allow updates scoped to the authenticated user
    if (!isAdmin) {
      const hasUserFilter = filters.some(f => {
        const [, col, ...rest] = f.split(":");
        return toSnake(col) === "user_id" && rest.join(":") === req.authUser?.userId;
      });
      if (!hasUserFilter) {
        return res.status(403).json({ error: "Must filter by your own user_id" });
      }
    }

    let sql = `UPDATE "${tableName}" SET ${setCols.map((c, i) => `"${c}" = $${i + 1}`).join(", ")}`;
    if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;
    sql += " RETURNING *";

    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/db", requireAuth, async (req, res) => {
  try {
    const { table, filter } = req.query as Record<string, string | string[]>;
    const tableName = TABLE_ALLOWLIST[String(table)];
    if (!tableName) return res.status(400).json({ error: "Unknown table" });

    const isAdmin = req.authUser?.role === "admin";
    if (ADMIN_ONLY_WRITE_TABLES.has(String(table)) && !isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const filters = Array.isArray(filter) ? filter : filter ? [String(filter)] : [];
    const params: any[] = [];
    const conditions = buildWhereClause(filters, params);

    if (!conditions.length) return res.status(400).json({ error: "No filter provided" });

    // For non-admin, only allow deletes scoped to the authenticated user
    if (!isAdmin) {
      const hasUserFilter = filters.some(f => {
        const [, col, ...rest] = f.split(":");
        return toSnake(col) === "user_id" && rest.join(":") === req.authUser?.userId;
      });
      if (!hasUserFilter) {
        return res.status(403).json({ error: "Must filter by your own user_id" });
      }
    }

    const sql = `DELETE FROM "${tableName}" WHERE ${conditions.join(" AND ")} RETURNING *`;
    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

router.post("/rpc/:fn", async (req, res) => {
  const { fn } = req.params;
  const args = req.body ?? {};

  try {
    if (fn === "validate_referral_code") {
      const { rows } = await pool.query(
        `SELECT id FROM profiles WHERE referral_code = $1 LIMIT 1`,
        [args.code]
      );
      return res.json(rows[0]?.id ?? null);
    }

    if (fn === "has_role") {
      const { rows } = await pool.query(
        `SELECT role FROM user_roles WHERE user_id = $1 AND role = $2 LIMIT 1`,
        [args._user_id, args._role]
      );
      return res.json(rows.length > 0);
    }

    if (fn === "has_permission") {
      const { rows } = await pool.query(
        `SELECT id FROM admin_permissions WHERE user_id = $1 AND permission = $2 LIMIT 1`,
        [args._user_id, args._permission]
      );
      return res.json(rows.length > 0);
    }

    if (fn === "get_team_profile_ids") {
      const { rows: profileRows } = await pool.query(
        `SELECT id FROM profiles WHERE user_id = $1 LIMIT 1`,
        [args._user_id]
      );
      if (!profileRows.length) return res.json([]);
      const { rows } = await pool.query(
        `SELECT id FROM profiles WHERE referred_by = $1`,
        [profileRows[0].id]
      );
      return res.json(rows.map((r: any) => r.id));
    }

    if (fn === "get_recent_winners") {
      const limit = Math.min(args.lim ?? 10, 50);
      const { rows } = await pool.query(
        `SELECT ws.id, ws.created_at, ws.prize_label, ws.prize_type, ws.prize_value, ws.vip_level,
                CONCAT(SUBSTRING(p.phone, 1, 3), '****', RIGHT(p.phone, 2)) as masked_phone
         FROM wheel_spins ws
         JOIN profiles p ON p.user_id = ws.user_id
         WHERE ws.status = 'completed' AND ws.prize_value::numeric > 0
         ORDER BY ws.created_at DESC
         LIMIT $1`,
        [limit]
      );
      return res.json(rows);
    }

    return res.status(404).json({ error: "Unknown function" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "RPC failed" });
  }
});

router.post("/functions/:fn", async (req, res) => {
  const { fn } = req.params;
  const body = req.body ?? {};
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (fn === "collect-revenue") {
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Unauthorized" });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
    if (!profile) return res.status(401).json({ error: "Unauthorized" });

    const upId = body.user_product_id;
    if (!upId) return res.status(400).json({ error: "user_product_id required" });

    const { rows: upRows } = await pool.query(
      `SELECT up.*, p.daily_revenue, p.gain_type, p.cycles, p.total_revenue
       FROM user_products up JOIN products p ON p.id = up.product_id
       WHERE up.id = $1 AND up.user_id = $2 LIMIT 1`,
      [upId, profile.userId]
    );
    if (!upRows.length) return res.status(404).json({ error: "Not found" });
    const up = upRows[0];

    const now = new Date();
    const gainType = up.gain_type || "daily";
    let amount = 0;

    if (gainType === "blocked") {
      if (!up.purchased_at) return res.status(400).json({ error: "No purchase date" });
      const purchaseDate = new Date(up.purchased_at);
      const cycles = up.cycles || 365;
      const endDate = new Date(purchaseDate.getTime() + cycles * 24 * 60 * 60 * 1000);
      if (now < endDate) return res.status(400).json({ error: "Earnings still locked" });
      if (Number(up.total_collected) > 0) return res.status(400).json({ error: "Already collected" });
      amount = Number(up.total_revenue || 0);
    } else {
      const referenceTime = up.last_collected_at || up.purchased_at;
      if (referenceTime) {
        const hoursSince = (now.getTime() - new Date(referenceTime).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) return res.status(400).json({ error: "Not ready to collect yet" });
      }
      amount = Number(up.daily_revenue || 0);
    }

    await pool.query(
      `UPDATE user_products SET last_collected_at = $1, total_collected = total_collected + $2 WHERE id = $3`,
      [now.toISOString(), amount, upId]
    );
    await pool.query(
      `UPDATE profiles SET balance = balance + $1, earnings_balance = earnings_balance + $1, updated_at = $2 WHERE user_id = $3`,
      [amount, now.toISOString(), profile.userId]
    );

    return res.json({ ok: true, amount });
  }

  if (fn === "spin-wheel") {
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Unauthorized" });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.userId)).limit(1);
    if (!profile) return res.status(401).json({ error: "Unauthorized" });

    if ((profile.spinsBalance ?? 0) < 1) return res.status(400).json({ error: "No spins available" });

    const { rows: prizeRows } = await pool.query(
      `SELECT * FROM wheel_prizes WHERE is_active = true AND is_winnable = true ORDER BY sort_order`
    );
    if (!prizeRows.length) return res.status(400).json({ error: "No prizes configured" });

    const rand = Math.random();
    let cumulative = 0;
    let selected = prizeRows[prizeRows.length - 1];
    let winIndex = prizeRows.length - 1;
    for (let i = 0; i < prizeRows.length; i++) {
      cumulative += Number(prizeRows[i].probability ?? 0);
      if (rand <= cumulative) { selected = prizeRows[i]; winIndex = i; break; }
    }

    const newSpinsBalance = (profile.spinsBalance ?? 0) - 1;
    await pool.query(
      `INSERT INTO wheel_spins (id, user_id, prize_id, prize_label, prize_type, prize_value, vip_level, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'completed', now(), now())`,
      [profile.userId, selected.id, selected.label, selected.prize_type ?? 'cash', selected.value ?? 0, profile.vipLevel]
    );

    let cashUpdate = 0;
    if ((selected.prize_type ?? 'cash') === 'cash') cashUpdate = Number(selected.value ?? 0);

    await pool.query(
      `UPDATE profiles SET spins_balance = $1, balance = balance + $2, updated_at = now() WHERE user_id = $3`,
      [newSpinsBalance, cashUpdate, profile.userId]
    );

    return res.json({
      winIndex,
      prize: {
        id: selected.id,
        label: selected.label,
        value: Number(selected.value ?? 0),
        prize_type: selected.prize_type ?? 'cash',
        vip_level: selected.vip_level ?? null,
      },
      spins_left: newSpinsBalance,
    });
  }

  if (fn === "sarah-chat") {
    return res.json({ reply: "Thank you for contacting support. An agent will be with you shortly." });
  }

  if (fn === "process-payment") {
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Unauthorized" });

    const { recharge_id } = body;
    if (!recharge_id) return res.status(400).json({ error: "recharge_id required" });

    const { rows: rechargeRows } = await pool.query(
      `SELECT * FROM recharges WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [recharge_id, session.userId]
    );
    if (!rechargeRows.length) return res.status(404).json({ error: "Recharge not found" });
    const recharge = rechargeRows[0];

    if (recharge.status !== "pending") {
      return res.json({ success: false, error: "Recharge already processed" });
    }

    // Mark as processing so admin can review
    await pool.query(`UPDATE recharges SET status = 'processing', updated_at = now() WHERE id = $1`, [recharge_id]);
    return res.json({ success: true, pending: true, message: "Payment submitted for review" });
  }

  if (fn === "process-withdrawal") {
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const [session] = await db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Unauthorized" });

    // Admin only
    const { rows: roleRows } = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'moderator') LIMIT 1`,
      [session.userId]
    );
    if (!roleRows.length) return res.status(403).json({ error: "Admin only" });

    const { withdrawal_id } = body;
    if (!withdrawal_id) return res.status(400).json({ error: "withdrawal_id required" });

    const { rows: wRows } = await pool.query(
      `SELECT * FROM withdrawals WHERE id = $1 LIMIT 1`,
      [withdrawal_id]
    );
    if (!wRows.length) return res.status(404).json({ error: "Withdrawal not found" });
    const w = wRows[0];

    if (w.status !== "pending") {
      return res.json({ success: false, error: "Withdrawal already processed" });
    }

    // Approve: mark as paid
    await pool.query(`UPDATE withdrawals SET status = 'paid', updated_at = now() WHERE id = $1`, [withdrawal_id]);
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "Unknown function" });
});

export default router;
