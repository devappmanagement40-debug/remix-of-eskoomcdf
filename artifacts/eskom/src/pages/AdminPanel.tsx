import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminWheelTab from "@/components/AdminWheelTab";
import AdminTeamTab from "@/components/AdminTeamTab";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import {
  BarChart3, Users, Download, Upload, Package, CreditCard, Link2,
  MessageSquare, Bell, Settings, Shield, Search, CheckCircle2, XCircle,
  Clock, ArrowDown, Edit2, Trash2, Plus, X, Save, ChevronDown, ChevronUp,
  Layers, Eye, EyeOff, Ban, UserCheck, Pencil, TrendingUp, Activity,
  Globe, ImageIcon, UploadIcon, Bot, Power, ArrowLeft, Send, Star, Gift,
  HelpCircle, Info, Smartphone, Wallet, FileText, Loader2, Coins
} from "lucide-react";

// ==================== TYPES ====================
type Profile = {
  id: string; user_id: string; full_name: string | null; phone: string | null;
  balance: number | null; deposit_balance: number | null; earnings_balance: number | null;
  referral_balance: number | null; country_code: string | null; referral_code: string | null;
  is_suspended: boolean | null; created_at: string | null; vip_level: number | null;
  gift_points: number | null;
};
type Recharge = {
  id: string; phone: string; country_code: string; amount: number;
  transaction_ref: string | null; payment_method: string | null;
  proof_image_url: string | null;
  status: string; created_at: string | null; user_id: string;
};
type Withdrawal = {
  id: string; user_id: string; amount: number; fee_amount: number;
  net_amount: number; phone: string; country_code: string; network: string;
  status: string; created_at: string | null; wallet_id: string | null;
};
type Series = { id: string; name: string; color: string | null; sort_order: number | null; min_vip_level: number | null; min_personal_investment: number | null; min_team_investment: number | null; min_active_members: number | null };
type Product = {
  id: string; series_id: string | null; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  sort_order: number | null; max_purchases: number | null; stock_status: string;
};
type PaymentMethod = {
  id: string; name: string; country: string; phone: string | null;
  holder_name: string | null; instructions: string | null; is_active: boolean; sort_order: number;
  country_id: string | null; payment_type: string; external_url: string | null; logo_url: string | null;
};
type SocialLink = { id: string; key: string; label: string; url: string | null; is_active: boolean };
type SiteSetting = { id: string; key: string; value: string | null; category: string };
type PopupMsg = {
  id: string; trigger_key: string; title: string; message: string;
  button_confirm: string; button_cancel: string | null; tabs: any; is_active: boolean;
};
type AdminLog = { id: string; admin_id: string; action: string; target_type: string | null; details: string | null; created_at: string | null };
type Country = { id: string; name: string; country_code: string; is_active: boolean; sort_order: number; api_enabled: boolean };
type VipCondition = { id: string; level: number; level_name: string; min_investment: number; min_active_members: number; min_purchases: number; min_products_bought: number; min_team_investment: number; condition_logic: string; image_url: string | null };
type UserProduct = { id: string; user_id: string; product_id: string; purchased_at: string; is_active: boolean; expires_at: string | null };
type WithdrawalMethod = { id: string; name: string; country_id: string | null; is_active: boolean; sort_order: number; logo_url: string | null; payment_type: string; api_provider: string | null };
type ApiConfig = { id: string; name: string; provider: string; api_key: string | null; secret_key: string | null; endpoint_url: string | null; callback_url: string | null; mode: string; is_active: boolean; country_id: string | null; notes: string | null; created_at: string | null };
type PaymentLog = { id: string; user_id: string; api_config_id: string | null; payment_method_id: string | null; amount: number; phone: string; country_code: string; status: string; provider_ref: string | null; error_message: string | null; created_at: string | null };
// ==================== TABS CONFIG ====================
type Banner = { id: string; image_url: string; link_path: string; sort_order: number; is_active: boolean };

const tabs = [
  { key: "dashboard", icon: BarChart3, label: "Stats" },
  { key: "users", icon: Users, label: "Clients" },
  { key: "deposits", icon: Download, label: "Deposits" },
  { key: "withdrawals", icon: Upload, label: "Withdrawals" },
  { key: "products", icon: Package, label: "Products" },
  { key: "banners", icon: ImageIcon, label: "Banners" },
  { key: "annonces", icon: Bell, label: "Announcements" },
  { key: "wheel", icon: Activity, label: "Wheel" },
  { key: "rewards", icon: Star, label: "Rewards" },
  { key: "giftcodes", icon: Gift, label: "Codes" },
  { key: "countries", icon: Globe, label: "Countries" },
  { key: "payments", icon: CreditCard, label: "Deposit" },
  { key: "wmethods", icon: Wallet, label: "Withdrawal M." },
  { key: "apiconfigs", icon: Power, label: "APIs" },
  { key: "links", icon: Link2, label: "Links" },
  { key: "popups", icon: Bell, label: "Popups" },
  { key: "vip", icon: TrendingUp, label: "Levels" },
  { key: "sarah", icon: Bot, label: "Sarah AI" },
  { key: "officialdocs", icon: FileText, label: "Off. Docs" },
  { key: "officialinfo", icon: Globe, label: "Off. Info" },
  { key: "support", icon: MessageSquare, label: "Support" },
  { key: "faq", icon: HelpCircle, label: "FAQ" },
  { key: "infos", icon: Info, label: "Infos" },
  { key: "app", icon: Smartphone, label: "App" },
  { key: "dates", icon: Clock, label: "Dates" },
  { key: "devises", icon: Coins, label: "Devises" },
  { key: "settings", icon: Settings, label: "Site" },
  { key: "security", icon: Shield, label: "Security" },
  { key: "team", icon: Users, label: "Team" },
];

const colorOptions = [
  { value: "primary", label: "Turquoise", css: "bg-primary" },
  { value: "success", label: "Vert", css: "bg-success" },
  { value: "warning", label: "Jaune", css: "bg-warning" },
  { value: "destructive", label: "Rouge", css: "bg-destructive" },
  { value: "purple", label: "Violet", css: "bg-purple-500" },
  { value: "blue", label: "Bleu", css: "bg-blue-500" },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useActionPopup();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState("");
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [moderatorPerms, setModeratorPerms] = useState<string[]>([]);

  // Data states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [popups, setPopups] = useState<PopupMsg[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [vipConditions, setVipConditions] = useState<VipCondition[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const authHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const apiFetch = async (path: string) => {
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(path, { headers });
    if (!res.ok) return null;
    return res.json();
  };

  const checkAdmin = async () => {
    try {
      const token = getAuthToken();
      if (!token) { navigate("/connexion"); return; }
      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showError("Access denied", err.error || "Admin rights required");
        navigate("/");
        return;
      }
      const data = await res.json();
      setAdminId(data.userId);
      setIsFullAdmin(data.role === "admin");
      setModeratorPerms(data.role === "admin" ? ["all"] : (data.permissions || []));
      await loadAll();
    } catch (err) {
      console.error("Admin check error:", err);
      showError("Error", "Unable to verify access rights");
      setLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      const [allProfiles, r, w, s, pr, pm, sl, ss, pop, logs, ctrs, vipc, bn, wm, apic] = await Promise.all([
        apiFetch("/api/profiles"),
        apiFetch("/api/recharges"),
        apiFetch("/api/withdrawals"),
        apiFetch("/api/admin/product-series"),
        apiFetch("/api/admin/products"),
        apiFetch("/api/payment-methods"),
        apiFetch("/api/admin/social-links"),
        apiFetch("/api/site-settings"),
        apiFetch("/api/admin/banners"),
        apiFetch("/api/admin/logs"),
        apiFetch("/api/admin/countries"),
        apiFetch("/api/admin/vip-conditions"),
        apiFetch("/api/admin/banners"),
        apiFetch("/api/admin/withdrawal-methods"),
        apiFetch("/api/admin/payment-api-configs"),
      ]);

      const mapProfile = (p: any): Profile => ({
        id: p.id,
        user_id: p.userId,
        full_name: p.fullName,
        phone: p.phone,
        country_code: p.countryCode,
        balance: p.balance,
        deposit_balance: p.depositBalance,
        earnings_balance: p.earningsBalance,
        referral_balance: p.referralBalance,
        vip_level: p.vipLevel,
        gift_points: p.giftPoints,
        referral_code: p.referralCode,
        referred_by: p.referredBy,
        is_suspended: p.isSuspended,
        created_at: p.createdAt,
      });

      if (allProfiles) setProfiles((allProfiles as any[]).map(mapProfile));
      if (r) setRecharges(r);
      if (w) setWithdrawals(w);
      if (s) setSeries(s);
      if (pr) setProducts(pr as Product[]);
      if (pm) setPaymentMethods(pm as PaymentMethod[]);
      if (sl) setSocialLinks((sl as any[]).map((l: any) => ({ ...l, is_active: l.isActive ?? l.is_active ?? false })));
      if (ss) setSiteSettings(ss);
      if (pop) setPopups(pop as unknown as PopupMsg[]);
      if (logs) setAdminLogs(logs);
      if (ctrs) setCountries(ctrs as Country[]);
      if (vipc) setVipConditions(vipc as VipCondition[]);
      if (bn) setBanners(bn as Banner[]);
      if (wm) setWithdrawalMethods(wm as WithdrawalMethod[]);
      if (apic) setApiConfigs(apic as ApiConfig[]);
    } catch (err) {
      console.error("Load error:", err);
      showError("Error", "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (action: string, target_type?: string, target_id?: string, details?: string) => {
    await fetch("/api/admin/logs", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ action, targetType: target_type, targetId: target_id, details }),
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-foreground font-medium">Loading...</p>
    </div>
  );

  // Permission-based tab filtering for moderators
  const permToTabs: Record<string, string[]> = {
    manage_deposits: ["deposits"],
    manage_withdrawals: ["withdrawals"],
    manage_users: ["users"],
    manage_products: ["products"],
  };

  const visibleTabs = isFullAdmin
    ? tabs
    : tabs.filter(t => {
        // Always show dashboard
        if (t.key === "dashboard") return true;
        // Check if any permission grants access to this tab
        return moderatorPerms.some(perm => permToTabs[perm]?.includes(t.key));
      });

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Administration" showBack />

      {/* Tab icons grid - like reference */}
      <div className="px-4 pt-4">
        <div className="bg-card rounded-xl border border-secondary p-3">
          <div className="grid grid-cols-5 gap-2">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                  activeTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <t.icon size={18} />
                <span className="text-[9px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {activeTab === "dashboard" && <DashboardTab profiles={profiles} recharges={recharges} withdrawals={withdrawals} products={products} />}
        {activeTab === "users" && <UsersTab profiles={profiles} products={products} reload={loadAll} showSuccess={showSuccess} showError={showError} logAction={logAction} />}
        {activeTab === "deposits" && <DepositsTab recharges={recharges} profiles={profiles} reload={loadAll} showSuccess={showSuccess} showError={showError} logAction={logAction} />}
        {activeTab === "withdrawals" && <WithdrawalsTab withdrawals={withdrawals} profiles={profiles} reload={loadAll} showSuccess={showSuccess} showError={showError} logAction={logAction} />}
        {activeTab === "products" && <ProductsTab series={series} products={products} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "banners" && <BannersTab banners={banners} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "countries" && <CountriesTab countries={countries} methods={paymentMethods} withdrawalMethods={withdrawalMethods} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "wheel" && <AdminWheelTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} logAction={logAction} adminId={adminId} />}
        {activeTab === "rewards" && <RewardsTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "giftcodes" && <GiftCodesTab showSuccess={showSuccess} showError={showError} />}
        {activeTab === "payments" && <PaymentsTab methods={paymentMethods} countries={countries} apiConfigs={apiConfigs} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "wmethods" && <WithdrawalMethodsTab methods={withdrawalMethods} countries={countries} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "apiconfigs" && <ApiConfigsTab configs={apiConfigs} countries={countries} paymentLogs={paymentLogs} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "links" && <LinksTab links={socialLinks} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "annonces" && <AnnoncesTab reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "popups" && <PopupsTab popups={popups} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "vip" && <VipTab conditions={vipConditions} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "sarah" && <SarahTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "officialinfo" && <OfficialInfoTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "officialdocs" && <OfficialDocsTab showSuccess={showSuccess} showError={showError} />}
        {activeTab === "support" && <SupportTab adminId={adminId} />}
        {activeTab === "faq" && <FaqTab showSuccess={showSuccess} showError={showError} />}
        {activeTab === "infos" && <InfoItemsTab showSuccess={showSuccess} showError={showError} />}
        {activeTab === "app" && <AppSettingsTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "dates" && <DatesTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "devises" && <DeviseTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "settings" && <SettingsTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "security" && <SecurityTab logs={adminLogs} settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "team" && <AdminTeamTab showSuccess={showSuccess} showError={showError} logAction={logAction} adminId={adminId} />}
      </div>
    </div>
  );
};

// ==================== DASHBOARD ====================
const DashboardTab = ({ profiles, recharges, withdrawals, products }: any) => {
  const totalUsers = profiles.length;
  const today = new Date().toDateString();
  const activeToday = profiles.filter((p: Profile) => p.created_at && new Date(p.created_at).toDateString() === today).length;
  const totalDeposits = recharges.filter((r: Recharge) => r.status === "approved").reduce((s: number, r: Recharge) => s + r.amount, 0);
  const totalWithdrawals = withdrawals.filter((w: Withdrawal) => w.status === "approved").reduce((s: number, w: Withdrawal) => s + w.amount, 0);
  const pendingDeposits = recharges.filter((r: Recharge) => r.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((w: Withdrawal) => w.status === "pending").length;
  const activeProducts = products.filter((p: Product) => p.is_active).length;
  const totalBalance = profiles.reduce((s: number, p: Profile) => s + (p.balance || 0), 0);

  const stats = [
    { label: "Users", value: totalUsers, color: "text-primary" },
    { label: "New today", value: activeToday, color: "text-primary" },
    { label: "Total deposits", value: `${totalDeposits.toLocaleString("en-US")}`, color: "text-success" },
    { label: "Total withdrawals", value: `${totalWithdrawals.toLocaleString("en-US")}`, color: "text-destructive" },
    { label: "Cumulative balances", value: `${totalBalance.toLocaleString("en-US")}`, color: "text-primary" },
    { label: "Active products", value: activeProducts, color: "text-primary" },
    { label: "Pending deposits", value: pendingDeposits, color: "text-warning" },
    { label: "Pending withdrawals", value: pendingWithdrawals, color: "text-warning" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-secondary p-4">
            <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            <p className={`text-base font-bold truncate mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== USERS ====================
const UsersTab = ({ profiles, products, reload, showSuccess, showError, logAction }: any) => {
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [editDepositBalance, setEditDepositBalance] = useState("");
  const [editEarningsBalance, setEditEarningsBalance] = useState("");
  const [editReferralBalance, setEditReferralBalance] = useState("");
  const [editName, setEditName] = useState("");
  const [editVipLevel, setEditVipLevel] = useState("0");
  const [editGiftPoints, setEditGiftPoints] = useState("0");
  const [detailUser, setDetailUser] = useState<Profile | null>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<{b: Profile[], c: Profile[], d: Profile[]}>({ b: [], c: [], d: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = profiles.filter((p: Profile) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s)) || (p.phone?.toLowerCase().includes(s)) || p.user_id.includes(s);
  });

  const authHdrs = (): HeadersInit => {
    const token = getAuthToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const saveUser = async () => {
    if (!editingUser) return;
    const res = await fetch(`/api/admin/users/${editingUser.user_id}`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({
        fullName: editName,
        balance: Number(editBalance) || 0,
        depositBalance: Number(editDepositBalance) || 0,
        earningsBalance: Number(editEarningsBalance) || 0,
        referralBalance: Number(editReferralBalance) || 0,
        vipLevel: Number(editVipLevel) || 0,
        giftPoints: Number(editGiftPoints) || 0,
      }),
    });
    if (!res.ok) { const e = await res.json(); showError("Error", e.error || "Failed"); return; }
    logAction("edit_user", "profile", editingUser.id, `Balance: ${editBalance}, Deposit: ${editDepositBalance}, Earnings: ${editEarningsBalance}, Referral: ${editReferralBalance}, VIP: ${editVipLevel}, ESK: ${editGiftPoints}, Name: ${editName}`);
    showSuccess("User updated", "Changes saved ✅");
    setEditingUser(null);
    reload();
  };

  const toggleSuspend = async (p: Profile) => {
    const newVal = !p.is_suspended;
    const res = await fetch(`/api/admin/users/${p.user_id}/suspend`, {
      method: "PATCH",
      headers: authHdrs(),
      body: JSON.stringify({ isSuspended: newVal }),
    });
    if (!res.ok) { const e = await res.json(); showError("Error", e.error || "Failed"); return; }
    logAction(newVal ? "suspend_user" : "unsuspend_user", "profile", p.id);
    showSuccess(newVal ? "Account suspended" : "Account reactivated", "");
    reload();
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`Permanently delete ${p.full_name || p.phone}?`)) return;
    const res = await fetch(`/api/admin/users/${p.user_id}`, { method: "DELETE", headers: authHdrs() });
    if (!res.ok) { const e = await res.json(); showError("Delete error", e.error || "Failed"); return; }
    logAction("delete_user", "profile", p.id, p.full_name || p.phone || "");
    showSuccess("Account deleted", "User has been permanently deleted");
    reload();
  };

  const loadUserDetail = async (p: Profile) => {
    setDetailUser(p);
    setLoadingDetail(true);
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const [upRes, profsRes] = await Promise.all([
      fetch(`/api/admin/user-products?userId=${p.user_id}`, { headers }),
      fetch(`/api/profiles`, { headers }),
    ]);
    const up = upRes.ok ? await upRes.json() : [];
    setUserProducts(up || []);

    const allProfs: Profile[] = profsRes.ok ? (await profsRes.json()).map((x: any) => ({
      id: x.id, user_id: x.userId, full_name: x.fullName, phone: x.phone,
      balance: x.balance, referral_code: x.referralCode, referred_by: x.referredBy,
      created_at: x.createdAt, vip_level: x.vipLevel,
    } as Profile)) : [];
    const levelB = allProfs.filter(m => m.referred_by === p.id);
    const bIds = levelB.map(m => m.id);
    const levelC = allProfs.filter(m => m.referred_by && bIds.includes(m.referred_by));
    const cIds = levelC.map(m => m.id);
    const levelD = allProfs.filter(m => m.referred_by && cIds.includes(m.referred_by));
    setTeamMembers({ b: levelB, c: levelC, d: levelD });
    setLoadingDetail(false);
  };

  const removeUserProduct = async (upId: string) => {
    await fetch(`/api/admin/user-products/${upId}`, { method: "DELETE", headers: authHdrs() });
    if (detailUser) loadUserDetail(detailUser);
    showSuccess("Product removed", "");
  };

  const addProductToUser = async (productId: string) => {
    if (!detailUser) return;
    await fetch("/api/admin/user-products", {
      method: "POST",
      headers: authHdrs(),
      body: JSON.stringify({ userId: detailUser.user_id, productId, isActive: true }),
    });
    loadUserDetail(detailUser);
    showSuccess("Product added", "");
  };

  // Detail view
  if (detailUser) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetailUser(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-card rounded-xl border border-secondary p-4">
          <p className="text-sm font-bold text-foreground">{detailUser.full_name || "No name"}</p>
          <p className="text-xs text-muted-foreground">{detailUser.country_code} {detailUser.phone}</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><p className="text-[10px] text-muted-foreground">Total balance</p><p className="text-xs font-bold text-primary">{(detailUser.balance || 0).toLocaleString("en-US")} USDT</p></div>
            <div><p className="text-[10px] text-muted-foreground">Level</p><p className="text-xs font-bold text-foreground">VIP{detailUser.vip_level || 0}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Deposit</p><p className="text-xs font-bold text-foreground">{(detailUser.deposit_balance || 0).toLocaleString("en-US")} USDT</p></div>
            <div><p className="text-[10px] text-muted-foreground">Earnings</p><p className="text-xs font-bold text-success">{(detailUser.earnings_balance || 0).toLocaleString("en-US")} USDT</p></div>
            <div><p className="text-[10px] text-muted-foreground">Referral</p><p className="text-xs font-bold text-primary">{(detailUser.referral_balance || 0).toLocaleString("en-US")} USDT</p></div>
            <div><p className="text-[10px] text-muted-foreground">ESK Points</p><p className="text-xs font-bold text-warning">{(detailUser.gift_points || 0).toLocaleString("en-US")} ESK</p></div>
            <div><p className="text-[10px] text-muted-foreground">Code</p><p className="text-xs font-semibold text-foreground">{detailUser.referral_code || "—"}</p></div>
          </div>
        </div>

        {loadingDetail ? <p className="text-xs text-muted-foreground text-center py-4">Loading...</p> : (
          <>
            {/* User Products */}
            <div className="bg-card rounded-xl border border-secondary p-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3">ACTIVE PRODUCTS ({userProducts.length})</h4>
              {userProducts.length === 0 ? <p className="text-xs text-muted-foreground">No products</p> :
                userProducts.map((up: any) => (
                  <div key={up.id} className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{up.products?.name || "Product"}</p>
                      <p className="text-[10px] text-muted-foreground">{Number(up.products?.price || 0).toLocaleString("en-US")} USDT • {up.products?.daily_revenue} USDT/day</p>
                    </div>
                    <button onClick={() => removeUserProduct(up.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                  </div>
                ))}
              {/* Add product */}
              <div className="mt-3">
                <select onChange={(e) => { if (e.target.value) addProductToUser(e.target.value); e.target.value = ""; }}
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-xs border border-secondary outline-none">
                  <option value="">+ Add a product...</option>
                  {products.filter((pr: Product) => pr.is_active).map((pr: Product) => (
                    <option key={pr.id} value={pr.id}>{pr.name} — {Number(pr.price).toLocaleString("en-US")} USDT</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-card rounded-xl border border-secondary p-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3">TEAM</h4>
              {[
                { label: "Level E (direct)", members: teamMembers.b },
                { label: "Level F", members: teamMembers.c },
                { label: "Level G", members: teamMembers.d },
              ].map(level => (
                <div key={level.label} className="mb-3">
                  <p className="text-xs font-semibold text-foreground mb-1">{level.label} ({level.members.length})</p>
                  {level.members.length === 0 ? <p className="text-[10px] text-muted-foreground ml-2">None</p> :
                    level.members.map((m: Profile) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 ml-2">
                        <p className="text-xs text-foreground">{m.full_name || m.phone || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{(m.balance || 0).toLocaleString("en-US")} USDT</p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, téléphone..."
          className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} utilisateur(s)</p>

      {editingUser && (
        <div className="bg-card rounded-xl border border-primary p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Edit user</h3>
            <button onClick={() => setEditingUser(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Total balance (USDT)</label>
            <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Solde dépôt (USDT)</label>
            <input type="number" value={editDepositBalance} onChange={e => setEditDepositBalance(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Solde gains (USDT)</label>
            <input type="number" value={editEarningsBalance} onChange={e => setEditEarningsBalance(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Solde parrainage (USDT)</label>
            <input type="number" value={editReferralBalance} onChange={e => setEditReferralBalance(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">VIP Level</label>
            <select value={editVipLevel} onChange={e => setEditVipLevel(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none">
              {[0,1,2,3,4,5].map(v => <option key={v} value={v}>VIP{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Points GE (Monnaie GE Energy)</label>
            <input type="number" value={editGiftPoints} onChange={e => setEditGiftPoints(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <button onClick={saveUser} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <Save size={14} /> Save
          </button>
        </div>
      )}

      {filtered.map((p: Profile) => (
        <div key={p.id} className={`bg-card rounded-xl border overflow-hidden ${p.is_suspended ? "border-destructive/50 opacity-70" : "border-secondary"}`}>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">{p.full_name || "No name"}</p>
                <p className="text-xs text-muted-foreground">{p.country_code} {p.phone}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">VIP{p.vip_level || 0}</span>
                {p.is_suspended && <span className="text-[9px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold">SUSPENDU</span>}
              </div>
            </div>
            <div className="border-t border-secondary my-2" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Solde</p>
                <p className="text-xs font-bold text-primary">{(p.balance || 0).toLocaleString("en-US")} USDT</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Code parrainage</p>
                <p className="text-xs font-semibold text-foreground">{p.referral_code || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Inscription</p>
                <p className="text-xs text-foreground">{p.created_at ? <p className="text-xs text-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { timeZone: "America/Port-au-Prince" }) : "—"}</p> : "—"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => loadUserDetail(p)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-secondary text-foreground font-semibold py-2 rounded-xl text-xs hover:bg-secondary transition-colors">
                <Eye size={12} /> Détails
              </button>
              <button onClick={() => { setEditingUser(p); setEditBalance(String(p.balance || 0)); setEditDepositBalance(String(p.deposit_balance || 0)); setEditEarningsBalance(String(p.earnings_balance || 0)); setEditReferralBalance(String(p.referral_balance || 0)); setEditName(p.full_name || ""); setEditVipLevel(String(p.vip_level || 0)); setEditGiftPoints(String(p.gift_points || 0)); }}
                className="flex-1 flex items-center justify-center gap-1.5 border border-primary text-primary font-semibold py-2 rounded-xl text-xs hover:bg-primary/10 transition-colors">
                <Edit2 size={12} /> Edit
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => toggleSuspend(p)}
                className={`flex-1 flex items-center justify-center gap-1.5 border font-semibold py-2 rounded-xl text-xs transition-colors ${
                  p.is_suspended ? "border-success text-success hover:bg-success/10" : "border-destructive text-destructive hover:bg-destructive/10"
                }`}>
                {p.is_suspended ? <><UserCheck size={12} /> Réactiver</> : <><Ban size={12} /> Suspendre</>}
              </button>
              <button onClick={() => deleteUser(p)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-destructive text-destructive font-semibold py-2 rounded-xl text-xs hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== DEPOSITS ====================
const DepositsTab = ({ recharges, profiles, reload, showSuccess, showError, logAction }: any) => {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const profileMap: Record<string, Profile> = {};
  profiles.forEach((p: Profile) => { profileMap[p.user_id] = p; });

  const counts = {
    pending: recharges.filter((r: Recharge) => r.status === "pending").length,
    approved: recharges.filter((r: Recharge) => r.status === "approved").length,
    rejected: recharges.filter((r: Recharge) => r.status === "rejected").length,
  };

  const filtered = recharges
    .filter((r: Recharge) => filter === "all" || r.status === filter)
    .filter((r: Recharge) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const p = profileMap[r.user_id];
      return r.phone.includes(s) || (p?.full_name?.toLowerCase().includes(s)) || (r.transaction_ref?.toLowerCase().includes(s));
    });

  const handleAction = async (r: Recharge, status: "approved" | "rejected") => {
    const token = getAuthToken();
    const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/recharges/${r.id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    logAction(`deposit_${status}`, "recharge", r.id, `${r.amount} USDT`);
    showSuccess(status === "approved" ? "Deposit approved ✅" : "Deposit rejected ❌", "");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "pending", label: "En attente", count: counts.pending, color: "text-warning", border: "border-warning" },
          { key: "approved", label: "Approuvés", count: counts.approved, color: "text-success", border: "border-success" },
          { key: "rejected", label: "Rejetés", count: counts.rejected, color: "text-destructive", border: "border-destructive" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 transition-colors ${filter === s.key ? s.border : "border-secondary"}`}>
            <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
      </div>

      {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">No deposits</p> :
        filtered.map((r: Recharge) => {
          const p = profileMap[r.user_id];
          return (
            <div key={r.id} className="bg-card rounded-xl border border-secondary px-4 pt-4 pb-3">
              <div className="flex items-start justify-between mb-2">
                <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p>
                <StatusBadge status={r.status} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <CreditCard size={12} /> {(r.payment_method || "Mobile Money").toUpperCase()}
              </div>
              <div className="border-t border-secondary my-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                <div><p className="text-[10px] text-muted-foreground">Client</p><p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Current balance</p><p className="text-xs font-semibold text-foreground">{p ? `${(p.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Client name</p><p className="text-xs font-semibold text-foreground">{p?.full_name || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Date</p><p className="text-xs font-semibold text-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
                {r.proof_image_url && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Payment proof:</p>
                    <button onClick={() => setZoomedImage(r.proof_image_url)} className="relative group cursor-pointer">
                      <img src={r.proof_image_url} alt="Payment proof" className="w-full max-w-[200px] h-24 object-cover rounded-lg border border-secondary" />
                      <div className="absolute inset-0 max-w-[200px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <Eye size={20} className="text-white" />
                      </div>
                    </button>
                  </div>
                )}
                {!r.proof_image_url && r.transaction_ref && (
                  <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Reference</p><p className="text-xs font-semibold text-foreground font-mono">{r.transaction_ref}</p></div>
                )}
              </div>
              {r.status === "pending" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10"><CheckCircle2 size={16} /> Approve</button>
                  <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10"><XCircle size={16} /> Reject</button>
                </div>
              )}
            </div>
          );
        })}

      {/* Image zoom modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
          <img src={zoomedImage} alt="Payment proof (enlarged)" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

// ==================== WITHDRAWALS ====================
const WithdrawalsTab = ({ withdrawals, profiles, reload, showSuccess, showError, logAction }: any) => {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [detailW, setDetailW] = useState<Withdrawal | null>(null);
  const profileMap: Record<string, Profile> = {};
  profiles.forEach((p: Profile) => { profileMap[p.user_id] = p; });

  useEffect(() => {
    const loadWallets = async () => {
      const walletIds = withdrawals.map((w: any) => w.wallet_id).filter(Boolean);
      if (walletIds.length === 0) return;
      const token = getAuthToken();
      const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch("/api/user-wallets/batch", { method: "POST", headers, body: JSON.stringify({ ids: walletIds }) });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        (data || []).forEach((w: any) => { map[w.id] = w; });
        setWallets(map);
      }
    };
    loadWallets();
  }, [withdrawals]);

  const counts = {
    pending: withdrawals.filter((w: Withdrawal) => w.status === "pending").length,
    approved: withdrawals.filter((w: Withdrawal) => w.status === "approved").length,
    rejected: withdrawals.filter((w: Withdrawal) => w.status === "rejected").length,
  };

  const filtered = withdrawals
    .filter((w: Withdrawal) => filter === "all" || w.status === filter)
    .filter((w: Withdrawal) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const p = profileMap[w.user_id];
      return w.phone.includes(s) || w.network.toLowerCase().includes(s) || (p?.full_name?.toLowerCase().includes(s));
    });

  const [autoPayingId, setAutoPayingId] = useState<string | null>(null);

  const handleAction = async (w: Withdrawal, status: "approved" | "rejected") => {
    const token = getAuthToken();
    const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (status === "approved") {
      setAutoPayingId(w.id);
      try {
        const res = await fetch(`/api/withdrawals/${w.id}/process`, { method: "POST", headers });
        const data = await res.json();
        if (!res.ok) {
          showError("Error", data?.error || "Withdrawal failed");
        } else {
          showSuccess("Withdrawal approved", "The withdrawal has been successfully approved ✅");
        }
      } catch {
        showError("Error", "Connection error");
      } finally {
        setAutoPayingId(null);
        reload();
      }
      return;
    }
    // Rejected = direct update (trigger refunds)
    await fetch(`/api/withdrawals/${w.id}/status`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    logAction(`withdrawal_${status}`, "withdrawal", w.id, `${w.amount} USDT`);
    showSuccess("Withdrawal rejected — amount refunded", "");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "pending", label: "En attente", count: counts.pending, color: "text-warning", border: "border-warning" },
          { key: "approved", label: "Approuvés", count: counts.approved, color: "text-success", border: "border-success" },
          { key: "rejected", label: "Rejetés", count: counts.rejected, color: "text-destructive", border: "border-destructive" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 transition-colors ${filter === s.key ? s.border : "border-secondary"}`}>
            <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
      </div>

      {/* Detail modal */}
      {detailW && (() => {
        const p = profileMap[detailW.user_id];
        const wallet = detailW.wallet_id ? wallets[detailW.wallet_id] : null;
        const feePercent = detailW.amount > 0 ? Math.round((detailW.fee_amount / detailW.amount) * 100) : 0;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetailW(null)}>
            <div className="bg-card rounded-2xl border border-secondary w-full max-w-md max-h-[80vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Détails du retrait</h3>
                <button onClick={() => setDetailW(null)}><X size={18} className="text-muted-foreground" /></button>
              </div>

              <div className="text-center py-3">
                <p className="text-2xl font-bold text-foreground">{detailW.amount.toLocaleString("en-US")} USDT</p>
                <p className="text-sm text-success font-semibold">Net: {detailW.net_amount.toLocaleString("en-US")} USDT <span className="text-muted-foreground text-xs">(-{feePercent}% fee)</span></p>
                <StatusBadge status={detailW.status} />
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-foreground mb-2">👤 User information</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-muted-foreground">Name</p><p className="text-xs font-semibold text-foreground">{p?.full_name || "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Account phone</p><p className="text-xs font-semibold text-foreground">{p?.country_code} {p?.phone}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Current balance</p><p className="text-xs font-semibold text-foreground">{p ? `${(p.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">VIP Level</p><p className="text-xs font-semibold text-foreground">VIP {p?.vip_level || 0}</p></div>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-foreground mb-2">💳 Withdrawal wallet</p>
                {wallet ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-[10px] text-muted-foreground">Network</p><p className="text-xs font-semibold text-primary">{wallet.network}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Country</p><p className="text-xs font-semibold text-foreground">{wallet.country_code}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Number</p><p className="text-xs font-semibold text-foreground">{wallet.phone}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Account holder</p><p className="text-xs font-semibold text-foreground">{wallet.holder_name || "—"}</p></div>
                    {wallet.label && <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Label</p><p className="text-xs font-semibold text-foreground">{wallet.label}</p></div>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-[10px] text-muted-foreground">Network</p><p className="text-xs font-semibold text-primary">{detailW.network}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Number</p><p className="text-xs font-semibold text-foreground">{detailW.country_code} {detailW.phone}</p></div>
                  </div>
                )}
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-foreground mb-2">📋 Transaction</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-muted-foreground">Gross amount</p><p className="text-xs font-semibold text-foreground">{detailW.amount.toLocaleString("en-US")} USDT</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Fee ({feePercent}%)</p><p className="text-xs font-semibold text-destructive">{detailW.fee_amount.toLocaleString("en-US")} USDT</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Net amount</p><p className="text-xs font-semibold text-success">{detailW.net_amount.toLocaleString("en-US")} USDT</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Date</p><p className="text-xs font-semibold text-foreground">{detailW.created_at ? new Date(detailW.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
                </div>
                <div><p className="text-[10px] text-muted-foreground">ID</p><p className="text-[10px] font-mono text-muted-foreground break-all">{detailW.id}</p></div>
              </div>

               {detailW.status === "pending" && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { handleAction(detailW, "approved"); setDetailW(null); }} disabled={autoPayingId === detailW.id} className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                    {autoPayingId === detailW.id ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><CheckCircle2 size={16} /> Approve</>}
                  </button>
                  <button onClick={() => { handleAction(detailW, "rejected"); setDetailW(null); }} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10"><XCircle size={16} /> Rejeter</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">No withdrawals</p> :
        filtered.map((w: Withdrawal) => {
          const p = profileMap[w.user_id];
          const wallet = w.wallet_id ? wallets[w.wallet_id] : null;
          const feePercent = w.amount > 0 ? Math.round((w.fee_amount / w.amount) * 100) : 0;
          return (
            <div key={w.id} className="bg-card rounded-xl border border-secondary px-4 pt-4 pb-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setDetailW(w)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg font-bold text-foreground">{w.amount.toLocaleString("en-US")} USDT</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ArrowDown size={12} className="text-success" />
                    <span className="text-sm font-semibold text-success">Net: {w.net_amount.toLocaleString("en-US")} USDT</span>
                    <span className="text-xs text-muted-foreground">(- {feePercent}%)</span>
                  </div>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <CreditCard size={12} /> {w.network.toUpperCase()}
              </div>
              <div className="border-t border-secondary my-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                <div><p className="text-[10px] text-muted-foreground">Client</p><p className="text-xs font-semibold text-foreground">{p?.full_name || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Solde actuel</p><p className="text-xs font-semibold text-foreground">{p ? `${(p.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Titulaire</p><p className="text-xs font-semibold text-foreground">{wallet?.holder_name || w.phone.startsWith("0x") ? (wallet?.holder_name || "—") : "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Tél. compte</p><p className="text-xs font-semibold text-foreground">{p?.country_code} {p?.phone}</p></div>
              </div>
              {/* Wallet address — most important info for admin to process payout */}
              <div className="mt-3 bg-secondary/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground mb-1">📤 Adresse de retrait ({w.network || "USDT BEP20"})</p>
                <p className="text-xs font-mono font-bold text-primary break-all">
                  {wallet?.phone || w.phone || "—"}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-right">Cliquer pour voir les détails →</p>
              {w.status === "pending" && (
                <div className="grid grid-cols-2 gap-3 mt-4" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleAction(w, "approved")} disabled={autoPayingId === w.id} className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                    {autoPayingId === w.id ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><CheckCircle2 size={16} /> Validate</>}
                  </button>
                  <button onClick={() => handleAction(w, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10"><XCircle size={16} /> Reject</button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

// ==================== STATUS BADGE ====================
const StatusBadge = ({ status }: { status: string }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
    status === "pending" ? "bg-warning/15 text-warning" : status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
  }`}>
    {status === "pending" ? <Clock size={12} /> : status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {status === "pending" ? "En attente" : status === "approved" ? "Approuvé" : "Rejeté"}
  </div>
);

// ==================== PRODUCTS (reuses existing logic) ====================
const ProductsTab = ({ series, products, reload, showSuccess, showError }: any) => {
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSeriesId, setFormSeriesId] = useState("");
  const [form, setForm] = useState({ name: "", image_url: "", return_percent: "", total_revenue: "", daily_revenue: "", cycles: "365", price: "", is_new: false, max_purchases: "", description: "" });
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesName, setSeriesName] = useState("");
  const [seriesColor, setSeriesColor] = useState("primary");
  const [seriesConditions, setSeriesConditions] = useState({ min_vip_level: "", min_personal_investment: "", min_team_investment: "", min_active_members: "" });
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openProductForm = (seriesId: string, p?: Product) => {
    setFormSeriesId(seriesId);
    if (p) {
      setEditingProduct(p);
      const imageUrl = (p as any).imageUrl ?? p.image_url ?? "";
      const returnPercent = (p as any).returnPercent ?? p.return_percent ?? 0;
      const totalRevenue = (p as any).totalRevenue ?? p.total_revenue ?? 0;
      const dailyRevenue = (p as any).dailyRevenue ?? p.daily_revenue ?? 0;
      const isNew = (p as any).isNew ?? p.is_new ?? false;
      const maxPurchases = (p as any).maxPurchases ?? p.max_purchases;
      setForm({ name: p.name, image_url: imageUrl, return_percent: String(returnPercent), total_revenue: String(totalRevenue), daily_revenue: String(dailyRevenue), cycles: String(p.cycles || 365), price: String(p.price || 0), is_new: isNew, max_purchases: maxPurchases ? String(maxPurchases) : "", description: (p as any).description || "" });
    } else {
      setEditingProduct(null);
      setForm({ name: "", image_url: "", return_percent: "", total_revenue: "", daily_revenue: "", cycles: "365", price: "", is_new: false, max_purchases: "", description: "" });
    }
    setShowForm(true);
    setShowSeriesForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "product-images");
      setForm({ ...form, image_url: url });
      showSuccess("Image uploadée ✅", "");
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Vérifiez votre connexion");
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { showError("Error", "Name required"); return; }
    const payload: any = {
      series_id: formSeriesId || null, name: form.name, image_url: form.image_url || null,
      return_percent: Number(form.return_percent) || 0, total_revenue: Number(form.total_revenue) || 0,
      daily_revenue: Number(form.daily_revenue) || 0, cycles: Number(form.cycles) || 365,
      price: Number(form.price) || 0, is_new: form.is_new,
      max_purchases: form.max_purchases ? Number(form.max_purchases) : null,
      description: form.description || null,
    };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editingProduct) await fetch(`/api/admin/products/${editingProduct.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/products", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: products.filter((p: Product) => ((p as any).seriesId ?? p.series_id) === formSeriesId).length }) });
    showSuccess(editingProduct ? "Product updated ✅" : "Product created ✅", "");
    setShowForm(false); reload();
  };

  const saveSeries = async () => {
    if (!seriesName.trim()) return;
    const payload: any = {
      name: seriesName, color: seriesColor,
      min_vip_level: Number(seriesConditions.min_vip_level) || 0,
      min_personal_investment: Number(seriesConditions.min_personal_investment) || 0,
      min_team_investment: Number(seriesConditions.min_team_investment) || 0,
      min_active_members: Number(seriesConditions.min_active_members) || 0,
    };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editingSeries) await fetch(`/api/admin/product-series/${editingSeries.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/product-series", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: series.length }) });
    showSuccess(editingSeries ? "Series updated ✅" : "Series created ✅", "");
    setShowSeriesForm(false); reload();
  };

  const setStockStatus = async (p: Product, status: "available" | "sold_out" | "terminated") => {
    try {
      const token = getAuthToken();
      const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ stock_status: status, is_active: true }) });
      if (!res.ok) throw new Error("Failed");
      showSuccess(
        "Updated",
        status === "available"
          ? "Product available ✅"
          : status === "sold_out"
          ? "Product marked as sold out"
          : "Product marked as ended"
      );
      reload();
    } catch (err) {
      console.error("setStockStatus error:", err);
      showError("Error", "Unable to change product status");
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={() => { setEditingSeries(null); setSeriesName(""); setSeriesColor("primary"); setSeriesConditions({ min_vip_level: "", min_personal_investment: "", min_team_investment: "", min_active_members: "" }); setShowSeriesForm(true); setShowForm(false); }}
        className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Layers size={16} /> Add a series
      </button>

      {showSeriesForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editingSeries ? "Edit series" : "New series"}</h3><button onClick={() => setShowSeriesForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="Name" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
          <div className="flex gap-2">{colorOptions.map(c => (<button key={c.value} onClick={() => setSeriesColor(c.value)} className={`w-8 h-8 rounded-full ${c.css} border-2 ${seriesColor === c.value ? "border-foreground scale-110" : "border-transparent"}`} />))}</div>
          <div className="border-t border-secondary pt-3 mt-2">
            <p className="text-xs font-bold text-foreground mb-2">Access conditions for this series</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground">VIP minimum</label>
                <input type="number" value={seriesConditions.min_vip_level} onChange={e => setSeriesConditions({ ...seriesConditions, min_vip_level: e.target.value })} placeholder="0"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Min personal invest. (USDT)</label>
                <input type="number" value={seriesConditions.min_personal_investment} onChange={e => setSeriesConditions({ ...seriesConditions, min_personal_investment: e.target.value })} placeholder="0"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Min team invest. (USDT)</label>
                <input type="number" value={seriesConditions.min_team_investment} onChange={e => setSeriesConditions({ ...seriesConditions, min_team_investment: e.target.value })} placeholder="0"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Min active members</label>
                <input type="number" value={seriesConditions.min_active_members} onChange={e => setSeriesConditions({ ...seriesConditions, min_active_members: e.target.value })} placeholder="0"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
            </div>
          </div>
          <button onClick={saveSeries} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editingSeries ? "Update" : "Create"}</button>
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editingProduct ? "Edit product" : "New product"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          {form.image_url ? (
            <div className="relative h-28 rounded-xl overflow-hidden border border-secondary">
              <img src={form.image_url} className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full h-20 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {uploading ? "Upload..." : <><UploadIcon size={16} /> Add image</>}
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Prix / Budget (USDT)</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Return (%)</label><input type="number" value={form.return_percent} onChange={e => setForm({ ...form, return_percent: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Total revenue</label><input type="number" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Daily revenue</label><input type="number" value={form.daily_revenue} onChange={e => setForm({ ...form, daily_revenue: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Cycles</label><input type="number" value={form.cycles} onChange={e => setForm({ ...form, cycles: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Max purchases</label><input type="number" value={form.max_purchases} onChange={e => setForm({ ...form, max_purchases: e.target.value })} placeholder="Unlimited" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <label className="flex items-center gap-2 self-end pb-1"><input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} className="accent-primary" /><span className="text-xs">New</span></label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Product description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed product information..." rows={3}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none mt-1" />
          </div>
          <button onClick={saveProduct} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editingProduct ? "Update" : "Create"}</button>
        </div>
      )}

      {series.map((s: Series) => {
        const sp = products.filter((p: Product) => ((p as any).seriesId ?? p.series_id) === s.id);
        const isExpanded = expandedSeries === s.id;
        const cc = colorOptions.find(c => c.value === s.color)?.css || "bg-primary";
        return (
          <div key={s.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={() => setExpandedSeries(isExpanded ? null : s.id)} className="flex items-center gap-3 flex-1">
                <div className={`w-4 h-4 rounded-full ${cc}`} />
                <span className="text-sm font-bold text-foreground">{s.name}</span>
                <span className="text-xs text-muted-foreground">({sp.length})</span>
                {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditingSeries(s); setSeriesName(s.name); setSeriesColor((s as any).color || "primary"); setSeriesConditions({ min_vip_level: String((s as any).minVipLevel ?? s.min_vip_level ?? 0), min_personal_investment: String((s as any).minPersonalInvestment ?? s.min_personal_investment ?? 0), min_team_investment: String((s as any).minTeamInvestment ?? s.min_team_investment ?? 0), min_active_members: String((s as any).minActiveMembers ?? s.min_active_members ?? 0) }); setShowSeriesForm(true); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/product-series/${s.id}`, { method: "DELETE", headers: h }); showSuccess("Deleted", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-secondary px-4 py-3 space-y-2">
                {sp.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No products</p> :
                  sp.map((p: Product) => {
                    const pIsActive = (p as any).isActive ?? p.is_active ?? true;
                    const pIsNew = (p as any).isNew ?? p.is_new ?? false;
                    const pStockStatus = (p as any).stockStatus ?? p.stock_status ?? "available";
                    const pReturnPercent = (p as any).returnPercent ?? p.return_percent;
                    return (
                    <div key={p.id} className={`py-2.5 px-3 rounded-lg ${pIsActive ? "bg-secondary/50" : "bg-secondary/20 opacity-60"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{p.name}</span>
                            {pIsNew && <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                            {pStockStatus === "sold_out" && <span className="text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-bold">SOLD OUT</span>}
                            {pStockStatus === "terminated" && <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">ENDED</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} USDT • {pReturnPercent}%</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !pIsActive }) }); reload(); }} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${pIsActive ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{pIsActive ? "ON" : "OFF"}</button>
                          <button onClick={() => openProductForm(s.id, p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                          <button onClick={async () => {
                            const t = getAuthToken();
                            const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
                            await fetch(`/api/admin/products/${p.id}`, { method: "DELETE", headers: h });
                            showSuccess("Product deleted/deactivated", "");
                            reload();
                          }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => setStockStatus(p, "available")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${pStockStatus === "available" ? "bg-success/20 text-success border border-success/30" : "bg-secondary text-muted-foreground"}`}
                        >
                          Available
                        </button>
                        <button
                          onClick={() => setStockStatus(p, "sold_out")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${pStockStatus === "sold_out" ? "bg-warning/20 text-warning border border-warning/30" : "bg-secondary text-muted-foreground"}`}
                        >
                          Sold out
                        </button>
                        <button
                          onClick={() => setStockStatus(p, "terminated")}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${pStockStatus === "terminated" ? "bg-destructive/20 text-destructive border border-destructive/30" : "bg-secondary text-muted-foreground"}`}
                        >
                          Ended
                        </button>
                      </div>
                    </div>
                  ); })}
                <button onClick={() => openProductForm(s.id)} className="w-full bg-secondary text-foreground font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"><Plus size={14} /> Add a product</button>
              </div>
            )}
          </div>
        );
      })}

      {(() => {
        const unassigned = products.filter((p: Product) => !((p as any).seriesId ?? p.series_id));
        if (unassigned.length === 0) return null;
        return (
          <div className="bg-card rounded-xl border border-secondary overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={() => setExpandedSeries(expandedSeries === "__unassigned__" ? null : "__unassigned__")} className="flex items-center gap-3 flex-1">
                <div className="w-4 h-4 rounded-full bg-muted-foreground/40" />
                <span className="text-sm font-bold text-foreground">Sans série</span>
                <span className="text-xs text-muted-foreground">({unassigned.length})</span>
                {expandedSeries === "__unassigned__" ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
            </div>
            {expandedSeries === "__unassigned__" && (
              <div className="border-t border-secondary px-4 py-3 space-y-2">
                {unassigned.map((p: Product) => {
                  const pIsActive = (p as any).isActive ?? p.is_active ?? true;
                  const pIsNew = (p as any).isNew ?? p.is_new ?? false;
                  const pStockStatus = (p as any).stockStatus ?? p.stock_status ?? "available";
                  const pReturnPercent = (p as any).returnPercent ?? p.return_percent;
                  return (
                    <div key={p.id} className={`py-2.5 px-3 rounded-lg ${pIsActive ? "bg-secondary/50" : "bg-secondary/20 opacity-60"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{p.name}</span>
                            {pIsNew && <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                            {pStockStatus === "sold_out" && <span className="text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-bold">SOLD OUT</span>}
                            {pStockStatus === "terminated" && <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">ENDED</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} USDT • {pReturnPercent ?? 0}%</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !pIsActive }) }); reload(); }} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${pIsActive ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{pIsActive ? "ON" : "OFF"}</button>
                          <button onClick={() => openProductForm("", p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                          <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/products/${p.id}`, { method: "DELETE", headers: h }); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

// ==================== UPLOAD HELPER ====================
const uploadFile = async (file: File, bucket: string = "site-assets"): Promise<string> => {
  if (file.size > 10 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 10 Mo)");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name, bucket }),
        });
        const data = await res.json();
        if (!res.ok) reject(new Error(data.error || "Upload échoué"));
        else resolve(data.url);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
};

// ==================== BANNERS ====================
const BannersTab = ({ banners, reload, showSuccess, showError }: any) => {
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [linkPath, setLinkPath] = useState("/");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      const token2 = getAuthToken();
      const h2: HeadersInit = { "Content-Type": "application/json", ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) };
      await fetch("/api/admin/banners", { method: "POST", headers: h2, body: JSON.stringify({ image_url: url, link_path: "/", sort_order: banners.length }) });
      showSuccess("Banner ajouté ✅", "");
      reload();
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const deleteBanner = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE", headers: h });
    showSuccess("Banner deleted", "");
    reload();
  };

  const toggleBanner = async (b: Banner) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/banners/${b.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !b.is_active }) });
    reload();
  };

  const updateLink = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/banners/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ link_path: linkPath }) });
    showSuccess("Link updated ✅", "");
    setEditingBanner(null);
    reload();
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <UploadIcon size={16} /> {uploading ? "Uploading..." : "Add a banner"}
      </button>

      {banners.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No banners</p>
      ) : banners.map((b: Banner) => (
        <div key={b.id} className={`bg-card rounded-xl border overflow-hidden ${b.is_active ? "border-secondary" : "border-secondary opacity-60"}`}>
          <img src={b.image_url} alt="Banner" className="w-full h-32 object-cover" />
          <div className="px-3 py-2">
            {editingBanner?.id === b.id ? (
              <div className="space-y-2">
                <input value={linkPath} onChange={e => setLinkPath(e.target.value)} placeholder="Link (e.g. /lottery)"
                  className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-sm border border-secondary outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => updateLink(b.id)} className="flex-1 gradient-button text-primary-foreground text-xs font-bold py-2 rounded-xl">Save</button>
                  <button onClick={() => setEditingBanner(null)} className="flex-1 bg-secondary text-foreground text-xs font-bold py-2 rounded-xl">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Link: {b.link_path}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => toggleBanner(b)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${b.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{b.is_active ? "ON" : "OFF"}</button>
                  <button onClick={() => { setEditingBanner(b); setLinkPath(b.link_path); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                  <button onClick={() => deleteBanner(b.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== PAYMENTS ====================
const PaymentsTab = ({ methods, countries, apiConfigs, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", country: "Haiti", phone: "", holder_name: "", instructions: "", country_id: "", payment_type: "manual", external_url: "", logo_url: "", api_config_id: "" });
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const openForm = (m?: PaymentMethod) => {
    if (m) { setEditing(m); setForm({ name: m.name, country: m.country, phone: m.phone || "", holder_name: m.holder_name || "", instructions: m.instructions || "", country_id: m.country_id || "", payment_type: m.payment_type || "manual", external_url: m.external_url || "", logo_url: m.logo_url || "", api_config_id: (m as any).api_config_id || "" }); }
    else { setEditing(null); setForm({ name: "", country: "Haiti", phone: "", holder_name: "", instructions: "", country_id: "", payment_type: "manual", external_url: "", logo_url: "", api_config_id: "" }); }
    setShowForm(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      setForm({ ...form, logo_url: url });
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Error", "Nom requis"); return; }
    const payload = { ...form, country_id: form.country_id || null, external_url: form.external_url || null, logo_url: form.logo_url || null, api_config_id: form.api_config_id || null };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/payment-methods/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/payment-methods", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: methods.length }) });
    showSuccess(editing ? "Modifie" : "Cree", "");
    setShowForm(false); reload();
  };

  const countryApiConfigs = (apiConfigs || []).filter((ac: ApiConfig) => !form.country_id || ac.country_id === form.country_id || !ac.country_id);

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><Plus size={16} /> Add a payment method</button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Edit" : "New"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Orange Money)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />

          <div>
            <label className="text-xs text-muted-foreground">Payment type</label>
            <div className="flex gap-2 mt-1">
              {[{ key: "manual", label: "Manuel" }, { key: "external", label: "Lien ext." }, { key: "api", label: "API auto" }].map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, payment_type: t.key })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.payment_type === t.key ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Logo</label>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            {form.logo_url ? (
              <div className="flex items-center gap-3 mt-1">
                <img src={form.logo_url} className="w-10 h-10 rounded-lg object-cover" />
                <button onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive">Delete</button>
              </div>
            ) : (
              <button onClick={() => logoRef.current?.click()} disabled={uploading} className="mt-1 w-full h-12 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {uploading ? "Upload..." : <><UploadIcon size={14} /> Add logo</>}
              </button>
            )}
          </div>

          <select value={form.country_id} onChange={e => { const c = countries.find((ct: Country) => ct.id === e.target.value); setForm({ ...form, country_id: e.target.value, country: c?.name || form.country }); }}
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
            <option value="">-- Select a country --</option>
            {countries.filter((c: Country) => c.is_active).map((c: Country) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {form.payment_type === "manual" && (
            <>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Number" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
              <input value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} placeholder="Account holder" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
              <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Payment instructions" rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none resize-none" />
            </>
          )}

          {form.payment_type === "external" && (
            <input value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} placeholder="External payment URL (https://...)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          )}

          {form.payment_type === "api" && (
            <div>
              <label className="text-xs text-muted-foreground">Linked API configuration</label>
              <select value={form.api_config_id} onChange={e => setForm({ ...form, api_config_id: e.target.value })}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
                <option value="">-- Select an API --</option>
                {countryApiConfigs.filter((ac: ApiConfig) => ac.is_active).map((ac: ApiConfig) => (
                  <option key={ac.id} value={ac.id}>{ac.name} ({ac.provider}) - {ac.mode}</option>
                ))}
              </select>
              {countryApiConfigs.length === 0 && (
                <p className="text-[10px] text-warning mt-1">⚠️ No API configured. Go to the "APIs" tab.</p>
              )}
            </div>
          )}

          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Update" : "Create"}</button>
        </div>
      )}

      {methods.map((m: PaymentMethod) => (
        <div key={m.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {m.logo_url ? (
                <img src={m.logo_url} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><CreditCard size={14} className="text-muted-foreground" /></div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.country} • {m.payment_type === "external" ? "External link" : m.payment_type === "api" ? "API auto ⚡" : `Manual ${m.phone || "—"}`}
                </p>
                {m.holder_name && <p className="text-xs text-muted-foreground">{m.holder_name}</p>}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/payment-methods/${m.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !m.is_active }) }); reload(); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${m.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{m.is_active ? "ON" : "OFF"}</button>
              <button onClick={() => openForm(m)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
              <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/payment-methods/${m.id}`, { method: "DELETE", headers: h }); showSuccess("Supprime", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== LINKS ====================
const LinksTab = ({ links, reload, showSuccess }: any) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const save = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/social-links/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ url: editUrl }) });
    showSuccess("Link updated ✅", "");
    setEditId(null); reload();
  };

  return (
    <div className="space-y-3">
      {links.map((l: SocialLink) => (
        <div key={l.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
          {editId === l.id ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">{l.label}</p>
              <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="URL" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              <div className="flex gap-2">
                <button onClick={() => save(l.id)} className="flex-1 gradient-button text-primary-foreground text-sm font-bold py-2 rounded-xl flex items-center justify-center gap-1"><Save size={12} /> Save</button>
                <button onClick={() => setEditId(null)} className="flex-1 bg-secondary text-foreground text-sm font-bold py-2 rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{l.label}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{l.url || "Non défini"}</p>
              </div>
              <button onClick={() => { setEditId(l.id); setEditUrl(l.url || ""); }} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Pencil size={12} className="text-primary" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ==================== POPUPS ====================
// ==================== ANNONCES TAB ====================
type TabItem = { label: string; content: string; url?: string };

const AnnoncesTab = ({ reload, showSuccess, showError }: any) => {
  const [popup, setPopup] = useState<PopupMsg | null>(null);
  const [form, setForm] = useState<Partial<PopupMsg>>({});
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/popups?trigger_key=welcome_promo", { headers: h });
    const data = res.ok ? await res.json() : null;
    const item = Array.isArray(data) ? data[0] : data;
    if (item) {
      setPopup(item as unknown as PopupMsg);
      setForm({ title: item.title, message: item.message, button_confirm: item.button_confirm ?? '', button_cancel: item.button_cancel ?? undefined, is_active: item.is_active ?? true });
      setTabs(Array.isArray(item.tabs) ? (item.tabs as unknown as TabItem[]) : []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!popup) return;
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`/api/admin/popups/${popup.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ title: form.title, message: form.message, button_confirm: form.button_confirm, button_cancel: form.button_cancel || null, tabs: tabs.length > 0 ? tabs : null, is_active: form.is_active }) });
    if (!res.ok) showError("Error", "Unable to save");
    else { showSuccess("Saved ✅", "Announcement updated"); load(); reload(); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  if (!popup) return <p className="text-center text-muted-foreground py-10">No announcement configured</p>;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Welcome popup</h3>
          <button onClick={async () => {
            const token = getAuthToken();
            const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            await fetch(`/api/admin/popups/${popup.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !popup.is_active }) });
            load(); reload();
          }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${popup.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {popup.is_active ? "✅ Active" : "❌ Inactive"}
          </button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Title</label>
          <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Message</label>
          <textarea value={form.message || ""} onChange={e => setForm({ ...form, message: e.target.value })}
            rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Confirm button</label>
            <input value={form.button_confirm || ""} onChange={e => setForm({ ...form, button_confirm: e.target.value })}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Cancel button (empty = none)</label>
            <input value={form.button_cancel || ""} onChange={e => setForm({ ...form, button_cancel: e.target.value })}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
          </div>
        </div>

        {/* Tabs */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Tabs (buttons in the popup)</label>
          {tabs.map((tab, i) => (
            <div key={i} className="bg-secondary/50 rounded-lg p-3 mb-2 space-y-2">
              <input value={tab.label} onChange={e => {
                const n = [...tabs]; n[i] = { ...n[i], label: e.target.value }; setTabs(n);
              }} placeholder="Tab name"
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
              <textarea value={tab.content} onChange={e => {
                const n = [...tabs]; n[i] = { ...n[i], content: e.target.value }; setTabs(n);
              }} rows={2} placeholder="Content"
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              <input value={tab.url || ""} onChange={e => {
                const n = [...tabs]; n[i] = { ...n[i], url: e.target.value }; setTabs(n);
              }} placeholder="URL (ex: /service-chat, https://wa.me/...)"
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
              <button onClick={() => setTabs(tabs.filter((_, idx) => idx !== i))} className="text-destructive text-xs flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))}
          <button onClick={() => setTabs([...tabs, { label: "Nouveau", content: "", url: "" }])}
            className="text-primary text-xs flex items-center gap-1 mt-1">
            <Plus size={12} /> Add a tab
          </button>
        </div>

        <button onClick={save} className="w-full gradient-button text-primary-foreground text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Save size={14} /> Save announcement
        </button>
      </div>
    </div>
  );
};

const PopupsTab = ({ popups, reload, showSuccess, showError }: any) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PopupMsg>>({});

  const save = async () => {
    if (!editing) return;
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/popups/${editing}`, { method: "PATCH", headers: h, body: JSON.stringify({ title: form.title, message: form.message, button_confirm: form.button_confirm, button_cancel: form.button_cancel || null, is_active: form.is_active }) });
    showSuccess("Saved ✅", "");
    setEditing(null); reload();
  };

  return (
    <div className="space-y-3">
      {popups.map((m: PopupMsg) => (
        <div key={m.id} className="bg-card rounded-xl border border-secondary p-4">
          {editing === m.id ? (
            <div className="space-y-3">
              <p className="text-xs font-mono text-primary">{m.trigger_key}</p>
              <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              <textarea value={form.message || ""} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.button_confirm || ""} onChange={e => setForm({ ...form, button_confirm: e.target.value })} placeholder="OK button" className="bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                <input value={form.button_cancel || ""} onChange={e => setForm({ ...form, button_cancel: e.target.value })} placeholder="Cancel button" className="bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 gradient-button text-primary-foreground text-sm font-bold py-2.5 rounded-xl"><Save size={14} /> Save</button>
                <button onClick={() => setEditing(null)} className="flex-1 bg-secondary text-foreground text-sm font-bold py-2.5 rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-primary mb-1">{m.trigger_key}</p>
                <p className="text-sm font-bold text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.message}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/popups/${m.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !m.is_active }) }); reload(); }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${m.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{m.is_active ? "ON" : "OFF"}</button>
                <button onClick={() => { setEditing(m.id); setForm({ ...m }); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Pencil size={12} className="text-muted-foreground" /></button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ==================== SUPPORT CHAT ====================
type ChatConversation = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
};

type ChatMsg = {
  id: string;
  user_id: string;
  sender: string;
  message: string;
  is_ai: boolean;
  created_at: string;
};

const SupportTab = ({ adminId }: { adminId: string }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUserId) loadMessages(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Polling-based refresh (replaces Supabase realtime)
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (selectedUserId) loadMessages(selectedUserId);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedUserId]);

  const loadConversations = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/chat/conversations", { headers: h });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setConversations(data || []);
    setLoading(false);
  };

  const loadMessages = async (uid: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`/api/admin/chat/messages/${uid}`, { headers: h });
    if (!res.ok) return;
    const data = await res.json();
    setChatMessages((data || []).map((m: any) => ({ ...m, is_ai: m.is_ai ?? false })) as any);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUserId) return;
    setSending(true);
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/chat/reply", { method: "POST", headers: h, body: JSON.stringify({ user_id: selectedUserId, message: replyText.trim() }) });
    if (res.ok) {
      const inserted = await res.json();
      setChatMessages((prev) => [...prev, inserted as ChatMsg]);
      setReplyText("");
      loadConversations();
    }
    setSending(false);
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
    }
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "America/Port-au-Prince" });
  };

  if (loading) return <p className="text-xs text-muted-foreground text-center py-10">Loading...</p>;

  // Chat view
  if (selectedUserId) {
    const convo = conversations.find((c) => c.user_id === selectedUserId);
    return (
      <div className="space-y-3">
        <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
          <ArrowLeft size={16} /> Back to conversations
        </button>

        <div className="bg-card rounded-xl border border-secondary p-3">
          <p className="text-sm font-bold text-foreground">{convo?.full_name || "User"}</p>
          <p className="text-xs text-muted-foreground">{convo?.phone}</p>
        </div>

        {/* Messages */}
        <div className="bg-secondary/30 rounded-xl border border-secondary p-3 max-h-[400px] overflow-y-auto space-y-2">
          {chatMessages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                m.sender === "user"
                  ? "bg-card border border-secondary rounded-bl-md"
                  : m.is_ai
                    ? "bg-primary/10 border border-primary/30 rounded-br-md"
                    : "bg-primary/20 border border-primary/40 rounded-br-md"
              }`}>
                {m.sender === "support" && (
                  <div className="flex items-center gap-1 mb-0.5">
                    {m.is_ai ? <Bot size={10} className="text-primary" /> : <Shield size={10} className="text-primary" />}
                    <span className="text-[9px] font-semibold text-primary">{m.is_ai ? "Sarah IA" : "Admin"}</span>
                  </div>
                )}
                <p className="text-xs text-foreground whitespace-pre-line">{m.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{formatTime(m.created_at)}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Reply input */}
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            placeholder="Reply to client..."
            className="flex-1 bg-card border border-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
          <button
            onClick={sendReply}
            disabled={sending || !replyText.trim()}
            className="gradient-button text-primary-foreground font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} /> Envoyer
          </button>
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Conversations ({conversations.length})</h3>
      </div>

      {conversations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No conversations</p>
      ) : (
        conversations.map((c) => (
          <button
            key={c.user_id}
            onClick={() => setSelectedUserId(c.user_id)}
            className="w-full bg-card rounded-xl border border-secondary p-4 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-foreground">{c.full_name}</p>
              <span className="text-[10px] text-muted-foreground">{formatTime(c.last_time)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{c.phone}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{c.last_message}</p>
          </button>
        ))
      )}
    </div>
  );
};

// ==================== EMMA IA ====================
const SarahTab = ({ settings, reload, showSuccess, showError }: any) => {
  const [editKeys, setEditKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const isEnabled = settings.find((s: SiteSetting) => s.key === "sarah_enabled")?.value === "true";
  const currentProvider = settings.find((s: SiteSetting) => s.key === "sarah_ai_provider")?.value || "lovable";
  const getSetting = (key: string) => settings.find((s: SiteSetting) => s.key === key)?.value || "";

  const saveSetting = async (key: string, value: string, category = "sarah") => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: [{ key, value, category }] }) });
    reload();
  };

  const toggle = async () => {
    const newVal = isEnabled ? "false" : "true";
    await saveSetting("sarah_enabled", newVal);
    showSuccess(
      newVal === "true" ? "Sarah activée ✅" : "Sarah désactivée",
      newVal === "true" ? "L'IA prend en charge le chat" : "Support humain activé"
    );
  };

  const changeProvider = async (provider: string) => {
    await saveSetting("sarah_ai_provider", provider);
    showSuccess("Moteur IA mis à jour", `Sarah utilise maintenant: ${provider}`);
  };

  const saveApiKey = async (keyName: string, modelName: string | null, endpointName?: string) => {
    setSavingKey(keyName);
    try {
      const keyVal = editKeys[keyName] ?? "";
      if (keyVal.trim() && keyVal !== "••••••••••••••••") await saveSetting(keyName, keyVal.trim());
      if (modelName) {
        const modelVal = editKeys[modelName] ?? getSetting(modelName);
        if (modelVal) await saveSetting(modelName, modelVal);
      }
      if (endpointName) {
        const epVal = editKeys[endpointName] ?? getSetting(endpointName);
        if (epVal) await saveSetting(endpointName, epVal);
      }
      showSuccess("Configuration sauvegardée ✅", "");
      setEditKeys(prev => {
        const u = { ...prev };
        delete u[keyName];
        if (modelName) delete u[modelName];
        if (endpointName) delete u[endpointName];
        return u;
      });
    } catch (err: any) {
      showError("Erreur", err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const providers = [
    { id: "lovable", name: "Lovable AI", desc: "IA intégrée • Aucune clé API requise", icon: "🤖", hasKey: false },
    { id: "openai", name: "OpenAI GPT", desc: "GPT-4o, GPT-4, GPT-3.5 • Clé API OpenAI requise", icon: "🌐", hasKey: true, keyName: "ai_openai_key", modelName: "ai_openai_model", placeholder: "sk-proj-...", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"], defaultModel: "gpt-4o" },
    { id: "grok", name: "Grok (xAI)", desc: "Grok-3, Grok-2 • Clé API xAI requise", icon: "⚡", hasKey: true, keyName: "ai_grok_key", modelName: "ai_grok_model", placeholder: "xai-...", models: ["grok-3-beta", "grok-3-mini-beta", "grok-2-1212"], defaultModel: "grok-3-beta" },
    { id: "anthropic", name: "Anthropic Claude", desc: "Opus, Sonnet, Haiku • Clé API Anthropic requise", icon: "🧠", hasKey: true, keyName: "ai_anthropic_key", modelName: "ai_anthropic_model", placeholder: "sk-ant-...", models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"], defaultModel: "claude-sonnet-4-5" },
    { id: "gemini", name: "Google Gemini", desc: "Gemini 2.0 Flash, 1.5 Pro • Clé API Google requise", icon: "✨", hasKey: true, keyName: "ai_gemini_key", modelName: "ai_gemini_model", placeholder: "AIza...", models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"], defaultModel: "gemini-2.0-flash-exp" },
    { id: "mistral", name: "Mistral AI", desc: "Large, Medium, Small • Clé API Mistral requise", icon: "💨", hasKey: true, keyName: "ai_mistral_key", modelName: "ai_mistral_model", placeholder: "...", models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"], defaultModel: "mistral-large-latest" },
    { id: "custom", name: "API Personnalisée", desc: "Compatible OpenAI • Configurez votre propre API", icon: "🔧", hasKey: true, keyName: "ai_custom_key", modelName: "ai_custom_model", endpointName: "ai_custom_endpoint", placeholder: "sk-...", models: [], defaultModel: "" },
  ] as const;

  const activeProvider = providers.find(p => p.id === currentProvider);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-secondary p-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isEnabled ? "bg-success/20" : "bg-secondary"}`}>
            <Bot size={28} className={isEnabled ? "text-success" : "text-muted-foreground"} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">Assistante Sarah</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEnabled ? `Moteur actif : ${activeProvider?.name || currentProvider}` : "Support manuel activé"}
            </p>
          </div>
          <button
            onClick={toggle}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              isEnabled ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            <Power size={16} />
            {isEnabled ? "Désactiver" : "Activer Sarah"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4">
        <h4 className="text-xs font-bold text-muted-foreground mb-1">⚙️ MOTEUR D'INTELLIGENCE ARTIFICIELLE</h4>
        <p className="text-xs text-muted-foreground mb-4">Choisissez le moteur IA et configurez les clés API :</p>
        <div className="space-y-2">
          {providers.map((provider) => {
            const isActive = currentProvider === provider.id;
            const hasKey = provider.hasKey && !!getSetting((provider as any).keyName);
            return (
              <div key={provider.id} className={`rounded-xl border transition-all ${isActive ? "border-primary bg-primary/10" : "border-secondary"}`}>
                <button onClick={() => changeProvider(provider.id)} className="w-full flex items-center gap-3 p-3 text-left">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isActive ? "border-primary" : "border-muted-foreground"}`}>
                    {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="text-base">{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{provider.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{provider.desc}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/20 text-success">Actif</span>}
                    {provider.hasKey && hasKey && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">✓ Clé</span>}
                  </div>
                </button>

                {isActive && provider.hasKey && (
                  <div className="px-3 pb-3 space-y-2 border-t border-primary/20">
                    {(provider as any).endpointName && (
                      <div className="pt-2">
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-1">ENDPOINT URL</label>
                        <input
                          type="url"
                          value={editKeys[(provider as any).endpointName] ?? getSetting((provider as any).endpointName)}
                          onChange={e => setEditKeys(prev => ({ ...prev, [(provider as any).endpointName]: e.target.value }))}
                          placeholder="https://api.example.com/v1"
                          className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-secondary outline-none"
                        />
                      </div>
                    )}
                    <div className="pt-2">
                      <label className="text-[10px] text-muted-foreground font-semibold block mb-1">CLÉ API {provider.name.toUpperCase()}</label>
                      <input
                        type="password"
                        value={editKeys[(provider as any).keyName] ?? (hasKey ? "••••••••••••••••" : "")}
                        onFocus={e => { if (editKeys[(provider as any).keyName] === undefined) { setEditKeys(prev => ({ ...prev, [(provider as any).keyName]: "" })); e.target.value = ""; } }}
                        onChange={e => setEditKeys(prev => ({ ...prev, [(provider as any).keyName]: e.target.value }))}
                        placeholder={(provider as any).placeholder}
                        className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-secondary outline-none"
                      />
                    </div>
                    {(provider as any).models?.length > 0 && (
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-1">MODÈLE</label>
                        <select
                          value={editKeys[(provider as any).modelName] ?? (getSetting((provider as any).modelName) || (provider as any).defaultModel)}
                          onChange={e => setEditKeys(prev => ({ ...prev, [(provider as any).modelName]: e.target.value }))}
                          className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-secondary outline-none"
                        >
                          {(provider as any).models.map((m: string) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    )}
                    {provider.id === "custom" && (
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-1">NOM DU MODÈLE</label>
                        <input
                          type="text"
                          value={editKeys[(provider as any).modelName] ?? getSetting((provider as any).modelName)}
                          onChange={e => setEditKeys(prev => ({ ...prev, [(provider as any).modelName]: e.target.value }))}
                          placeholder="gpt-4o, llama-3.1-70b, etc."
                          className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-secondary outline-none"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => saveApiKey((provider as any).keyName, (provider as any).modelName, (provider as any).endpointName)}
                      disabled={savingKey === (provider as any).keyName}
                      className="w-full gradient-button text-primary-foreground font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Save size={12} />
                      {savingKey === (provider as any).keyName ? "Sauvegarde..." : "Sauvegarder la configuration"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4">
        <h4 className="text-xs font-bold text-muted-foreground mb-3">STATUS</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">État actuel</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isEnabled ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
              {isEnabled ? "🟢 En ligne" : "⚫ Hors ligne"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Mode support</span>
            <span className="text-xs text-muted-foreground">{isEnabled ? "Automatique (IA)" : "Manuel (Humain)"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Moteur IA</span>
            <span className="text-xs font-bold text-primary">{activeProvider?.name || currentProvider}</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4">
        <h4 className="text-xs font-bold text-muted-foreground mb-3">CAPACITÉS D'EMMA</h4>
        <div className="space-y-2">
          {["Répond aux questions sur les produits", "Explique le système VIP", "Informe sur les frais et délais", "Rassure les utilisateurs en attente", "Utilise les données du site en temps réel", "Transfère vers un humain si nécessaire"].map((cap, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span className="text-xs text-foreground">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          💡 Les clés API sont stockées de manière sécurisée dans les paramètres du site. Sarah utilise automatiquement les données du site (frais, VIP, produits) pour répondre aux utilisateurs.
        </p>
      </div>
    </div>
  );
};

// ==================== REWARDS (CADEAUX) ====================
const RewardsTab = ({ settings, reload, showSuccess, showError }: any) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", points_required: "", image_url: "", money_value: "" });
  const [edits, setEdits] = useState<Record<string, string>>({});

  const getVal = (key: string) => edits[key] ?? settings.find((s: SiteSetting) => s.key === key)?.value ?? "";
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  useEffect(() => { loadRewards(); }, []);
  const loadRewards = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/gift-rewards", { headers: h });
    if (res.ok) setRewards(await res.json());
  };

  const saveSettings = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const settingsArr = Object.entries(edits).map(([key, value]) => ({ key, value, category: "points" }));
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: settingsArr }) });
    showSuccess("GE Energy Currency Configuration sauvegardée", "");
    setEdits({});
    reload();
  };

  const openForm = (r?: any) => {
    if (r) { setEditing(r); setForm({ name: r.name, points_required: String(r.points_required), image_url: r.image_url || "", money_value: String(r.money_value || 0) }); }
    else { setEditing(null); setForm({ name: "", points_required: "", image_url: "", money_value: "" }); }
    setShowForm(true);
  };

  const saveReward = async () => {
    if (!form.name || !form.points_required || !form.money_value) { showError("Error", "Please fill in all required fields"); return; }
    const payload = { name: form.name, points_required: Number(form.points_required), money_value: Number(form.money_value), image_url: form.image_url || null };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/gift-rewards/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/gift-rewards", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: rewards.length }) });
    showSuccess(editing ? "Reward updated" : "Reward added", "");
    setShowForm(false);
    loadRewards();
  };

  const toggleReward = async (r: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/gift-rewards/${r.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !r.is_active }) });
    loadRewards();
  };

  const deleteReward = async (r: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/gift-rewards/${r.id}`, { method: "DELETE", headers: h });
    showSuccess("Reward deleted", "");
    loadRewards();
  };

  const pointsKeys = [
    { key: "points_per_active_member", label: "ESK per active member" },
    { key: "points_per_vip_level_per_day", label: "ESK per VIP level / day" },
    { key: "points_per_deposit_type", label: "Deposit type (fixed / percent)" },
    { key: "points_per_deposit_value", label: "ESK value per deposit" },
    { key: "points_per_withdrawal", label: "ESK per withdrawal" },
  ];

  return (
    <div className="space-y-4">
      {/* Points configuration */}
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Gift size={16} className="text-primary" /> GE Energy Currency Configuration</h3>
        {pointsKeys.map(k => (
          <div key={k.key}>
            <label className="text-xs text-muted-foreground">{k.label}</label>
            <input value={getVal(k.key)} onChange={e => setVal(k.key, e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
        ))}
        {Object.keys(edits).length > 0 && (
          <button onClick={saveSettings} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <Save size={14} /> Save
          </button>
        )}
      </div>

      {/* Rewards catalog */}
      <div className="bg-card rounded-xl border border-secondary p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">ESK Conversion Catalog</h3>
          <button onClick={() => openForm()} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Plus size={16} className="text-primary" /></button>
        </div>

        {showForm && (
          <div className="bg-secondary/30 rounded-xl p-4 mb-3 space-y-3">
            <div className="flex justify-between"><span className="text-xs font-bold text-foreground">{editing ? "Edit" : "New reward"}</span><button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button></div>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Reward name" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            <input type="number" value={form.points_required} onChange={e => setForm({ ...form, points_required: e.target.value })} placeholder="Points required" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            <input type="number" value={form.money_value} onChange={e => setForm({ ...form, money_value: e.target.value })} placeholder="Amount in USDT" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL (optional)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            <button onClick={saveReward} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm">{editing ? "Update" : "Add"}</button>
          </div>
        )}

        {rewards.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No rewards configured</p> :
          rewards.map((r: any) => (
            <div key={r.id} className={`flex items-center justify-between py-3 border-b border-secondary/50 last:border-0 ${!r.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                {r.image_url ? <img src={r.image_url} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Gift size={16} className="text-primary" /></div>}
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.points_required} ESK → {Number(r.money_value || 0).toLocaleString("en-US")} USDT</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggleReward(r)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${r.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{r.is_active ? "ON" : "OFF"}</button>
                <button onClick={() => openForm(r)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                <button onClick={() => deleteReward(r)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ==================== GIFT CODES ====================
const GiftCodesTab = ({ showSuccess, showError }: any) => {
  const [codes, setCodes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", points_value: "", max_uses: "1", expires_at: "" });

  useEffect(() => { loadCodes(); }, []);
  const loadCodes = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/gift-codes", { headers: h });
    if (res.ok) setCodes(await res.json());
  };

  const openForm = (c?: any) => {
    if (c) {
      setEditing(c);
      setForm({ code: c.code, points_value: String(c.points_value), max_uses: String(c.max_uses), expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "" });
    } else {
      setEditing(null);
      const randomCode = "GE" + Math.random().toString(36).substring(2, 8).toUpperCase();
      setForm({ code: randomCode, points_value: "", max_uses: "1", expires_at: "" });
    }
    setShowForm(true);
  };

  const saveCode = async () => {
    if (!form.code || !form.points_value) { showError("Error", "Code and points value are required"); return; }
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      points_value: Number(form.points_value),
      max_uses: Number(form.max_uses) || 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/gift-codes/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/gift-codes", { method: "POST", headers: h, body: JSON.stringify(payload) });
    showSuccess(editing ? "Code updated" : "Code created", "");
    setShowForm(false);
    loadCodes();
  };

  const toggleCode = async (c: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/gift-codes/${c.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !c.is_active }) });
    loadCodes();
  };

  const deleteCode = async (c: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/gift-codes/${c.id}`, { method: "DELETE", headers: h });
    showSuccess("Code deleted", "");
    loadCodes();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port-au-Prince" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-secondary p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Gift size={16} className="text-primary" /> Redemption codes</h3>
          <button onClick={() => openForm()} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Plus size={16} className="text-primary" /></button>
        </div>

        {showForm && (
          <div className="bg-secondary/30 rounded-xl p-4 mb-3 space-y-3">
            <div className="flex justify-between"><span className="text-xs font-bold text-foreground">{editing ? "Edit code" : "New code"}</span><button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button></div>
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex: GE2024" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none uppercase" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Points to award</label>
              <input type="number" value={form.points_value} onChange={e => setForm({ ...form, points_value: e.target.value })} placeholder="Ex: 50" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Maximum uses</label>
              <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="1" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Expiration date (optional)</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <button onClick={saveCode} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm">{editing ? "Update" : "Create code"}</button>
          </div>
        )}

        {codes.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No codes created</p> :
          codes.map((c: any) => (
            <div key={c.id} className={`flex items-center justify-between py-3 border-b border-secondary/50 last:border-0 ${!c.is_active ? "opacity-50" : ""}`}>
              <div>
                <p className="text-sm font-bold text-primary font-mono">{c.code}</p>
                <p className="text-xs text-muted-foreground">{c.points_value} pts • {c.used_count}/{c.max_uses} used</p>
                {c.expires_at && <p className="text-[10px] text-muted-foreground">Expire: {formatDate(c.expires_at)}</p>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggleCode(c)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${c.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{c.is_active ? "ON" : "OFF"}</button>
                <button onClick={() => openForm(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                <button onClick={() => deleteCode(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ==================== FAQ MANAGEMENT ====================
const FaqTab = ({ showSuccess, showError }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ question: "", answer: "" });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/faq", { headers: h });
    if (res.ok) setItems(await res.json());
  };

  const openForm = (item?: any) => {
    if (item) { setEditing(item); setForm({ question: item.question, answer: item.answer }); }
    else { setEditing(null); setForm({ question: "", answer: "" }); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.question || !form.answer) { showError("Error", "Please fill in all fields"); return; }
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/faq/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(form) });
    else await fetch("/api/admin/faq", { method: "POST", headers: h, body: JSON.stringify({ ...form, sort_order: items.length }) });
    showSuccess(editing ? "Question updated" : "Question added", "");
    setShowForm(false); load();
  };

  const toggle = async (item: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/faq/${item.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !item.is_active }) });
    load();
  };

  const remove = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/faq/${id}`, { method: "DELETE", headers: h });
    showSuccess("Question deleted", ""); load();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Add a question
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><span className="text-xs font-bold text-foreground">{editing ? "Edit" : "New question"}</span><button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button></div>
          <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Question" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
          <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Answer" rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm">{editing ? "Update" : "Add"}</button>
        </div>
      )}

      {items.map((item: any) => (
        <div key={item.id} className={`bg-card rounded-xl border border-secondary p-4 ${!item.is_active ? "opacity-50" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{item.question}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.answer}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => toggle(item)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${item.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{item.is_active ? "ON" : "OFF"}</button>
              <button onClick={() => openForm(item)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
              <button onClick={() => remove(item.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== INFO ITEMS (ANNONCES) ====================
const InfoItemsTab = ({ showSuccess, showError }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/info-items", { headers: h });
    if (res.ok) setItems(await res.json());
  };

  const openForm = (item?: any) => {
    if (item) { setEditing(item); setForm({ title: item.title, description: item.description }); }
    else { setEditing(null); setForm({ title: "", description: "" }); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title || !form.description) { showError("Error", "Please fill in all fields"); return; }
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/info-items/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(form) });
    else await fetch("/api/admin/info-items", { method: "POST", headers: h, body: JSON.stringify({ ...form, sort_order: items.length }) });
    showSuccess(editing ? "Announcement updated" : "Announcement added", "");
    setShowForm(false); load();
  };

  const toggle = async (item: any) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const currentActive = item.isActive ?? item.is_active ?? true;
    await fetch(`/api/admin/info-items/${item.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !currentActive }) });
    load();
  };

  const remove = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/info-items/${id}`, { method: "DELETE", headers: h });
    showSuccess("Announcement deleted", ""); load();
  };

  const uploadImage = async (itemId: string, file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      const token = getAuthToken();
      const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      await fetch(`/api/admin/info-items/${itemId}`, { method: "PATCH", headers: h, body: JSON.stringify({ imageUrl: url }) });
      showSuccess("Image ajoutée ✅", "");
      load();
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Vérifiez votre connexion");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (itemId: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/info-items/${itemId}`, { method: "PATCH", headers: h, body: JSON.stringify({ imageUrl: null }) });
    showSuccess("Image deleted", "");
    load();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Add an announcement
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><span className="text-xs font-bold text-foreground">{editing ? "Edit" : "New announcement"}</span><button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button></div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm">{editing ? "Update" : "Add"}</button>
        </div>
      )}

      {items.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No announcements</p> :
        items.map((item: any) => {
          const isActive = item.isActive ?? item.is_active ?? true;
          const imageUrl = item.imageUrl ?? item.image_url ?? null;
          return (
            <div key={item.id} className={`bg-card rounded-xl border border-secondary p-4 ${!isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3 flex-1 min-w-0">
                  {imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative group">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(item.id)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <label className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center cursor-pointer">
                    <ImageIcon size={10} className="text-primary" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImage(item.id, e.target.files[0]); }} />
                  </label>
                  <button onClick={() => toggle(item)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{isActive ? "ON" : "OFF"}</button>
                  <button onClick={() => openForm(item)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                  <button onClick={() => remove(item.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                </div>
              </div>
            </div>
          );
        })
      }
      {uploading && <p className="text-xs text-center text-muted-foreground animate-pulse">Uploading...</p>}
    </div>
  );
};

// ==================== APP SETTINGS ====================
const AppSettingsTab = ({ settings, reload, showSuccess }: any) => {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const getVal = (key: string) => edits[key] ?? settings.find((s: SiteSetting) => s.key === key)?.value ?? "";
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  const saveAll = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const settingsArr = Object.entries(edits).map(([key, value]) => ({ key, value, category: "app" }));
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: settingsArr }) });
    showSuccess("App settings saved", "");
    setEdits({}); reload();
  };

  const appKeys = [
    { key: "app_message_text", label: "Message application mobile" },
    { key: "app_message_enabled", label: "Afficher le message (true/false)" },
    { key: "app_estimated_date", label: "Date estimee de sortie" },
    { key: "app_download_url", label: "URL de telechargement (vide = pas de bouton)" },
  ];

  const homescreenKeys = [
    { key: "homescreen_instructions_enabled", label: "Afficher les instructions (true/false)" },
    { key: "homescreen_instructions_text", label: "Instructions ecran d'accueil" },
  ];

  const imageKeys = [
    {
      key: "img_app_logo",
      label: "Logo de l'application",
      desc: "Affiché sur l'écran de connexion, inscription et À propos",
    },
    {
      key: "img_emma_avatar",
      label: "Avatar Sarah IA (Support)",
      desc: "Photo de profil de l'assistante Sarah dans le chat support",
    },
    {
      key: "img_bg_depot",
      label: "Fond carte Dépôt (portefeuille)",
      desc: "Arrière-plan de la carte balance dépôt",
    },
    {
      key: "img_bg_gains",
      label: "Fond carte Gains (portefeuille)",
      desc: "Arrière-plan de la carte balance gains",
    },
    {
      key: "img_bg_parrainage",
      label: "Fond carte Parrainage (portefeuille)",
      desc: "Arrière-plan de la carte balance parrainage",
    },
    {
      key: "img_bg_today_earnings",
      label: "Fond statistique Gains du jour",
      desc: "Arrière-plan de la tuile gains du jour",
    },
    {
      key: "img_bg_total_revenue",
      label: "Fond statistique Revenus totaux",
      desc: "Arrière-plan de la tuile revenus totaux",
    },
    {
      key: "img_bg_total_deposit",
      label: "Fond statistique Dépôts totaux",
      desc: "Arrière-plan de la tuile dépôts totaux",
    },
    {
      key: "img_bg_total_withdraw",
      label: "Fond statistique Retraits totaux",
      desc: "Arrière-plan de la tuile retraits totaux",
    },
  ];

  return (
    <div className="space-y-4">
      {/* === IMAGES === */}
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ImageIcon size={16} className="text-primary" /> Images de l'application
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Collez l'URL complète de chaque image (https://...). Laissez vide pour utiliser l'image par défaut.
        </p>
        {imageKeys.map(k => {
          const url = getVal(k.key);
          return (
            <div key={k.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{k.label}</label>
              <p className="text-[11px] text-muted-foreground">{k.desc}</p>
              <div className="flex gap-2 items-start">
                {url && (
                  <img
                    src={url}
                    alt={k.label}
                    className="w-14 h-14 rounded-xl object-cover border border-secondary flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <input
                  value={url}
                  onChange={e => setVal(k.key, e.target.value)}
                  placeholder="https://exemple.com/image.jpg"
                  className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Smartphone size={16} className="text-primary" /> Application mobile</h3>
        {appKeys.map(k => (
          <div key={k.key}>
            <label className="text-xs text-muted-foreground">{k.label}</label>
            {k.key === "app_message_text" ? (
              <textarea value={getVal(k.key)} onChange={e => setVal(k.key, e.target.value)} rows={3}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none resize-none" />
            ) : (
              <input value={getVal(k.key)} onChange={e => setVal(k.key, e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Globe size={16} className="text-primary" /> Instructions ecran d'accueil</h3>
        {homescreenKeys.map(k => (
          <div key={k.key}>
            <label className="text-xs text-muted-foreground">{k.label}</label>
            {k.key === "homescreen_instructions_text" ? (
              <textarea value={getVal(k.key)} onChange={e => setVal(k.key, e.target.value)} rows={4}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none resize-none" />
            ) : (
              <input value={getVal(k.key)} onChange={e => setVal(k.key, e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
            )}
          </div>
        ))}
      </div>

      {Object.keys(edits).length > 0 && (
        <button onClick={saveAll} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Save size={16} /> Enregistrer les modifications
        </button>
      )}
    </div>
  );
};

// ==================== SETTINGS ====================
// ==================== DATES TAB ====================
const DatesTab = ({ settings, reload, showSuccess }: any) => {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const getValue = (key: string) => edits[key] ?? settings.find((s: SiteSetting) => s.key === key)?.value ?? "";
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  const saveAll = async () => {
    setSaving(true);
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const settingsArr = Object.entries(edits).map(([key, value]) => ({ key, value, category: "dates" }));
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: settingsArr }) });
    setEdits({});
    await reload();
    setSaving(false);
    showSuccess("Dates sauvegardées !");
  };

  const dateFields = [
    { key: "manual_start_date", label: "Date de début", desc: "Date de démarrage des cycles / activations" },
    { key: "manual_end_date", label: "Date de fin", desc: "Date d'expiration des cycles" },
    { key: "manual_payment_date", label: "Date de paiement", desc: "Date prévue pour les paiements" },
    { key: "manual_profit_date", label: "Date de profit", desc: "Date de calcul des profits" },
    { key: "manual_cycle_date", label: "Date de cycle", desc: "Date de renouvellement des cycles" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Clock size={18} /> Contrôle manuel des dates</h2>
      <p className="text-xs text-muted-foreground">Définissez des dates fixes que Sarah et le système utiliseront à la place des calculs automatiques.</p>

      {/* Toggle */}
      <div className="bg-card rounded-xl border border-border/30 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Utiliser les dates manuelles</p>
          <p className="text-xs text-muted-foreground">When enabled, the system will use these dates instead of automatic calculations</p>
        </div>
        <button
          onClick={() => setVal("use_manual_dates", getValue("use_manual_dates") === "true" ? "false" : "true")}
          className={`w-12 h-6 rounded-full transition-colors ${getValue("use_manual_dates") === "true" ? "bg-primary" : "bg-secondary"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${getValue("use_manual_dates") === "true" ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Date fields */}
      <div className="grid gap-3">
        {dateFields.map(({ key, label, desc }) => (
          <div key={key} className="bg-card rounded-xl border border-border/30 p-4">
            <label className="text-sm font-semibold text-foreground block mb-1">{label}</label>
            <p className="text-[10px] text-muted-foreground mb-2">{desc}</p>
            <input
              type="date"
              value={getValue(key)}
              onChange={e => setVal(key, e.target.value)}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-secondary outline-none"
            />
          </div>
        ))}
      </div>

      <button onClick={saveAll} disabled={saving || Object.keys(edits).length === 0}
        className="w-full gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        <Save size={16} /> {saving ? "Saving..." : "Save dates"}
      </button>
    </div>
  );
};

// ==================== DEVISE TAB ====================
const DEFAULT_CURRENCIES = [
  { code: "usdtbsc",   label: "BEP20-USDT", network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)", logoUrl: "/crypto-logos/usdt.png",  enabled: true },
  { code: "usdttrc20", label: "TRC20-USDT", network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.18)",    logoUrl: "/crypto-logos/usdt.png",  enabled: true },
  { code: "trx",       label: "TRX",        network: "TRON",                    color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.18)",    logoUrl: "/crypto-logos/trx.png",   enabled: true },
  { code: "bnbbsc",    label: "BNB",        network: "BNB Smart Chain (BEP20)", color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.18)", logoUrl: "/crypto-logos/bnb.png",   enabled: true },
];
type CurrencyDef = { code: string; label: string; network: string; color: string; symbol: string; bg: string; logoUrl: string; enabled: boolean };

const DeviseTab = ({ settings, reload, showSuccess, showError }: any) => {
  const [currencies, setCurrencies] = useState<CurrencyDef[]>(DEFAULT_CURRENCIES);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const s = settings.find((s: SiteSetting) => s.key === "crypto_currencies");
    if (s?.value) {
      try { setCurrencies(JSON.parse(s.value)); } catch {}
    }
  }, [settings]);

  const update = (idx: number, field: string, val: any) => {
    setCurrencies(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
    setDirty(true);
  };

  const remove = (idx: number) => {
    setCurrencies(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const addCurrency = () => {
    const code = newCode.trim().toLowerCase();
    if (!code) return;
    if (currencies.find(c => c.code === code)) { showError("Doublon", `La devise ${code} existe déjà`); return; }
    setCurrencies(prev => [...prev, { code, label: code.toUpperCase(), network: "", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)", logoUrl: "/crypto-logos/usdt.png", enabled: true }]);
    setNewCode("");
    setShowAdd(false);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = getAuthToken();
      const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      await fetch("/api/admin/site-settings/batch", {
        method: "POST", headers: h,
        body: JSON.stringify({ settings: [{ key: "crypto_currencies", value: JSON.stringify(currencies), category: "finance" }] }),
      });
      showSuccess("Devises sauvegardées", "Les modifications prennent effet immédiatement ✅");
      setDirty(false);
      reload();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-1">💱 Devises crypto acceptées</h3>
        <p className="text-xs text-muted-foreground">
          Activez / désactivez les devises affichées sur la page de dépôt. Aucune valeur n'est codée en dur — tout vient d'ici.
        </p>
      </div>

      {currencies.map((c, i) => (
        <div key={c.code} className={`bg-card rounded-xl border p-4 space-y-3 ${c.enabled ? "border-secondary" : "border-muted opacity-60"}`}>
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg, border: `2px solid ${c.color}` }}>
                <img src={c.logoUrl} alt={c.code} className="w-5 h-5 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{c.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{c.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {c.enabled ? "Actif" : "Inactif"}
              </span>
              <button onClick={() => update(i, "enabled", !c.enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${c.enabled ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${c.enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Nom affiché</label>
              <input value={c.label} onChange={e => update(i, "label", e.target.value)}
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-1.5 text-xs border border-secondary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Symbole</label>
              <input value={c.symbol} onChange={e => update(i, "symbol", e.target.value)}
                className="w-full bg-secondary text-foreground rounded-lg px-3 py-1.5 text-xs border border-secondary focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Réseau blockchain</label>
            <input value={c.network} onChange={e => update(i, "network", e.target.value)}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-1.5 text-xs border border-secondary focus:border-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Couleur principale</label>
              <div className="flex items-center gap-1.5">
                <input type="color" value={c.color} onChange={e => update(i, "color", e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer shrink-0" style={{ border: "none", background: "none" }} />
                <input value={c.color} onChange={e => update(i, "color", e.target.value)}
                  className="flex-1 bg-secondary text-foreground rounded-lg px-2 py-1.5 text-xs border border-secondary focus:border-primary outline-none font-mono" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Background (rgba)</label>
              <input value={c.bg} onChange={e => update(i, "bg", e.target.value)}
                className="w-full bg-secondary text-foreground rounded-lg px-2 py-1.5 text-xs border border-secondary focus:border-primary outline-none font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">URL du logo</label>
            <input value={c.logoUrl} onChange={e => update(i, "logoUrl", e.target.value)}
              className="w-full bg-secondary text-foreground rounded-lg px-3 py-1.5 text-xs border border-secondary focus:border-primary outline-none font-mono" />
          </div>
          <button onClick={() => remove(i)} className="flex items-center gap-1 text-destructive text-[10px] hover:opacity-80 transition-opacity">
            <Trash2 size={12} /> Supprimer cette devise
          </button>
        </div>
      ))}

      {/* Add new currency */}
      {showAdd ? (
        <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Ajouter une nouvelle devise</p>
          <p className="text-[10px] text-muted-foreground">Code NowPayments (ex: usdterc20, ltc, eth...)</p>
          <div className="flex gap-2">
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="ex: usdterc20"
              className="flex-1 bg-secondary text-foreground rounded-lg px-3 py-2 text-xs border border-secondary focus:border-primary outline-none font-mono"
              onKeyDown={e => e.key === "Enter" && addCurrency()} />
            <button onClick={addCurrency} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-bold">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-xs">Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full border-2 border-dashed border-primary/30 text-primary rounded-xl py-3 text-xs font-medium flex items-center justify-center gap-1 hover:border-primary/60 transition-colors">
          <Plus size={14} /> Ajouter une devise
        </button>
      )}

      {dirty && (
        <button onClick={save} disabled={saving}
          className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Sauvegarde..." : "Sauvegarder les devises"}
        </button>
      )}
    </div>
  );
};

// ==================== SETTINGS TAB ====================
const SettingsTab = ({ settings, reload, showSuccess }: any) => {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const getValue = (key: string) => edits[key] ?? settings.find((s: SiteSetting) => s.key === key)?.value ?? "";
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  const saveAll = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const settingsArr = Object.entries(edits).map(([key, value]) => ({ key, value, category: "finance" }));
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: settingsArr }) });
    showSuccess("Settings saved", "");
    setEdits({});
    reload();
  };

  const groups: Record<string, { label: string; keys: { key: string; label: string }[] }> = {
    general: { label: "General", keys: [{ key: "site_name", label: "Site name" }, { key: "welcome_text", label: "Welcome text" }, { key: "terms_url", label: "Terms URL" }] },
    deposit: { label: "Deposit", keys: [
      { key: "deposit_amounts", label: "Preset amounts (comma-separated)" },
      { key: "deposit_min", label: "Minimum deposit (USDT)" },
      { key: "deposit_max", label: "Maximum deposit (USDT)" },
      { key: "deposit_rules", label: "Rules (separated by |, {min} and {max} dynamic)" },
      { key: "require_screenshot", label: "Require screenshot (true/false)" },
    ]},
    withdrawal: { label: "Withdrawal", keys: [
      { key: "withdrawal_amounts", label: "Preset amounts (comma-separated)" },
      { key: "withdrawal_min", label: "Minimum withdrawal (USDT)" },
      { key: "withdrawal_max", label: "Maximum withdrawal (USDT)" },
      { key: "withdrawal_fee_percent", label: "Withdrawal fee (%)" },
      { key: "withdrawal_rules", label: "Rules (separated by |, {min} {max} {fee} dynamic)" },
      { key: "max_withdrawals_per_day", label: "Max withdrawals per day" },
      { key: "max_withdrawals_enabled", label: "Withdrawal limit enabled (true/false)" },
      { key: "withdrawal_enabled", label: "Withdrawals active (true/false)" },
      { key: "withdrawal_days", label: "Allowed days (e.g. 1,2,3,4,5,6,7 — 1=Monday)" },
      { key: "withdrawal_hour_start", label: "Opening time (e.g. 10)" },
      { key: "withdrawal_hour_end", label: "Closing time (e.g. 17)" },
    ]},
    referral: { label: "Referral Bonus", keys: [
      { key: "referral_bonus_level_b", label: "Level E - Direct referrer (%)" },
      { key: "referral_bonus_level_c", label: "Level F - 2nd level (%)" },
      { key: "referral_bonus_level_d", label: "Level G - 3rd level (%)" },
      { key: "referral_title", label: "Invitation modal title" },
      { key: "referral_subtitle", label: "Invitation earnings subtitle" },
      { key: "referral_rules", label: "Rules (JSON array of texts)" },
    ] },
    vip: { label: "VIP Thresholds", keys: [{ key: "vip_threshold_1", label: "VIP1 (USDT)" }, { key: "vip_threshold_2", label: "VIP2 (USDT)" }, { key: "vip_threshold_3", label: "VIP3 (USDT)" }, { key: "vip_threshold_4", label: "VIP4 (USDT)" }, { key: "vip_threshold_5", label: "VIP5 (USDT)" }] },
  };

  const toggleKeys = [
    { key: "vip_conditions_enabled", label: "VIP progression conditions", desc: "Apply rules to advance to the next VIP level" },
    { key: "vip_progress_bar_enabled", label: "VIP progress bar", desc: "Show progress bar toward next VIP on the profile" },
    { key: "profile_products_display_enabled", label: "Products & VIP on profile", desc: "Show purchased products and VIP level on user profile" },
    { key: "withdrawal_mode_auto", label: "Automatic withdrawal mode", desc: "Enabled = withdrawals validated automatically. Disabled = manual withdrawals" },
  ];

  const getToggleValue = (key: string): boolean => {
    if (key in edits) return edits[key] !== "false";
    const s = settings.find((s: SiteSetting) => s.key === key);
    return s ? s.value !== "false" : true;
  };

  const handleToggle = (key: string, checked: boolean) => {
    setVal(key, checked ? "true" : "false");
  };

  return (
    <div className="space-y-4">
      {/* Display toggles */}
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Display controls</h3>
        {toggleKeys.map(t => (
          <div key={t.key} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
            <button
              onClick={() => handleToggle(t.key, !getToggleValue(t.key))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${getToggleValue(t.key) ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${getToggleValue(t.key) ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      {Object.values(groups).map(g => (
        <div key={g.label} className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">{g.label}</h3>
          {g.keys.map(k => (
            <div key={k.key}>
              <label className="text-xs text-muted-foreground">{k.label}</label>
              <input value={getValue(k.key)} onChange={e => setVal(k.key, e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
            </div>
          ))}
        </div>
      ))}
      {Object.keys(edits).length > 0 && (
        <button onClick={saveAll} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Save size={16} /> Save settings
        </button>
      )}
    </div>
  );
};

// ==================== OFFICIAL INFO ====================
const OfficialInfoTab = ({ settings, reload, showSuccess }: { settings: SiteSetting[]; reload: () => void; showSuccess: (t: string, m: string) => void }) => {
  const fields = [
    { key: "official_service_phone", label: "Customer service number", placeholder: "+509 XX XXX XXXX" },
    { key: "official_telegram_link", label: "Telegram support link", placeholder: "https://t.me/..." },
    { key: "official_telegram_group", label: "Telegram group link", placeholder: "https://t.me/..." },
    { key: "official_whatsapp_link", label: "WhatsApp link", placeholder: "https://wa.me/243XXXXXXXX" },
    { key: "official_whatsapp_group", label: "WhatsApp Group link", placeholder: "https://chat.whatsapp.com/..." },
    { key: "official_private_group_msg", label: "Private Investor Group message", placeholder: "Message shown when private group is requested...", multiline: true },
    { key: "official_welcome_message", label: "Automatic welcome message", placeholder: "Welcome to GE Energy...", multiline: true },
  ];

  const [edits, setEdits] = useState<Record<string, string>>({});

  const getValue = (key: string) => {
    if (key in edits) return edits[key];
    return settings.find(s => s.key === key)?.value || "";
  };

  const setVal = (key: string, val: string) => setEdits(prev => ({ ...prev, [key]: val }));

  const saveAll = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const settingsArr = Object.entries(edits).map(([key, value]) => ({ key, value, category: "official_info" }));
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: settingsArr }) });
    showSuccess("Official information saved", "Changes take effect immediately ✅");
    setEdits({});
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-1">📋 Official Information Management</h3>
        <p className="text-xs text-muted-foreground">
          This information is used by Sarah AI to answer user questions. Update it here and changes take effect immediately.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-secondary p-4 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={getValue(f.key)}
                onChange={e => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none resize-none"
              />
            ) : (
              <input
                value={getValue(f.key)}
                onChange={e => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none"
              />
            )}
          </div>
        ))}
      </div>

      {Object.keys(edits).length > 0 && (
        <button onClick={saveAll} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Save size={16} /> Save information
        </button>
      )}
    </div>
  );
};

// ==================== OFFICIAL DOCS ====================
const OfficialDocsTab = ({ showSuccess, showError }: { showSuccess: (t: string, m: string) => void; showError: (t: string, m: string) => void }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("image");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch("/api/admin/official-docs", { headers: h });
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !title.trim()) {
      showError("Erreur", "Veuillez entrer un titre avant d'uploader");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      const token2 = getAuthToken();
      const h2: HeadersInit = { "Content-Type": "application/json", ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) };
      await fetch("/api/admin/official-docs", { method: "POST", headers: h2, body: JSON.stringify({ title: title.trim(), description: description.trim() || null, doc_type: docType, file_url: url, sort_order: docs.length }) });
      setTitle(""); setDescription(""); setDocType("image");
      showSuccess("Document ajouté ✅", "Le document est maintenant disponible pour Sarah AI");
      loadDocs();
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/official-docs/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !current }) });
    loadDocs();
  };

  const deleteDoc = async (id: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/official-docs/${id}`, { method: "DELETE", headers: h });
    showSuccess("Deleted", "Document deleted ✅");
    loadDocs();
  };

  if (loading) return <p className="text-xs text-muted-foreground text-center py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-1">📄 Official Documents & Proof</h3>
        <p className="text-xs text-muted-foreground">
          Add your certificates, legal documents, and proof images. Sarah will automatically use them to reassure users.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none resize-none" />
        <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none">
          <option value="image">Image / Photo</option>
          <option value="certificate">Certificat</option>
          <option value="pdf">Document PDF</option>
        </select>
        <button onClick={() => { if (!title.trim()) { showError("Error", "Enter a title"); return; } fileRef.current?.click(); }} disabled={uploading} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          {uploading ? "Uploading..." : <><UploadIcon size={16} /> Upload file</>}
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
      </div>

      {/* List */}
      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id} className="bg-card rounded-xl border border-secondary p-3">
            <div className="flex items-start gap-3">
              {doc.doc_type === "image" || doc.doc_type === "certificate" ? (
                <img src={doc.file_url} alt={doc.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{doc.title}</p>
                {doc.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{doc.description}</p>}
                <span className={`inline-block text-[9px] mt-1 px-2 py-0.5 rounded-full ${doc.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {doc.doc_type} • {doc.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(doc.id, doc.is_active)} className="p-1.5 rounded-lg hover:bg-secondary">
                  {doc.is_active ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-primary" />}
                </button>
                <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No documents added</p>}
      </div>
    </div>
  );
};


const SecurityTab = ({ logs, settings, reload, showSuccess, showError }: { logs: AdminLog[]; settings: SiteSetting[]; reload: () => void; showSuccess: (t: string, m: string) => void; showError: (t: string, m: string) => void }) => {
  const existing = settings.find(s => s.key === "admin_phones");
  const [phones, setPhones] = useState<string[]>(() => {
    try { return existing?.value ? JSON.parse(existing.value) : []; } catch { return []; }
  });
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    try {
      const val = settings.find(s => s.key === "admin_phones")?.value;
      setPhones(val ? JSON.parse(val) : []);
    } catch { /* ignore */ }
  }, [settings]);

  const savePhones = async (updated: string[]) => {
    const val = JSON.stringify(updated);
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch("/api/admin/site-settings/batch", { method: "POST", headers: h, body: JSON.stringify({ settings: [{ key: "admin_phones", value: val, category: "security" }] }) });
    setPhones(updated);
    reload();
  };

  const addPhone = async () => {
    const clean = newPhone.replace(/\s/g, "").trim();
    if (!clean) { showError("Error", "Please enter a number"); return; }
    if (phones.includes(clean)) { showError("Error", "This number already exists"); return; }
    await savePhones([...phones, clean]);
    setNewPhone("");
    showSuccess("Ajouté", `Numéro ${clean} ajouté`);
  };

  const removePhone = async (p: string) => {
    await savePhones(phones.filter(x => x !== p));
    showSuccess("Supprimé", `Numéro ${p} retiré`);
  };

  return (
    <div className="space-y-6">
      {/* Admin Phones Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Smartphone size={16} /> Admin phone numbers</h3>
        <p className="text-[11px] text-muted-foreground">Add administrator phone numbers for support and notifications.</p>

        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Ex: +22670000000"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            className="flex-1 bg-input border border-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={addPhone} className="gradient-button text-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>

        {phones.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No admin numbers registered</p>
        ) : (
          <div className="space-y-2">
            {phones.map((p, i) => (
              <div key={i} className="bg-card rounded-xl border border-secondary px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">{p}</span>
                </div>
                <button onClick={() => removePhone(p)} className="text-destructive hover:opacity-70">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Action history</h3>
        {logs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-10">No actions recorded</p> :
          logs.map(l => (
            <div key={l.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">{l.action}</p>
                  {l.details && <p className="text-[10px] text-muted-foreground">{l.details}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

// ==================== WITHDRAWAL METHODS ====================
const WithdrawalMethodsTab = ({ methods, countries, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WithdrawalMethod | null>(null);
  const [form, setForm] = useState({ name: "", country_id: "", payment_type: "manual", api_provider: "", logo_url: "" });
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const openForm = (m?: WithdrawalMethod) => {
    if (m) { setEditing(m); setForm({ name: m.name, country_id: m.country_id || "", payment_type: m.payment_type || "manual", api_provider: m.api_provider || "", logo_url: m.logo_url || "" }); }
    else { setEditing(null); setForm({ name: "", country_id: "", payment_type: "manual", api_provider: "", logo_url: "" }); }
    setShowForm(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      setForm({ ...form, logo_url: url });
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Error", "Nom requis"); return; }
    if (!form.country_id) { showError("Error", "Country required"); return; }
    const payload = { name: form.name, country_id: form.country_id || null, payment_type: form.payment_type, api_provider: form.api_provider || null, logo_url: form.logo_url || null };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/withdrawal-methods/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/withdrawal-methods", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: methods.length }) });
    showSuccess(editing ? "Updated" : "Created", "");
    setShowForm(false); reload();
  };

  // Group by country
  const activeCountries = countries.filter((c: Country) => c.is_active);

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs text-muted-foreground">
          Manage available withdrawal methods by country. These networks will appear when adding a wallet.
        </p>
      </div>

      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><Plus size={16} /> Add a withdrawal method</button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Edit" : "New"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Orange Money)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />

          <select value={form.country_id} onChange={e => setForm({ ...form, country_id: e.target.value })}
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
            <option value="">-- Select a country --</option>
            {activeCountries.map((c: Country) => <option key={c.id} value={c.id}>{c.name} ({c.country_code})</option>)}
          </select>

          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setForm({ ...form, payment_type: "manual" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.payment_type === "manual" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                Manual
              </button>
              <button onClick={() => setForm({ ...form, payment_type: "api" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.payment_type === "api" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                API (automatic)
              </button>
            </div>
          </div>

          {form.payment_type === "api" && (
            <input value={form.api_provider} onChange={e => setForm({ ...form, api_provider: e.target.value })} placeholder="API provider (e.g. mtn, orange)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          )}

          {/* Logo */}
          <div>
            <label className="text-xs text-muted-foreground">Logo</label>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            {form.logo_url ? (
              <div className="flex items-center gap-3 mt-1">
                <img src={form.logo_url} className="w-10 h-10 rounded-lg object-cover" />
                <button onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive">Delete</button>
              </div>
            ) : (
              <button onClick={() => logoRef.current?.click()} disabled={uploading} className="mt-1 w-full h-12 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {uploading ? "Upload..." : <><UploadIcon size={14} /> Add logo</>}
              </button>
            )}
          </div>

          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Update" : "Create"}</button>
        </div>
      )}

      {/* Group by country */}
      {activeCountries.map((c: Country) => {
        const countryMethods = methods.filter((m: WithdrawalMethod) => m.country_id === c.id);
        if (countryMethods.length === 0 && !showForm) return null;
        return (
          <div key={c.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary/30 border-b border-secondary">
              <p className="text-xs font-bold text-foreground">{c.name} <span className="text-muted-foreground font-normal">({c.country_code})</span></p>
            </div>
            <div className="p-2 space-y-1">
              {countryMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No withdrawal methods</p>
              ) : countryMethods.map((m: WithdrawalMethod) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3">
                    {m.logo_url ? (
                      <img src={m.logo_url} className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Wallet size={12} className="text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.payment_type === "api" ? `API (${m.api_provider || "—"})` : "Manuel"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/withdrawal-methods/${m.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !m.is_active }) }); reload(); }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${m.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{m.is_active ? "ON" : "OFF"}</button>
                    <button onClick={() => openForm(m)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                    <button onClick={async () => { const t = getAuthToken(); const h: HeadersInit = { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; await fetch(`/api/admin/withdrawal-methods/${m.id}`, { method: "DELETE", headers: h }); showSuccess("Supprimé", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== COUNTRIES ====================
const CountriesTab = ({ countries, methods, withdrawalMethods = [], reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);
  const [form, setForm] = useState({ name: "", country_code: "", phone_digits: "8", validation_enabled: true });

  const openForm = (c?: Country) => {
    if (c) { setEditing(c); setForm({ name: c.name, country_code: c.country_code, phone_digits: String((c as any).phone_digits || 8), validation_enabled: (c as any).validation_enabled !== false }); }
    else { setEditing(null); setForm({ name: "", country_code: "+", phone_digits: "8", validation_enabled: true }); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Error", "Nom requis"); return; }
    const payload = { name: form.name, country_code: form.country_code, phone_digits: Number(form.phone_digits) || 8, validation_enabled: form.validation_enabled };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/countries/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/countries", { method: "POST", headers: h, body: JSON.stringify({ ...payload, sort_order: countries.length, api_enabled: true }) });
    showSuccess(editing ? "Country updated" : "Country added", "");
    setShowForm(false); reload();
  };

  const toggleActive = async (c: Country) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/countries/${c.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !c.is_active }) });
    showSuccess(c.is_active ? "Country deactivated" : "Country activated ✅", "");
    reload();
  };

  const toggleApi = async (c: Country) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/countries/${c.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ api_enabled: !(c as any).api_enabled }) });
    showSuccess((c as any).api_enabled ? "API disabled for " + c.name : "API enabled for " + c.name + " ✅", "");
    reload();
  };

  const deleteCountry = async (c: Country) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/countries/${c.id}`, { method: "DELETE", headers: h });
    showSuccess("Country deleted", "");
    reload();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Add a country
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Edit country" : "New country"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Country name" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Dial code</label>
              <input value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })} placeholder="+509" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Required digits</label>
              <input type="number" value={form.phone_digits} onChange={e => setForm({ ...form, phone_digits: e.target.value })} placeholder="8" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Validation</label>
              <button type="button" onClick={() => setForm({ ...form, validation_enabled: !form.validation_enabled })}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${form.validation_enabled ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                {form.validation_enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Update" : "Create"}</button>
        </div>
      )}

      {countries.map((c: Country) => {
        const countryMethods = methods.filter((m: PaymentMethod) => m.country_id === c.id);
        const countryWMethods = withdrawalMethods.filter((m: WithdrawalMethod) => m.country_id === c.id);
        return (
          <div key={c.id} className={`bg-card rounded-xl border overflow-hidden ${c.is_active ? "border-secondary" : "border-secondary opacity-60"}`}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.country_code} · {(c as any).phone_digits || 8} digits {(c as any).validation_enabled !== false ? "" : "(unvalidated)"}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => toggleActive(c)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${c.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{c.is_active ? "ON" : "OFF"}</button>
                  <button onClick={() => openForm(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                  <button onClick={() => deleteCountry(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                </div>
              </div>
              {/* API toggle */}
              <div className="mt-2 pt-2 border-t border-secondary">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">⚡ Payment API</p>
                  <button onClick={() => toggleApi(c)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${(c as any).api_enabled ? "bg-success/20 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {(c as any).api_enabled ? "✅ Enabled" : "❌ Disabled"}
                  </button>
                </div>
              </div>
              {/* Deposit methods */}
              {countryMethods.length > 0 && (
                <div className="mt-2 pt-2 border-t border-secondary">
                  <p className="text-[10px] text-muted-foreground mb-1">💳 Deposit methods:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {countryMethods.map((m: PaymentMethod) => (
                      <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.is_active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {m.name} {m.payment_type === "external" ? "⚡" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Withdrawal methods */}
              {countryWMethods.length > 0 && (
                <div className="mt-2 pt-2 border-t border-secondary">
                  <p className="text-[10px] text-muted-foreground mb-1">📤 Withdrawal methods:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {countryWMethods.map((m: WithdrawalMethod) => (
                      <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                        {m.name} {m.payment_type === "api" ? "⚡" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== VIP CONDITIONS ====================
const VipTab = ({ conditions, reload, showSuccess, showError }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ min_investment: "", min_active_members: "", min_purchases: "", min_products_bought: "", min_team_investment: "", condition_logic: "OR" });
  const [uploading, setUploading] = useState(false);

  const startEdit = (c: VipCondition) => {
    setEditingId(c.id);
    setForm({
      min_investment: String(c.min_investment || 0),
      min_active_members: String(c.min_active_members || 0),
      min_purchases: String(c.min_purchases || 0),
      min_products_bought: String(c.min_products_bought || 0),
      min_team_investment: String(c.min_team_investment || 0),
      condition_logic: c.condition_logic || "OR",
    });
  };

  const save = async () => {
    if (!editingId) return;
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/vip-conditions/${editingId}`, { method: "PATCH", headers: h, body: JSON.stringify({ min_investment: Number(form.min_investment) || 0, min_active_members: Number(form.min_active_members) || 0, min_purchases: Number(form.min_purchases) || 0, min_products_bought: Number(form.min_products_bought) || 0, min_team_investment: Number(form.min_team_investment) || 0, condition_logic: form.condition_logic }) });
    showSuccess("VIP conditions updated", "");
    setEditingId(null);
    reload();
  };

  const uploadImage = async (condId: string, _level: number, file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "site-assets");
      const token = getAuthToken();
      const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      await fetch(`/api/admin/vip-conditions/${condId}`, { method: "PATCH", headers: h, body: JSON.stringify({ image_url: url }) });
      showSuccess("Image VIP ajoutée ✅", "");
      reload();
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (condId: string) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/vip-conditions/${condId}`, { method: "PATCH", headers: h, body: JSON.stringify({ image_url: null }) });
    showSuccess("Image deleted", "");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          Configure conditions for each VIP level. <b>OR</b> logic = one condition is enough. <b>AND</b> = all required.
        </p>
      </div>

      {conditions.map((c: VipCondition) => (
        <div key={c.id} className="bg-card rounded-xl border border-secondary p-4">
          {editingId === c.id ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-primary">{c.level_name}</h3>
                <button onClick={() => setEditingId(null)}><X size={16} className="text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Min. personal invest. (USDT)</label>
                  <input type="number" value={form.min_investment} onChange={e => setForm({ ...form, min_investment: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min. team invest. (USDT)</label>
                  <input type="number" value={form.min_team_investment} onChange={e => setForm({ ...form, min_team_investment: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min. active members</label>
                  <input type="number" value={form.min_active_members} onChange={e => setForm({ ...form, min_active_members: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min. purchases</label>
                  <input type="number" value={form.min_purchases} onChange={e => setForm({ ...form, min_purchases: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min. products bought</label>
                  <input type="number" value={form.min_products_bought} onChange={e => setForm({ ...form, min_products_bought: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Condition logic</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setForm({ ...form, condition_logic: "OR" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${form.condition_logic === "OR" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    OR (one suffices)
                  </button>
                  <button onClick={() => setForm({ ...form, condition_logic: "AND" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${form.condition_logic === "AND" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    AND (all required)
                  </button>
                </div>
              </div>
              <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={14} /> Save
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {c.image_url && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative group">
                      <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(c.id)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={10} className="text-white" />
                      </button>
                    </div>
                  )}
                  <span className="text-sm font-bold text-primary">{c.level_name}</span>
                  <span className="text-[9px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Level {c.level}</span>
                </div>
                <div className="flex gap-1.5">
                  <label className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center cursor-pointer">
                    <ImageIcon size={12} className="text-primary" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImage(c.id, c.level, e.target.files[0]); }} />
                  </label>
                  <button onClick={() => startEdit(c)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Pencil size={12} className="text-primary" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Personal invest.</p>
                  <p className="text-xs font-bold text-foreground">{Number(c.min_investment).toLocaleString("en-US")} USDT</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Team invest.</p>
                  <p className="text-xs font-bold text-foreground">{Number(c.min_team_investment || 0).toLocaleString("en-US")} USDT</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Active members</p>
                  <p className="text-xs font-bold text-foreground">{c.min_active_members}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Min. purchases</p>
                  <p className="text-xs font-bold text-foreground">{c.min_purchases}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Products bought</p>
                  <p className="text-xs font-bold text-foreground">{c.min_products_bought}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Logic: <span className="font-bold text-primary">{c.condition_logic === "AND" ? "AND (all)" : "OR (one suffices)"}</span></p>
            </div>
          )}
        </div>
      ))}
      {uploading && <p className="text-xs text-center text-muted-foreground animate-pulse">Uploading...</p>}
    </div>
  );
};

// ==================== API CONFIGS ====================
const ApiConfigsTab = ({ configs, countries, paymentLogs, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiConfig | null>(null);
  const [form, setForm] = useState({ name: "", provider: "cinetpay", api_key: "", secret_key: "", endpoint_url: "", callback_url: "", mode: "test", country_id: "", notes: "" });
  const [showLogs, setShowLogs] = useState(false);

  const openForm = (c?: ApiConfig) => {
    if (c) {
      setEditing(c);
      setForm({ name: c.name, provider: c.provider, api_key: c.api_key || "", secret_key: c.secret_key || "", endpoint_url: c.endpoint_url || "", callback_url: c.callback_url || "", mode: c.mode, country_id: c.country_id || "", notes: c.notes || "" });
    } else {
      setEditing(null);
      setForm({ name: "", provider: "cinetpay", api_key: "", secret_key: "", endpoint_url: "", callback_url: "", mode: "test", country_id: "", notes: "" });
    }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Error", "Nom requis"); return; }
    const payload = { ...form, country_id: form.country_id || null, api_key: form.api_key || null, secret_key: form.secret_key || null, endpoint_url: form.endpoint_url || null, callback_url: form.callback_url || null, notes: form.notes || null };
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (editing) await fetch(`/api/admin/api-configs/${editing.id}`, { method: "PATCH", headers: h, body: JSON.stringify(payload) });
    else await fetch("/api/admin/api-configs", { method: "POST", headers: h, body: JSON.stringify(payload) });
    showSuccess(editing ? "API updated" : "API added", "");
    setShowForm(false); reload();
  };

  const toggleActive = async (c: ApiConfig) => {
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/api-configs/${c.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ is_active: !c.is_active }) });
    showSuccess(c.is_active ? "API deactivated" : "API activated ⚡", "");
    reload();
  };

  const deleteConfig = async (id: string) => {
    if (!confirm("Delete this API configuration?")) return;
    const token = getAuthToken();
    const h: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    await fetch(`/api/admin/api-configs/${id}`, { method: "DELETE", headers: h });
    showSuccess("Configuration deleted", "");
    reload();
  };

  const getCountryName = (id: string | null) => {
    if (!id) return "All countries";
    const c = countries.find((ct: Country) => ct.id === id);
    return c ? `${c.name} (${c.country_code})` : "—";
  };

  const providers = [
    { value: "sendavapay", label: "SendavaPay" },
    { value: "cinetpay", label: "CinetPay" },
    { value: "fedapay", label: "FedaPay" },
    { value: "paydunia", label: "PayDunia" },
    { value: "flutterwave", label: "Flutterwave" },
    { value: "custom", label: "Custom" },
  ];

  // Auto-fill defaults when provider changes
  const handleProviderChange = (provider: string) => {
    const updates: any = { provider };
    if (provider === "sendavapay") {
      updates.endpoint_url = form.endpoint_url || "https://sendavapay.com";
      updates.callback_url = form.callback_url || `/api/webhooks/sendavapay`;
    }
    setForm({ ...form, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs text-muted-foreground">
          Configure your payment APIs here. Each API can be linked to a specific country and enabled/disabled with one click. API keys are stored securely.
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => openForm()} className="flex-1 gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Add an API
        </button>
        <button onClick={() => setShowLogs(!showLogs)} className={`px-4 py-3 rounded-xl text-sm font-bold ${showLogs ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
          Logs
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between">
            <h3 className="text-sm font-bold text-foreground">{editing ? "Edit API" : "New API"}</h3>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>

          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. CinetPay CI)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />

          <div>
            <label className="text-xs text-muted-foreground">Provider</label>
            <select value={form.provider} onChange={e => handleProviderChange(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
              {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Pays</label>
            <select value={form.country_id} onChange={e => setForm({ ...form, country_id: e.target.value })}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
              <option value="">All countries</option>
              {countries.filter((c: Country) => c.is_active).map((c: Country) => (
                <option key={c.id} value={c.id}>{c.name} ({c.country_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Mode</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setForm({ ...form, mode: "test" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${form.mode === "test" ? "bg-warning/20 text-warning" : "bg-secondary text-muted-foreground"}`}>
                🧪 Test
              </button>
              <button onClick={() => setForm({ ...form, mode: "production" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${form.mode === "production" ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                🚀 Production
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">API Key</label>
            <input type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="API key" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Secret Key</label>
            <input type="password" value={form.secret_key} onChange={e => setForm({ ...form, secret_key: e.target.value })} placeholder="Secret key" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">URL Endpoint</label>
            <input value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })} placeholder="https://api.provider.com/v1/..." className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">URL Callback (webhook)</label>
            <input value={form.callback_url} onChange={e => setForm({ ...form, callback_url: e.target.value })} placeholder="https://votre-site.com/api/callback" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." rows={2} className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none resize-none" />
          </div>

          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Update" : "Create"}</button>
        </div>
      )}

      {/* API Configs list */}
      {(configs || []).length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground text-center py-10">No APIs configured</p>
      ) : (configs || []).map((c: ApiConfig) => (
        <div key={c.id} className={`bg-card rounded-xl border overflow-hidden ${c.is_active ? "border-success/30" : "border-secondary"}`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{c.name}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${c.mode === "production" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                    {c.mode === "production" ? "PROD" : "TEST"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {providers.find(p => p.value === c.provider)?.label || c.provider} • {getCountryName(c.country_id)}
                </p>
                {c.api_key && <p className="text-[10px] text-muted-foreground">🔑 Key: ••••{c.api_key.slice(-4)}</p>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggleActive(c)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${c.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {c.is_active ? "ON" : "OFF"}
                </button>
                <button onClick={() => openForm(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                <button onClick={() => deleteConfig(c.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Payment Logs */}
      {showLogs && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Activity size={14} className="text-primary" /> API payment logs</h3>
          {(paymentLogs || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No logs</p>
          ) : (paymentLogs || []).slice(0, 50).map((log: PaymentLog) => (
            <div key={log.id} className="bg-secondary/30 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{log.amount.toLocaleString()} USDT • {log.phone}</p>
                  <p className="text-[10px] text-muted-foreground">{log.provider_ref || "—"}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    log.status === "completed" ? "bg-success/20 text-success" :
                    log.status === "failed" ? "bg-destructive/20 text-destructive" :
                    "bg-warning/20 text-warning"
                  }`}>{log.status}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {log.created_at ? new Date(log.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              </div>
              {log.error_message && <p className="text-[10px] text-destructive mt-1">{log.error_message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
