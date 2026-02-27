import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminWheelTab from "@/components/AdminWheelTab";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import {
  BarChart3, Users, Download, Upload, Package, CreditCard, Link2,
  MessageSquare, Bell, Settings, Shield, Search, CheckCircle2, XCircle,
  Clock, ArrowDown, Edit2, Trash2, Plus, X, Save, ChevronDown, ChevronUp,
  Layers, Eye, EyeOff, Ban, UserCheck, Pencil, TrendingUp, Activity,
  Globe, ImageIcon, UploadIcon, Bot, Power, ArrowLeft, Send
} from "lucide-react";

// ==================== TYPES ====================
type Profile = {
  id: string; user_id: string; full_name: string | null; phone: string | null;
  balance: number | null; deposit_balance: number | null; earnings_balance: number | null;
  referral_balance: number | null; country_code: string | null; referral_code: string | null;
  is_suspended: boolean | null; created_at: string | null; vip_level: number | null;
};
type Recharge = {
  id: string; phone: string; country_code: string; amount: number;
  transaction_ref: string | null; payment_method: string | null;
  status: string; created_at: string | null; user_id: string;
};
type Withdrawal = {
  id: string; user_id: string; amount: number; fee_amount: number;
  net_amount: number; phone: string; country_code: string; network: string;
  status: string; created_at: string | null;
};
type Series = { id: string; name: string; color: string | null; sort_order: number | null };
type Product = {
  id: string; series_id: string; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  sort_order: number | null; max_purchases: number | null;
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
type Country = { id: string; name: string; country_code: string; flag_emoji: string; is_active: boolean; sort_order: number };
type VipCondition = { id: string; level: number; level_name: string; min_investment: number; min_active_members: number; min_purchases: number; min_products_bought: number; condition_logic: string };
type UserProduct = { id: string; user_id: string; product_id: string; purchased_at: string; is_active: boolean; expires_at: string | null };

// ==================== TABS CONFIG ====================
type Banner = { id: string; image_url: string; link_path: string; sort_order: number; is_active: boolean };

const tabs = [
  { key: "dashboard", icon: BarChart3, label: "Stats" },
  { key: "users", icon: Users, label: "Clients" },
  { key: "deposits", icon: Download, label: "Dépôts" },
  { key: "withdrawals", icon: Upload, label: "Retraits" },
  { key: "products", icon: Package, label: "Produits" },
  { key: "banners", icon: ImageIcon, label: "Bannières" },
  { key: "wheel", icon: Activity, label: "Roue" },
  { key: "countries", icon: Globe, label: "Pays" },
  { key: "payments", icon: CreditCard, label: "Paiement" },
  { key: "links", icon: Link2, label: "Liens" },
  { key: "popups", icon: Bell, label: "Popups" },
  { key: "vip", icon: TrendingUp, label: "Niveaux" },
  { key: "sarah", icon: Bot, label: "Sarah IA" },
  { key: "support", icon: MessageSquare, label: "Support" },
  { key: "settings", icon: Settings, label: "Site" },
  { key: "security", icon: Shield, label: "Sécurité" },
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

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) { showError("Accès refusé", "Droits admin requis"); navigate("/"); return; }
    setAdminId(user.id);
    loadAll();
  };

  const loadAll = async () => {
    const [p, r, w, s, pr, pm, sl, ss, pop, logs, ctrs, vipc, bn] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("recharges").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("product_series").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("payment_methods").select("*").order("sort_order"),
      supabase.from("social_links").select("*"),
      supabase.from("site_settings").select("*"),
      supabase.from("popup_messages").select("*").order("sort_order"),
      supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("countries").select("*").order("sort_order"),
      supabase.from("vip_conditions").select("*").order("level"),
      supabase.from("banners").select("*").order("sort_order"),
    ]);
    if (p.data) setProfiles(p.data as Profile[]);
    if (r.data) setRecharges(r.data);
    if (w.data) setWithdrawals(w.data);
    if (s.data) setSeries(s.data);
    if (pr.data) setProducts(pr.data as Product[]);
    if (pm.data) setPaymentMethods(pm.data as PaymentMethod[]);
    if (sl.data) setSocialLinks(sl.data);
    if (ss.data) setSiteSettings(ss.data);
    if (pop.data) setPopups(pop.data as unknown as PopupMsg[]);
    if (logs.data) setAdminLogs(logs.data);
    if (ctrs.data) setCountries(ctrs.data as Country[]);
    if (vipc.data) setVipConditions(vipc.data as VipCondition[]);
    if (bn.data) setBanners(bn.data as Banner[]);
    setLoading(false);
  };

  const logAction = async (action: string, target_type?: string, target_id?: string, details?: string) => {
    await supabase.from("admin_logs").insert({ admin_id: adminId, action, target_type, target_id, details });
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Administration" showBack />

      {/* Tab icons grid - like reference */}
      <div className="px-4 pt-4">
        <div className="bg-card rounded-xl border border-secondary p-3">
          <div className="grid grid-cols-5 gap-2">
            {tabs.map(t => (
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
        {activeTab === "countries" && <CountriesTab countries={countries} methods={paymentMethods} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "wheel" && <AdminWheelTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} showError={showError} logAction={logAction} adminId={adminId} />}
        {activeTab === "payments" && <PaymentsTab methods={paymentMethods} countries={countries} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "links" && <LinksTab links={socialLinks} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "popups" && <PopupsTab popups={popups} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "vip" && <VipTab conditions={vipConditions} reload={loadAll} showSuccess={showSuccess} showError={showError} />}
        {activeTab === "sarah" && <SarahTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "support" && <SupportTab adminId={adminId} />}
        {activeTab === "settings" && <SettingsTab settings={siteSettings} reload={loadAll} showSuccess={showSuccess} />}
        {activeTab === "security" && <SecurityTab logs={adminLogs} />}
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
    { label: "Utilisateurs", value: totalUsers, color: "text-primary" },
    { label: "Nouveaux aujourd'hui", value: activeToday, color: "text-primary" },
    { label: "Total dépôts", value: `${totalDeposits.toLocaleString("fr-FR")}`, color: "text-success" },
    { label: "Total retraits", value: `${totalWithdrawals.toLocaleString("fr-FR")}`, color: "text-destructive" },
    { label: "Soldes cumulés", value: `${totalBalance.toLocaleString("fr-FR")}`, color: "text-primary" },
    { label: "Produits actifs", value: activeProducts, color: "text-primary" },
    { label: "Dépôts en attente", value: pendingDeposits, color: "text-warning" },
    { label: "Retraits en attente", value: pendingWithdrawals, color: "text-warning" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-secondary p-4">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
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
  const [editName, setEditName] = useState("");
  const [editVipLevel, setEditVipLevel] = useState("0");
  const [detailUser, setDetailUser] = useState<Profile | null>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<{b: Profile[], c: Profile[], d: Profile[]}>({ b: [], c: [], d: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = profiles.filter((p: Profile) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s)) || (p.phone?.toLowerCase().includes(s)) || p.user_id.includes(s);
  });

  const saveUser = async () => {
    if (!editingUser) return;
    await supabase.from("profiles").update({
      full_name: editName,
      balance: Number(editBalance) || 0,
      vip_level: Number(editVipLevel) || 0,
    }).eq("id", editingUser.id);
    logAction("edit_user", "profile", editingUser.id, `Balance: ${editBalance}, VIP: ${editVipLevel}, Name: ${editName}`);
    showSuccess("Utilisateur modifié", "Modifications enregistrées ✅");
    setEditingUser(null);
    reload();
  };

  const toggleSuspend = async (p: Profile) => {
    const newVal = !p.is_suspended;
    await supabase.from("profiles").update({ is_suspended: newVal }).eq("id", p.id);
    logAction(newVal ? "suspend_user" : "unsuspend_user", "profile", p.id);
    showSuccess(newVal ? "Compte suspendu" : "Compte réactivé", "");
    reload();
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`Supprimer définitivement ${p.full_name || p.phone} ?`)) return;
    // Delete user products, then profile (cascade will handle some)
    await supabase.from("user_products").delete().eq("user_id", p.user_id);
    await supabase.from("chat_messages").delete().eq("user_id", p.user_id);
    await supabase.from("profiles").delete().eq("id", p.id);
    logAction("delete_user", "profile", p.id, p.full_name || p.phone || "");
    showSuccess("Compte supprimé", "L'utilisateur a été supprimé définitivement");
    reload();
  };

  const loadUserDetail = async (p: Profile) => {
    setDetailUser(p);
    setLoadingDetail(true);
    // Load user's purchased products
    const { data: up } = await supabase.from("user_products").select("*, products(name, price, daily_revenue, cycles)").eq("user_id", p.user_id);
    setUserProducts(up || []);

    // Load team members (3 levels)
    const { data: levelB } = await supabase.from("profiles").select("*").eq("referred_by", p.id);
    const bIds = (levelB || []).map((m: Profile) => m.id);
    let levelC: Profile[] = [];
    let levelD: Profile[] = [];
    if (bIds.length > 0) {
      const { data: lc } = await supabase.from("profiles").select("*").in("referred_by", bIds);
      levelC = (lc || []) as Profile[];
      const cIds = levelC.map(m => m.id);
      if (cIds.length > 0) {
        const { data: ld } = await supabase.from("profiles").select("*").in("referred_by", cIds);
        levelD = (ld || []) as Profile[];
      }
    }
    setTeamMembers({ b: (levelB || []) as Profile[], c: levelC, d: levelD });
    setLoadingDetail(false);
  };

  const removeUserProduct = async (upId: string) => {
    await supabase.from("user_products").delete().eq("id", upId);
    if (detailUser) loadUserDetail(detailUser);
    showSuccess("Produit retiré", "");
  };

  const addProductToUser = async (productId: string) => {
    if (!detailUser) return;
    await supabase.from("user_products").insert({ user_id: detailUser.user_id, product_id: productId, is_active: true });
    loadUserDetail(detailUser);
    showSuccess("Produit ajouté", "");
  };

  // Detail view
  if (detailUser) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetailUser(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="bg-card rounded-xl border border-secondary p-4">
          <p className="text-sm font-bold text-foreground">{detailUser.full_name || "Sans nom"}</p>
          <p className="text-xs text-muted-foreground">{detailUser.country_code} {detailUser.phone}</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><p className="text-[10px] text-muted-foreground">Solde total</p><p className="text-xs font-bold text-primary">{(detailUser.balance || 0).toLocaleString("fr-FR")} F</p></div>
            <div><p className="text-[10px] text-muted-foreground">Niveau</p><p className="text-xs font-bold text-foreground">VIP{detailUser.vip_level || 0}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Dépôt</p><p className="text-xs font-bold text-foreground">{(detailUser.deposit_balance || 0).toLocaleString("fr-FR")} F</p></div>
            <div><p className="text-[10px] text-muted-foreground">Gains</p><p className="text-xs font-bold text-success">{(detailUser.earnings_balance || 0).toLocaleString("fr-FR")} F</p></div>
            <div><p className="text-[10px] text-muted-foreground">Parrainage</p><p className="text-xs font-bold text-primary">{(detailUser.referral_balance || 0).toLocaleString("fr-FR")} F</p></div>
            <div><p className="text-[10px] text-muted-foreground">Code</p><p className="text-xs font-semibold text-foreground">{detailUser.referral_code || "—"}</p></div>
          </div>
        </div>

        {loadingDetail ? <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p> : (
          <>
            {/* User Products */}
            <div className="bg-card rounded-xl border border-secondary p-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3">PRODUITS ACTIFS ({userProducts.length})</h4>
              {userProducts.length === 0 ? <p className="text-xs text-muted-foreground">Aucun produit</p> :
                userProducts.map((up: any) => (
                  <div key={up.id} className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{up.products?.name || "Produit"}</p>
                      <p className="text-[10px] text-muted-foreground">{Number(up.products?.price || 0).toLocaleString()} F • {up.products?.daily_revenue} F/jour</p>
                    </div>
                    <button onClick={() => removeUserProduct(up.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                  </div>
                ))}
              {/* Add product */}
              <div className="mt-3">
                <select onChange={(e) => { if (e.target.value) addProductToUser(e.target.value); e.target.value = ""; }}
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-xs border border-secondary outline-none">
                  <option value="">+ Ajouter un produit...</option>
                  {products.filter((pr: Product) => pr.is_active).map((pr: Product) => (
                    <option key={pr.id} value={pr.id}>{pr.name} — {Number(pr.price).toLocaleString()} F</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-card rounded-xl border border-secondary p-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3">ÉQUIPE</h4>
              {[
                { label: "Niveau B (directs)", members: teamMembers.b },
                { label: "Niveau C", members: teamMembers.c },
                { label: "Niveau D", members: teamMembers.d },
              ].map(level => (
                <div key={level.label} className="mb-3">
                  <p className="text-xs font-semibold text-foreground mb-1">{level.label} ({level.members.length})</p>
                  {level.members.length === 0 ? <p className="text-[10px] text-muted-foreground ml-2">Aucun</p> :
                    level.members.map((m: Profile) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 ml-2">
                        <p className="text-xs text-foreground">{m.full_name || m.phone || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{(m.balance || 0).toLocaleString()} F</p>
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
            <h3 className="text-sm font-bold text-foreground">Modifier l'utilisateur</h3>
            <button onClick={() => setEditingUser(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nom</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Solde (FCFA)</label>
            <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Niveau VIP</label>
            <select value={editVipLevel} onChange={e => setEditVipLevel(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none">
              {[0,1,2,3,4,5].map(v => <option key={v} value={v}>VIP{v}</option>)}
            </select>
          </div>
          <button onClick={saveUser} className="w-full gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <Save size={14} /> Sauvegarder
          </button>
        </div>
      )}

      {filtered.map((p: Profile) => (
        <div key={p.id} className={`bg-card rounded-xl border overflow-hidden ${p.is_suspended ? "border-destructive/50 opacity-70" : "border-secondary"}`}>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">{p.full_name || "Sans nom"}</p>
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
                <p className="text-xs font-bold text-primary">{(p.balance || 0).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Code parrainage</p>
                <p className="text-xs font-semibold text-foreground">{p.referral_code || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Inscription</p>
                <p className="text-xs text-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => loadUserDetail(p)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-secondary text-foreground font-semibold py-2 rounded-xl text-xs hover:bg-secondary transition-colors">
                <Eye size={12} /> Détails
              </button>
              <button onClick={() => { setEditingUser(p); setEditBalance(String(p.balance || 0)); setEditName(p.full_name || ""); setEditVipLevel(String(p.vip_level || 0)); }}
                className="flex-1 flex items-center justify-center gap-1.5 border border-primary text-primary font-semibold py-2 rounded-xl text-xs hover:bg-primary/10 transition-colors">
                <Edit2 size={12} /> Modifier
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
                <Trash2 size={12} /> Supprimer
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
    await supabase.from("recharges").update({ status }).eq("id", r.id);
    if (status === "approved") {
      const p = profileMap[r.user_id];
      if (p) await supabase.from("profiles").update({
        balance: (p.balance || 0) + r.amount,
        deposit_balance: (p.deposit_balance || 0) + r.amount,
      }).eq("user_id", r.user_id);
    }
    logAction(`deposit_${status}`, "recharge", r.id, `${r.amount} FCFA`);
    showSuccess(status === "approved" ? "Dépôt approuvé ✅" : "Dépôt refusé ❌", "");
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

      {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">Aucun dépôt</p> :
        filtered.map((r: Recharge) => {
          const p = profileMap[r.user_id];
          return (
            <div key={r.id} className="bg-card rounded-xl border border-secondary px-4 pt-4 pb-3">
              <div className="flex items-start justify-between mb-2">
                <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("fr-FR")} FCFA</p>
                <StatusBadge status={r.status} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <CreditCard size={12} /> {(r.payment_method || "Mobile Money").toUpperCase()}
              </div>
              <div className="border-t border-secondary my-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                <div><p className="text-[10px] text-muted-foreground">Client</p><p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Solde actuel</p><p className="text-xs font-semibold text-foreground">{p ? `${(p.balance || 0).toLocaleString("fr-FR")} FCFA` : "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Référence</p><p className="text-xs font-semibold text-foreground font-mono">{r.transaction_ref || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Date</p><p className="text-xs font-semibold text-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
              </div>
              {r.status === "pending" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10"><CheckCircle2 size={16} /> Approuver</button>
                  <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10"><XCircle size={16} /> Rejeter</button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

// ==================== WITHDRAWALS ====================
const WithdrawalsTab = ({ withdrawals, profiles, reload, showSuccess, showError, logAction }: any) => {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const profileMap: Record<string, Profile> = {};
  profiles.forEach((p: Profile) => { profileMap[p.user_id] = p; });

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

  const handleAction = async (w: Withdrawal, status: "approved" | "rejected") => {
    await supabase.from("withdrawals").update({ status }).eq("id", w.id);
    if (status === "approved") {
      const p = profileMap[w.user_id];
      if (p) {
        // Debit from earnings first, then referral
        let remaining = w.amount;
        let newEarnings = p.earnings_balance || 0;
        let newReferral = p.referral_balance || 0;
        const debitEarnings = Math.min(newEarnings, remaining);
        newEarnings -= debitEarnings;
        remaining -= debitEarnings;
        if (remaining > 0) {
          const debitReferral = Math.min(newReferral, remaining);
          newReferral -= debitReferral;
        }
        await supabase.from("profiles").update({
          balance: Math.max(0, (p.balance || 0) - w.amount),
          earnings_balance: Math.max(0, newEarnings),
          referral_balance: Math.max(0, newReferral),
        }).eq("user_id", w.user_id);
      }
    }
    logAction(`withdrawal_${status}`, "withdrawal", w.id, `${w.amount} FCFA`);
    showSuccess(status === "approved" ? "Retrait approuvé ✅" : "Retrait refusé ❌", "");
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

      {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">Aucun retrait</p> :
        filtered.map((w: Withdrawal) => {
          const p = profileMap[w.user_id];
          const feePercent = w.amount > 0 ? Math.round((w.fee_amount / w.amount) * 100) : 0;
          return (
            <div key={w.id} className="bg-card rounded-xl border border-secondary px-4 pt-4 pb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg font-bold text-foreground">{w.amount.toLocaleString("fr-FR")} FCFA</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ArrowDown size={12} className="text-success" />
                    <span className="text-sm font-semibold text-success">Net : {w.net_amount.toLocaleString("fr-FR")} FCFA</span>
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
                <div><p className="text-[10px] text-muted-foreground">Client</p><p className="text-xs font-semibold text-foreground">{w.country_code} {w.phone}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Solde actuel</p><p className="text-xs font-semibold text-foreground">{p ? `${(p.balance || 0).toLocaleString("fr-FR")} FCFA` : "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Nom</p><p className="text-xs font-semibold text-foreground">{p?.full_name || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Date</p><p className="text-xs font-semibold text-foreground">{w.created_at ? new Date(w.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
              </div>
              {w.status === "pending" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => handleAction(w, "approved")} className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10"><CheckCircle2 size={16} /> Approuver</button>
                  <button onClick={() => handleAction(w, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10"><XCircle size={16} /> Rejeter</button>
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
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openProductForm = (seriesId: string, p?: Product) => {
    setFormSeriesId(seriesId);
    if (p) {
      setEditingProduct(p);
      setForm({ name: p.name, image_url: p.image_url || "", return_percent: String(p.return_percent || 0), total_revenue: String(p.total_revenue || 0), daily_revenue: String(p.daily_revenue || 0), cycles: String(p.cycles || 365), price: String(p.price || 0), is_new: p.is_new || false, max_purchases: p.max_purchases ? String(p.max_purchases) : "", description: (p as any).description || "" });
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
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) { showError("Erreur", "Impossible d'uploader"); setUploading(false); return; }
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    setForm({ ...form, image_url: data.publicUrl });
    setUploading(false);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { showError("Erreur", "Nom requis"); return; }
    const payload: any = {
      series_id: formSeriesId, name: form.name, image_url: form.image_url || null,
      return_percent: Number(form.return_percent) || 0, total_revenue: Number(form.total_revenue) || 0,
      daily_revenue: Number(form.daily_revenue) || 0, cycles: Number(form.cycles) || 365,
      price: Number(form.price) || 0, is_new: form.is_new,
      max_purchases: form.max_purchases ? Number(form.max_purchases) : null,
      description: form.description || null,
    };
    if (editingProduct) await supabase.from("products").update(payload).eq("id", editingProduct.id);
    else await supabase.from("products").insert({ ...payload, sort_order: products.filter((p: Product) => p.series_id === formSeriesId).length });
    showSuccess(editingProduct ? "Produit modifié ✅" : "Produit créé ✅", "");
    setShowForm(false); reload();
  };

  const saveSeries = async () => {
    if (!seriesName.trim()) return;
    if (editingSeries) await supabase.from("product_series").update({ name: seriesName, color: seriesColor }).eq("id", editingSeries.id);
    else await supabase.from("product_series").insert({ name: seriesName, color: seriesColor, sort_order: series.length });
    showSuccess(editingSeries ? "Série modifiée ✅" : "Série créée ✅", "");
    setShowSeriesForm(false); reload();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => { setEditingSeries(null); setSeriesName(""); setSeriesColor("primary"); setShowSeriesForm(true); setShowForm(false); }}
        className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Layers size={16} /> Ajouter une série
      </button>

      {showSeriesForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editingSeries ? "Modifier série" : "Nouvelle série"}</h3><button onClick={() => setShowSeriesForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="Nom" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
          <div className="flex gap-2">{colorOptions.map(c => (<button key={c.value} onClick={() => setSeriesColor(c.value)} className={`w-8 h-8 rounded-full ${c.css} border-2 ${seriesColor === c.value ? "border-foreground scale-110" : "border-transparent"}`} />))}</div>
          <button onClick={saveSeries} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editingSeries ? "Modifier" : "Créer"}</button>
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editingProduct ? "Modifier produit" : "Nouveau produit"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          {form.image_url ? (
            <div className="relative h-28 rounded-xl overflow-hidden border border-secondary">
              <img src={form.image_url} className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full h-20 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {uploading ? "Upload..." : <><UploadIcon size={16} /> Ajouter image</>}
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Prix</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Retour (%)</label><input type="number" value={form.return_percent} onChange={e => setForm({ ...form, return_percent: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Revenu total</label><input type="number" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Revenu quotidien</label><input type="number" value={form.daily_revenue} onChange={e => setForm({ ...form, daily_revenue: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Cycles</label><input type="number" value={form.cycles} onChange={e => setForm({ ...form, cycles: e.target.value })} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Achats max</label><input type="number" value={form.max_purchases} onChange={e => setForm({ ...form, max_purchases: e.target.value })} placeholder="Illimité" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" /></div>
            <label className="flex items-center gap-2 self-end pb-1"><input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} className="accent-primary" /><span className="text-xs">Nouveau</span></label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description du produit</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Informations détaillées sur le produit..." rows={3}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none mt-1" />
          </div>
          <button onClick={saveProduct} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editingProduct ? "Modifier" : "Créer"}</button>
        </div>
      )}

      {series.map((s: Series) => {
        const sp = products.filter((p: Product) => p.series_id === s.id);
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
                <button onClick={() => { setEditingSeries(s); setSeriesName(s.name); setSeriesColor(s.color || "primary"); setShowSeriesForm(true); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                <button onClick={async () => { await supabase.from("product_series").delete().eq("id", s.id); showSuccess("Supprimé", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-secondary px-4 py-3 space-y-2">
                {sp.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">Aucun produit</p> :
                  sp.map((p: Product) => (
                    <div key={p.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${p.is_active ? "bg-secondary/50" : "bg-secondary/20 opacity-60"}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{p.name}</span>
                          {p.is_new && <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} FCFA • {p.return_percent}%</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={async () => { await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id); reload(); }} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${p.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{p.is_active ? "ON" : "OFF"}</button>
                        <button onClick={() => openProductForm(s.id, p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                        <button onClick={async () => { await supabase.from("products").delete().eq("id", p.id); showSuccess("Supprimé", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                <button onClick={() => openProductForm(s.id)} className="w-full bg-secondary text-foreground font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"><Plus size={14} /> Ajouter un produit</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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
    const ext = file.name.split('.').pop();
    const fileName = `banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(fileName, file);
    if (error) { showError("Erreur", "Upload impossible"); setUploading(false); return; }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
    await supabase.from("banners").insert({ image_url: data.publicUrl, link_path: "/", sort_order: banners.length });
    showSuccess("Bannière ajoutée ✅", "");
    setUploading(false);
    reload();
  };

  const deleteBanner = async (id: string) => {
    await supabase.from("banners").delete().eq("id", id);
    showSuccess("Bannière supprimée", "");
    reload();
  };

  const toggleBanner = async (b: Banner) => {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    reload();
  };

  const updateLink = async (id: string) => {
    await supabase.from("banners").update({ link_path: linkPath }).eq("id", id);
    showSuccess("Lien mis à jour ✅", "");
    setEditingBanner(null);
    reload();
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <UploadIcon size={16} /> {uploading ? "Upload en cours..." : "Ajouter une bannière"}
      </button>

      {banners.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">Aucune bannière</p>
      ) : banners.map((b: Banner) => (
        <div key={b.id} className={`bg-card rounded-xl border overflow-hidden ${b.is_active ? "border-secondary" : "border-secondary opacity-60"}`}>
          <img src={b.image_url} alt="Bannière" className="w-full h-32 object-cover" />
          <div className="px-3 py-2">
            {editingBanner?.id === b.id ? (
              <div className="space-y-2">
                <input value={linkPath} onChange={e => setLinkPath(e.target.value)} placeholder="Lien (ex: /loterie)"
                  className="w-full bg-secondary text-foreground rounded-xl px-3 py-2 text-sm border border-secondary outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => updateLink(b.id)} className="flex-1 gradient-button text-primary-foreground text-xs font-bold py-2 rounded-xl">Sauver</button>
                  <button onClick={() => setEditingBanner(null)} className="flex-1 bg-secondary text-foreground text-xs font-bold py-2 rounded-xl">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Lien: {b.link_path}</p>
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
const PaymentsTab = ({ methods, countries, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", country: "Burkina Faso", phone: "", holder_name: "", instructions: "", country_id: "", payment_type: "manual", external_url: "", logo_url: "" });
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const openForm = (m?: PaymentMethod) => {
    if (m) { setEditing(m); setForm({ name: m.name, country: m.country, phone: m.phone || "", holder_name: m.holder_name || "", instructions: m.instructions || "", country_id: m.country_id || "", payment_type: m.payment_type || "manual", external_url: m.external_url || "", logo_url: m.logo_url || "" }); }
    else { setEditing(null); setForm({ name: "", country: "Burkina Faso", phone: "", holder_name: "", instructions: "", country_id: "", payment_type: "manual", external_url: "", logo_url: "" }); }
    setShowForm(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `payment-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(fileName, file);
    if (error) { showError("Erreur", "Upload impossible"); setUploading(false); return; }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
    setForm({ ...form, logo_url: data.publicUrl });
    setUploading(false);
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Erreur", "Nom requis"); return; }
    const payload = { ...form, country_id: form.country_id || null, external_url: form.external_url || null, logo_url: form.logo_url || null };
    if (editing) await supabase.from("payment_methods").update(payload).eq("id", editing.id);
    else await supabase.from("payment_methods").insert({ ...payload, sort_order: methods.length });
    showSuccess(editing ? "Modifie" : "Cree", "");
    setShowForm(false); reload();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><Plus size={16} /> Ajouter un moyen de paiement</button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Modifier" : "Nouveau"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom (ex: Orange Money)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />

          {/* Payment type */}
          <div>
            <label className="text-xs text-muted-foreground">Type de paiement</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setForm({ ...form, payment_type: "manual" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.payment_type === "manual" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                Manuel
              </button>
              <button onClick={() => setForm({ ...form, payment_type: "external" })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.payment_type === "external" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                Lien externe
              </button>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label className="text-xs text-muted-foreground">Logo</label>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            {form.logo_url ? (
              <div className="flex items-center gap-3 mt-1">
                <img src={form.logo_url} className="w-10 h-10 rounded-lg object-cover" />
                <button onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive">Supprimer</button>
              </div>
            ) : (
              <button onClick={() => logoRef.current?.click()} disabled={uploading} className="mt-1 w-full h-12 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {uploading ? "Upload..." : <><UploadIcon size={14} /> Ajouter logo</>}
              </button>
            )}
          </div>

          <select value={form.country_id} onChange={e => { const c = countries.find((ct: Country) => ct.id === e.target.value); setForm({ ...form, country_id: e.target.value, country: c?.name || form.country }); }}
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none">
            <option value="">-- Selectionner un pays --</option>
            {countries.filter((c: Country) => c.is_active).map((c: Country) => <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>)}
          </select>

          {form.payment_type === "manual" ? (
            <>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Numero" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
              <input value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} placeholder="Nom du beneficiaire" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
              <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Instructions de paiement" rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none resize-none" />
            </>
          ) : (
            <input value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} placeholder="URL de paiement externe (https://...)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          )}

          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Modifier" : "Creer"}</button>
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
                <p className="text-xs text-muted-foreground">{m.country} {m.payment_type === "external" ? "• Lien externe" : `• ${m.phone || "—"}`}</p>
                {m.holder_name && <p className="text-xs text-muted-foreground">{m.holder_name}</p>}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={async () => { await supabase.from("payment_methods").update({ is_active: !m.is_active }).eq("id", m.id); reload(); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${m.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{m.is_active ? "ON" : "OFF"}</button>
              <button onClick={() => openForm(m)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
              <button onClick={async () => { await supabase.from("payment_methods").delete().eq("id", m.id); showSuccess("Supprime", ""); reload(); }} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
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
    await supabase.from("social_links").update({ url: editUrl }).eq("id", id);
    showSuccess("Lien mis à jour ✅", "");
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
                <button onClick={() => save(l.id)} className="flex-1 gradient-button text-primary-foreground text-sm font-bold py-2 rounded-xl flex items-center justify-center gap-1"><Save size={12} /> Sauver</button>
                <button onClick={() => setEditId(null)} className="flex-1 bg-secondary text-foreground text-sm font-bold py-2 rounded-xl">Annuler</button>
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
const PopupsTab = ({ popups, reload, showSuccess, showError }: any) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PopupMsg>>({});

  const save = async () => {
    if (!editing) return;
    await supabase.from("popup_messages").update({ title: form.title, message: form.message, button_confirm: form.button_confirm, button_cancel: form.button_cancel || null, is_active: form.is_active }).eq("id", editing);
    showSuccess("Sauvegardé ✅", "");
    setEditing(null); reload();
  };

  return (
    <div className="space-y-3">
      {popups.map((m: PopupMsg) => (
        <div key={m.id} className="bg-card rounded-xl border border-secondary p-4">
          {editing === m.id ? (
            <div className="space-y-3">
              <p className="text-xs font-mono text-primary">{m.trigger_key}</p>
              <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titre" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              <textarea value={form.message || ""} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.button_confirm || ""} onChange={e => setForm({ ...form, button_confirm: e.target.value })} placeholder="Bouton OK" className="bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                <input value={form.button_cancel || ""} onChange={e => setForm({ ...form, button_cancel: e.target.value })} placeholder="Bouton Annuler" className="bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 gradient-button text-primary-foreground text-sm font-bold py-2.5 rounded-xl"><Save size={14} /> Sauver</button>
                <button onClick={() => setEditing(null)} className="flex-1 bg-secondary text-foreground text-sm font-bold py-2.5 rounded-xl">Annuler</button>
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
                <button onClick={async () => { await supabase.from("popup_messages").update({ is_active: !m.is_active }).eq("id", m.id); reload(); }}
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMsg;
          // Refresh conversations list
          loadConversations();
          // If viewing this user's chat, add message
          if (msg.user_id === selectedUserId && msg.sender === "user") {
            setChatMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId]);

  const loadConversations = async () => {
    // Get all chat messages grouped by user
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!msgs) { setLoading(false); return; }

    // Group by user_id
    const userMap: Record<string, ChatMsg[]> = {};
    msgs.forEach((m: any) => {
      if (!userMap[m.user_id]) userMap[m.user_id] = [];
      userMap[m.user_id].push(m);
    });

    // Get profiles for these users
    const userIds = Object.keys(userMap);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const convos: ChatConversation[] = userIds.map((uid) => {
      const userMsgs = userMap[uid];
      const lastMsg = userMsgs[0]; // already sorted desc
      const profile = profileMap[uid];
      const unread = userMsgs.filter((m) => m.sender === "user").length; // simplified
      return {
        user_id: uid,
        full_name: profile?.full_name || "Utilisateur",
        phone: profile?.phone || "",
        last_message: lastMsg.message,
        last_time: lastMsg.created_at,
        unread_count: unread,
      };
    }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

    setConversations(convos);
    setLoading(false);
  };

  const loadMessages = async (uid: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setChatMessages(data || []);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUserId) return;
    setSending(true);
    const { data: inserted } = await supabase
      .from("chat_messages")
      .insert({
        user_id: selectedUserId,
        sender: "support",
        message: replyText.trim(),
        is_ai: false,
      })
      .select()
      .single();

    if (inserted) {
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
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) return <p className="text-xs text-muted-foreground text-center py-10">Chargement...</p>;

  // Chat view
  if (selectedUserId) {
    const convo = conversations.find((c) => c.user_id === selectedUserId);
    return (
      <div className="space-y-3">
        <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
          <ArrowLeft size={16} /> Retour aux conversations
        </button>

        <div className="bg-card rounded-xl border border-secondary p-3">
          <p className="text-sm font-bold text-foreground">{convo?.full_name || "Utilisateur"}</p>
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
            placeholder="Répondre au client..."
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
        <p className="text-xs text-muted-foreground text-center py-10">Aucune conversation</p>
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

// ==================== SARAH IA ====================
const SarahTab = ({ settings, reload, showSuccess }: any) => {
  const sarahSetting = settings.find((s: SiteSetting) => s.key === "sarah_enabled");
  const isEnabled = sarahSetting?.value === "true";

  const toggle = async () => {
    const newVal = isEnabled ? "false" : "true";
    await supabase.from("site_settings").update({ value: newVal }).eq("key", "sarah_enabled");
    showSuccess(
      newVal === "true" ? "Sarah activée ✅" : "Sarah désactivée",
      newVal === "true" ? "L'IA prend le contrôle du chat" : "Le support humain est actif"
    );
    reload();
  };

  return (
    <div className="space-y-4">
      {/* Toggle principal */}
      <div className="bg-card rounded-xl border border-secondary p-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isEnabled ? "bg-success/20" : "bg-secondary"}`}>
            <Bot size={28} className={isEnabled ? "text-success" : "text-muted-foreground"} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">Assistante Sarah</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEnabled ? "Sarah répond aux messages des utilisateurs" : "Le support est géré manuellement"}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          className={`w-full mt-4 flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all ${
            isEnabled
              ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
              : "gradient-button text-primary-foreground"
          }`}
        >
          <Power size={16} />
          {isEnabled ? "Désactiver Sarah" : "Activer Sarah"}
        </button>
      </div>

      {/* Statut */}
      <div className="bg-card rounded-xl border border-secondary p-4">
        <h4 className="text-xs font-bold text-muted-foreground mb-3">STATUT</h4>
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
        </div>
      </div>

      {/* Capacités */}
      <div className="bg-card rounded-xl border border-secondary p-4">
        <h4 className="text-xs font-bold text-muted-foreground mb-3">CAPACITÉS DE SARAH</h4>
        <div className="space-y-2">
          {[
            "Répond aux questions sur les produits",
            "Explique le système VIP",
            "Informe sur les frais et délais",
            "Rassure les utilisateurs en attente",
            "Utilise les données du site en temps réel",
            "Transfère à l'humain si nécessaire",
          ].map((cap, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span className="text-xs text-foreground">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          💡 Quand Sarah est activée, elle utilise automatiquement les paramètres du site (frais, seuils VIP, produits) pour répondre aux utilisateurs dans le chat support.
        </p>
      </div>
    </div>
  );
};

// ==================== SETTINGS ====================
const SettingsTab = ({ settings, reload, showSuccess }: any) => {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const getValue = (key: string) => edits[key] ?? settings.find((s: SiteSetting) => s.key === key)?.value ?? "";
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  const saveAll = async () => {
    for (const [key, value] of Object.entries(edits)) {
      const existing = settings.find((s: SiteSetting) => s.key === key);
      if (existing) {
        await supabase.from("site_settings").update({ value }).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value, category: "finance" });
      }
    }
    showSuccess("Paramètres sauvegardés ✅", "");
    setEdits({});
    reload();
  };

  const groups: Record<string, { label: string; keys: { key: string; label: string }[] }> = {
    general: { label: "General", keys: [{ key: "site_name", label: "Nom du site" }, { key: "welcome_text", label: "Texte d'accueil" }, { key: "terms_url", label: "URL Conditions generales" }] },
    deposit: { label: "Depot", keys: [
      { key: "deposit_amounts", label: "Montants predéfinis (separes par virgules)" },
      { key: "deposit_min", label: "Depot minimum (FCFA)" },
      { key: "deposit_max", label: "Depot maximum (FCFA)" },
      { key: "deposit_rules", label: "Regles (separees par |, {min} et {max} dynamiques)" },
      { key: "require_screenshot", label: "Exiger capture (true/false)" },
    ]},
    withdrawal: { label: "Retrait", keys: [
      { key: "withdrawal_amounts", label: "Montants predéfinis (separes par virgules)" },
      { key: "withdrawal_min", label: "Retrait minimum (FCFA)" },
      { key: "withdrawal_max", label: "Retrait maximum (FCFA)" },
      { key: "withdrawal_fee_percent", label: "Frais de retrait (%)" },
      { key: "withdrawal_rules", label: "Regles (separees par |, {min} {max} {fee} dynamiques)" },
    ]},
    referral: { label: "Bonus Parrainage", keys: [{ key: "referral_bonus_level_b", label: "Niveau B - Parrain direct (%)" }, { key: "referral_bonus_level_c", label: "Niveau C - 2eme niveau (%)" }, { key: "referral_bonus_level_d", label: "Niveau D - 3eme niveau (%)" }] },
    vip: { label: "Seuils VIP", keys: [{ key: "vip_threshold_1", label: "VIP1 (FCFA)" }, { key: "vip_threshold_2", label: "VIP2 (FCFA)" }, { key: "vip_threshold_3", label: "VIP3 (FCFA)" }, { key: "vip_threshold_4", label: "VIP4 (FCFA)" }, { key: "vip_threshold_5", label: "VIP5 (FCFA)" }] },
  };

  return (
    <div className="space-y-4">
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
          <Save size={16} /> Sauvegarder les paramètres
        </button>
      )}
    </div>
  );
};

// ==================== SECURITY ====================
const SecurityTab = ({ logs }: { logs: AdminLog[] }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-bold text-foreground">Historique des actions</h3>
    {logs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-10">Aucune action enregistrée</p> :
      logs.map(l => (
        <div key={l.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">{l.action}</p>
              {l.details && <p className="text-[10px] text-muted-foreground">{l.details}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
          </div>
        </div>
      ))}
  </div>
);

// ==================== COUNTRIES ====================
const CountriesTab = ({ countries, methods, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);
  const [form, setForm] = useState({ name: "", country_code: "", flag_emoji: "🏳️", phone_digits: "8", validation_enabled: true });

  const openForm = (c?: Country) => {
    if (c) { setEditing(c); setForm({ name: c.name, country_code: c.country_code, flag_emoji: c.flag_emoji, phone_digits: String((c as any).phone_digits || 8), validation_enabled: (c as any).validation_enabled !== false }); }
    else { setEditing(null); setForm({ name: "", country_code: "+", flag_emoji: "🏳️", phone_digits: "8", validation_enabled: true }); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showError("Erreur", "Nom requis"); return; }
    const payload = { name: form.name, country_code: form.country_code, flag_emoji: form.flag_emoji, phone_digits: Number(form.phone_digits) || 8, validation_enabled: form.validation_enabled };
    if (editing) await supabase.from("countries").update(payload).eq("id", editing.id);
    else await supabase.from("countries").insert({ ...payload, sort_order: countries.length });
    showSuccess(editing ? "Pays modifié" : "Pays ajouté", "");
    setShowForm(false); reload();
  };

  const toggleActive = async (c: Country) => {
    await supabase.from("countries").update({ is_active: !c.is_active }).eq("id", c.id);
    showSuccess(c.is_active ? "Pays désactivé" : "Pays activé ✅", "");
    reload();
  };

  const deleteCountry = async (c: Country) => {
    await supabase.from("countries").delete().eq("id", c.id);
    showSuccess("Pays supprimé", "");
    reload();
  };

  return (
    <div className="space-y-3">
      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Ajouter un pays
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Modifier le pays" : "Nouveau pays"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom du pays" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Indicatif</label>
              <input value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })} placeholder="+226" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Emoji drapeau</label>
              <input value={form.flag_emoji} onChange={e => setForm({ ...form, flag_emoji: e.target.value })} placeholder="🇧🇫" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Chiffres requis</label>
              <input type="number" value={form.phone_digits} onChange={e => setForm({ ...form, phone_digits: e.target.value })} placeholder="8" className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Validation</label>
              <button type="button" onClick={() => setForm({ ...form, validation_enabled: !form.validation_enabled })}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${form.validation_enabled ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                {form.validation_enabled ? "Activee" : "Desactivee"}
              </button>
            </div>
          </div>
          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Modifier" : "Créer"}</button>
        </div>
      )}

      {countries.map((c: Country) => {
        const countryMethods = methods.filter((m: PaymentMethod) => m.country_id === c.id);
        return (
          <div key={c.id} className={`bg-card rounded-xl border overflow-hidden ${c.is_active ? "border-secondary" : "border-secondary opacity-60"}`}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.flag_emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.country_code} · {(c as any).phone_digits || 8} chiffres {(c as any).validation_enabled !== false ? "" : "(non validé)"}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => toggleActive(c)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${c.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{c.is_active ? "ON" : "OFF"}</button>
                  <button onClick={() => openForm(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
                  <button onClick={() => deleteCountry(c)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
                </div>
              </div>
              {/* Associated payment methods */}
              {countryMethods.length > 0 && (
                <div className="mt-2 pt-2 border-t border-secondary">
                  <p className="text-[10px] text-muted-foreground mb-1">Moyens de paiement :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {countryMethods.map((m: PaymentMethod) => (
                      <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.is_active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{m.name}</span>
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
  const [form, setForm] = useState({ min_investment: "", min_active_members: "", min_purchases: "", min_products_bought: "", condition_logic: "OR" });

  const startEdit = (c: VipCondition) => {
    setEditingId(c.id);
    setForm({
      min_investment: String(c.min_investment || 0),
      min_active_members: String(c.min_active_members || 0),
      min_purchases: String(c.min_purchases || 0),
      min_products_bought: String(c.min_products_bought || 0),
      condition_logic: c.condition_logic || "OR",
    });
  };

  const save = async () => {
    if (!editingId) return;
    await supabase.from("vip_conditions").update({
      min_investment: Number(form.min_investment) || 0,
      min_active_members: Number(form.min_active_members) || 0,
      min_purchases: Number(form.min_purchases) || 0,
      min_products_bought: Number(form.min_products_bought) || 0,
      condition_logic: form.condition_logic,
    }).eq("id", editingId);
    showSuccess("Conditions VIP mises à jour ✅", "");
    setEditingId(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          💡 Configurez les conditions pour chaque niveau VIP. Logique <b>OU</b> = une seule condition suffit. <b>ET</b> = toutes requises.
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
                  <label className="text-xs text-muted-foreground">Invest. min (FCFA)</label>
                  <input type="number" value={form.min_investment} onChange={e => setForm({ ...form, min_investment: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Membres actifs min</label>
                  <input type="number" value={form.min_active_members} onChange={e => setForm({ ...form, min_active_members: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Achats min</label>
                  <input type="number" value={form.min_purchases} onChange={e => setForm({ ...form, min_purchases: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Produits achetés min</label>
                  <input type="number" value={form.min_products_bought} onChange={e => setForm({ ...form, min_products_bought: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Logique de condition</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setForm({ ...form, condition_logic: "OR" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${form.condition_logic === "OR" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    OU (une suffit)
                  </button>
                  <button onClick={() => setForm({ ...form, condition_logic: "AND" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${form.condition_logic === "AND" ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    ET (toutes requises)
                  </button>
                </div>
              </div>
              <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={14} /> Sauvegarder
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{c.level_name}</span>
                  <span className="text-[9px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Niveau {c.level}</span>
                </div>
                <button onClick={() => startEdit(c)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Pencil size={12} className="text-primary" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Investissement</p>
                  <p className="text-xs font-bold text-foreground">{Number(c.min_investment).toLocaleString()} F</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Membres actifs</p>
                  <p className="text-xs font-bold text-foreground">{c.min_active_members}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Achats min</p>
                  <p className="text-xs font-bold text-foreground">{c.min_purchases}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Produits achetés</p>
                  <p className="text-xs font-bold text-foreground">{c.min_products_bought}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Logique : <span className="font-bold text-primary">{c.condition_logic === "AND" ? "ET (toutes)" : "OU (une suffit)"}</span></p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminPanel;
