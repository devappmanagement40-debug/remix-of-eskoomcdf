import { useState, useEffect } from "react";
import { getAuthToken } from "@/integrations/supabase/client";
import {
  Save, Edit2, Search, Loader2, X, ArrowLeft,
  TrendingUp, Users, CheckCircle2
} from "lucide-react";

type Profile = {
  id: string; user_id: string; full_name: string | null; phone: string | null;
  referral_code: string | null; referred_by: string | null;
  referral_balance: number | null; balance: number | null;
  created_at: string | null; vip_level: number | null;
};

type Commission = {
  id: string; beneficiary_id: string; buyer_id: string;
  product_price: number; commission_amount: number;
  commission_rate: number; level: string; created_at: string | null;
};

type SiteSetting = { id: string; key: string; value: string | null; category: string };

const AdminReferralTab = ({
  profiles, siteSettings, referralCommissions, reload, showSuccess, showError,
}: {
  profiles: Profile[];
  siteSettings: SiteSetting[];
  referralCommissions: Commission[];
  reload: () => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
}) => {
  const [section, setSection] = useState<"config" | "stats" | "history" | "network">("config");

  const [rateL1, setRateL1] = useState("10");
  const [rateL2, setRateL2] = useState("5");
  const [rateL3, setRateL3] = useState("1");
  const [saving, setSaving] = useState(false);

  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [codeSearch, setCodeSearch] = useState("");

  const [histSearch, setHistSearch] = useState("");
  const [histLevel, setHistLevel] = useState("all");

  const [netSearch, setNetSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [teamData, setTeamData] = useState<{ l1: Profile[]; l2: Profile[]; l3: Profile[] }>({ l1: [], l2: [], l3: [] });
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [editingReferrerId, setEditingReferrerId] = useState<string | null>(null);
  const [newReferrerCode, setNewReferrerCode] = useState("");

  useEffect(() => {
    setRateL1(siteSettings.find(s => s.key === "referral_rate_l1")?.value ?? "10");
    setRateL2(siteSettings.find(s => s.key === "referral_rate_l2")?.value ?? "5");
    setRateL3(siteSettings.find(s => s.key === "referral_rate_l3")?.value ?? "1");
  }, [siteSettings]);

  const byId: Record<string, Profile> = {};
  profiles.forEach(p => { byId[p.id] = p; byId[p.user_id] = p; });

  const label = (p?: Profile | null) =>
    p ? (p.full_name || p.phone || p.id.slice(0, 8) + "…") : "—";

  const fmtAmt = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  const authHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const saveRates = async () => {
    const v1 = parseFloat(rateL1), v2 = parseFloat(rateL2), v3 = parseFloat(rateL3);
    if ([v1, v2, v3].some(v => isNaN(v) || v < 0 || v > 100)) {
      showError("Erreur", "Les taux doivent être entre 0 et 100"); return;
    }
    setSaving(true);
    try {
      await fetch("/api/admin/site-settings/batch", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          settings: [
            { key: "referral_rate_l1", value: rateL1, category: "referral" },
            { key: "referral_rate_l2", value: rateL2, category: "referral" },
            { key: "referral_rate_l3", value: rateL3, category: "referral" },
          ],
        }),
      });
      showSuccess("Taux sauvegardés ✅", `E: ${rateL1}% • F: ${rateL2}% • G: ${rateL3}%`);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const updateCode = async (profileId: string, code: string) => {
    const clean = code.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4) { showError("Erreur", "Code trop court (min 4 caractères)"); return; }
    const res = await fetch(`/api/admin/users/${profileId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ referralCode: clean }),
    });
    if (!res.ok) { const e = await res.json(); showError("Erreur", e.error || "Failed"); return; }
    showSuccess("Code mis à jour ✅", `Nouveau code : ${clean}`);
    setEditingCodeId(null); setNewCode("");
    reload();
  };

  const removeReferral = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ referredBy: null }),
    });
    if (!res.ok) { const e = await res.json(); showError("Erreur", e.error || "Failed"); return; }
    showSuccess("Lien supprimé ✅", "Relation de parrainage retirée");
    if (selectedUser?.user_id === userId) setSelectedUser(prev => prev ? { ...prev, referred_by: null } : null);
    reload();
  };

  const changeReferrer = async (userId: string, codeOrId: string) => {
    const ref = profiles.find(p =>
      p.referral_code?.toUpperCase() === codeOrId.toUpperCase() || p.id === codeOrId
    );
    if (!ref) { showError("Erreur", "Code ou ID parrain introuvable"); return; }
    if (ref.user_id === userId) { showError("Erreur", "Un utilisateur ne peut pas se parrainer lui-même"); return; }
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ referredBy: ref.id }),
    });
    if (!res.ok) { const e = await res.json(); showError("Erreur", e.error || "Failed"); return; }
    showSuccess("Parrain mis à jour ✅", `Parrain : ${label(ref)}`);
    setEditingReferrerId(null); setNewReferrerCode("");
    reload();
  };

  const loadTeam = async (p: Profile) => {
    setSelectedUser(p); setLoadingTeam(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/team/my", { headers });
      const l1: Profile[] = res.ok ? (await res.json()).map((m: any) => ({
        id: m.id, user_id: m.userId, full_name: m.fullName, phone: m.phone,
        referral_code: m.referralCode, referred_by: m.referredBy,
        referral_balance: m.referralBalance, balance: m.balance,
        created_at: m.createdAt, vip_level: m.vipLevel,
      })) : profiles.filter(x => x.referred_by === p.id);

      const l1Ids = l1.map(m => m.id);
      let l2: Profile[] = [], l3: Profile[] = [];
      if (l1Ids.length > 0) {
        l2 = profiles.filter(x => x.referred_by && l1Ids.includes(x.referred_by));
        const l2Ids = l2.map(m => m.id);
        if (l2Ids.length > 0) {
          l3 = profiles.filter(x => x.referred_by && l2Ids.includes(x.referred_by));
        }
      }
      setTeamData({ l1, l2, l3 });
    } finally {
      setLoadingTeam(false);
    }
  };

  const filteredCodes = profiles.filter(p => {
    if (!codeSearch.trim()) return true;
    const s = codeSearch.toLowerCase();
    return (p.phone?.toLowerCase().includes(s)) ||
      (p.full_name?.toLowerCase().includes(s)) ||
      (p.referral_code?.toLowerCase().includes(s));
  }).slice(0, 60);

  const totalComm = referralCommissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const byLevel: Record<string, number> = { L1: 0, L2: 0, L3: 0 };
  referralCommissions.forEach(c => {
    if (c.level) byLevel[c.level] = (byLevel[c.level] || 0) + Number(c.commission_amount || 0);
  });
  const topReferrers = [...profiles]
    .filter(p => (p.referral_balance || 0) > 0)
    .sort((a, b) => (b.referral_balance || 0) - (a.referral_balance || 0))
    .slice(0, 10);

  const filteredComm = referralCommissions.filter(c => {
    if (histLevel !== "all" && c.level !== histLevel) return false;
    if (!histSearch.trim()) return true;
    const s = histSearch.toLowerCase();
    const ben = byId[c.beneficiary_id];
    const buyer = byId[c.buyer_id];
    return (ben?.phone?.toLowerCase().includes(s)) ||
      (ben?.full_name?.toLowerCase().includes(s)) ||
      (buyer?.phone?.toLowerCase().includes(s)) ||
      (buyer?.full_name?.toLowerCase().includes(s));
  });

  const netResults = profiles.filter(p => {
    if (!netSearch.trim()) return false;
    const s = netSearch.toLowerCase();
    return (p.phone?.toLowerCase().includes(s)) ||
      (p.full_name?.toLowerCase().includes(s)) ||
      (p.referral_code?.toLowerCase().includes(s));
  }).slice(0, 10);

  const SECTIONS = [
    { key: "config", label: "⚙️ Config" },
    { key: "stats", label: "📊 Stats" },
    { key: "history", label: "📋 Historique" },
    { key: "network", label: "🌐 Réseau" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 bg-secondary rounded-xl p-1">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key as typeof section)}
            className={`py-2.5 rounded-lg text-[11px] font-bold transition-colors ${section === s.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== CONFIGURATION ===== */}
      {section === "config" && (
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              Configurez les taux de commission par niveau. Ces taux s'appliquent automatiquement à chaque achat de produit par un filleul.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Niveau E", rate: rateL1, border: "border-primary/30 bg-primary/5", text: "text-primary", desc: "Filleul direct" },
              { label: "Niveau F", rate: rateL2, border: "border-success/30 bg-success/5", text: "text-success", desc: "2ème niveau" },
              { label: "Niveau G", rate: rateL3, border: "border-warning/30 bg-warning/5", text: "text-warning", desc: "3ème niveau" },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl border p-3 text-center ${item.border}`}>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.text}`}>{item.rate}%</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-secondary rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Modifier les taux de commission</h3>
            {[
              { label: "Niveau E (L1) — Filleul direct", value: rateL1, set: setRateL1 },
              { label: "Niveau F (L2) — 2ème niveau", value: rateL2, set: setRateL2 },
              { label: "Niveau G (L3) — 3ème niveau", value: rateL3, set: setRateL3 },
            ].map(({ label: lbl, value, set }, i) => (
              <div key={i}>
                <label className="text-xs text-muted-foreground">{lbl}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" min="0" max="100" step="0.5" value={value}
                    onChange={e => set(e.target.value)}
                    className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
                  <span className="text-base font-bold text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <button onClick={saveRates} disabled={saving}
              className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Enregistrement..." : "Sauvegarder les taux"}
            </button>
          </div>

          <div className="bg-card border border-secondary rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-secondary bg-secondary/20">
              <h3 className="text-sm font-bold text-foreground">Codes de parrainage</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Consultez et modifiez les codes de vos utilisateurs</p>
            </div>
            <div className="p-3">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="w-full bg-secondary text-foreground rounded-xl pl-9 pr-4 py-2.5 text-xs border border-secondary outline-none focus:border-primary" />
              </div>
              {filteredCodes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>
              ) : filteredCodes.map(p => (
                <div key={p.id} className="py-2.5 border-b border-secondary/50 last:border-0">
                  {editingCodeId === p.id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">{label(p)}</p>
                      <div className="flex gap-2">
                        <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
                          placeholder="Nouveau code (ex: CODE123)"
                          className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-primary outline-none font-mono" />
                        <button onClick={() => updateCode(p.user_id, newCode)}
                          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">✓</button>
                        <button onClick={() => { setEditingCodeId(null); setNewCode(""); }}
                          className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs">✕</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{label(p)}</p>
                        <p className="text-[10px] text-muted-foreground">{p.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded-lg text-primary font-bold">
                          {p.referral_code || "—"}
                        </span>
                        <button onClick={() => { setEditingCodeId(p.id); setNewCode(p.referral_code || ""); }}
                          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                          <Edit2 size={10} className="text-primary" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== STATS ===== */}
      {section === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total commissions versées", value: `${fmtAmt(totalComm)} USDT`, color: "text-primary" },
              { label: "Parrains actifs", value: String(profiles.filter(p => (p.referral_balance || 0) > 0).length), color: "text-success" },
              { label: "Transactions totales", value: String(referralCommissions.length), color: "text-foreground" },
              { label: "Utilisateurs parrainés", value: String(profiles.filter(p => p.referred_by).length), color: "text-foreground" },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-secondary rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${item.color} mt-0.5`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-secondary rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground">COMMISSIONS PAR NIVEAU</h3>
            {[
              { level: "L1", lbl: "Niveau E — Filleul direct", bar: "bg-primary" },
              { level: "L2", lbl: "Niveau F — 2ème niveau", bar: "bg-success" },
              { level: "L3", lbl: "Niveau G — 3ème niveau", bar: "bg-warning" },
            ].map(({ level, lbl, bar }) => {
              const amt = byLevel[level] || 0;
              const pct = totalComm > 0 ? (amt / totalComm * 100) : 0;
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{lbl}</span>
                    <span className="text-muted-foreground">{fmtAmt(amt)} USDT</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-secondary rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-secondary bg-secondary/20 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-foreground">TOP 10 PARRAINS</h3>
            </div>
            {topReferrers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucun parrain avec des commissions</p>
            ) : topReferrers.map((p, i) => (
              <div key={p.id} className="flex items-center px-4 py-3 border-b border-secondary/50 last:border-0">
                <span className={`text-xs font-bold w-5 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                  #{i + 1}
                </span>
                <div className="flex-1 ml-2 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{label(p)}</p>
                  <p className="text-[10px] text-muted-foreground">{p.phone} • Code: <span className="font-mono text-primary">{p.referral_code || "—"}</span></p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-xs font-bold text-primary">{fmtAmt(p.referral_balance)} USDT</p>
                  <p className="text-[10px] text-muted-foreground">commissions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {section === "history" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                placeholder="Rechercher bénéficiaire ou acheteur..."
                className="w-full bg-card border border-secondary rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground outline-none focus:border-primary" />
            </div>
            <select value={histLevel} onChange={e => setHistLevel(e.target.value)}
              className="bg-card border border-secondary rounded-xl px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary">
              <option value="all">Tous les niveaux</option>
              <option value="L1">Niveau E</option>
              <option value="L2">Niveau F</option>
              <option value="L3">Niveau G</option>
            </select>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {filteredComm.length} commission(s) • Total filtré : {fmtAmt(filteredComm.reduce((s, c) => s + Number(c.commission_amount || 0), 0))} USDT
          </p>

          {filteredComm.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">Aucune commission enregistrée</p>
              <p className="text-xs text-muted-foreground">Les commissions s'enregistrent lors des achats de produits</p>
            </div>
          ) : filteredComm.slice(0, 100).map((c, i) => {
            const ben = byId[c.beneficiary_id];
            const buyer = byId[c.buyer_id];
            const lvlMap: Record<string, { label: string; cls: string }> = {
              L1: { label: "Niv. E", cls: "bg-primary/20 text-primary" },
              L2: { label: "Niv. F", cls: "bg-success/20 text-success" },
              L3: { label: "Niv. G", cls: "bg-warning/20 text-warning" },
            };
            const lv = lvlMap[c.level] || { label: c.level, cls: "bg-secondary text-foreground" };
            return (
              <div key={c.id || i} className="bg-card border border-secondary rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lv.cls}`}>{lv.label}</span>
                    <p className="text-xs font-bold text-success">+{fmtAmt(Number(c.commission_amount))} USDT</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(c.created_at)}</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div><span className="text-muted-foreground">Bénéficiaire : </span><span className="text-foreground font-medium">{label(ben)}</span></div>
                  <div><span className="text-muted-foreground">Acheteur : </span><span className="text-foreground font-medium">{label(buyer)}</span></div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Produit : {fmtAmt(Number(c.product_price))} USDT • Taux : {(Number(c.commission_rate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== NETWORK ===== */}
      {section === "network" && (
        <div className="space-y-4">
          {selectedUser ? (
            <div className="space-y-3">
              <button onClick={() => { setSelectedUser(null); setTeamData({ l1: [], l2: [], l3: [] }); setEditingReferrerId(null); }}
                className="flex items-center gap-2 text-sm text-primary font-semibold">
                <ArrowLeft size={16} /> Retour
              </button>

              <div className="bg-card border border-primary/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{label(selectedUser)}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.phone}</p>
                    <span className="inline-block mt-1 text-[10px] bg-secondary px-2.5 py-1 rounded-lg font-mono text-primary font-bold">
                      {selectedUser.referral_code || "—"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Commissions</p>
                    <p className="text-sm font-bold text-primary">{fmtAmt(selectedUser.referral_balance)} USDT</p>
                    <p className="text-[10px] text-muted-foreground mt-1">VIP{selectedUser.vip_level || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-secondary rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground">PARRAIN DE CET UTILISATEUR</p>
                {selectedUser.referred_by ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{label(byId[selectedUser.referred_by])}</p>
                        <p className="text-xs text-muted-foreground">{byId[selectedUser.referred_by]?.phone}</p>
                        <p className="text-[10px] text-primary font-mono mt-0.5">Code : {byId[selectedUser.referred_by]?.referral_code || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => { setEditingReferrerId(selectedUser.user_id); setNewReferrerCode(""); }}
                          className="text-[10px] border border-primary/40 text-primary px-3 py-1.5 rounded-lg font-semibold">
                          Changer
                        </button>
                        <button onClick={() => removeReferral(selectedUser.user_id)}
                          className="text-[10px] border border-destructive/40 text-destructive px-3 py-1.5 rounded-lg font-semibold">
                          Retirer
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Pas de parrain</p>
                )}

                {editingReferrerId === selectedUser.user_id && (
                  <div className="flex gap-2 pt-1">
                    <input value={newReferrerCode} onChange={e => setNewReferrerCode(e.target.value.toUpperCase())}
                      placeholder="Code ou ID du nouveau parrain"
                      className="flex-1 bg-secondary text-foreground rounded-xl px-3 py-2 text-xs border border-primary outline-none" />
                    <button onClick={() => changeReferrer(selectedUser.user_id, newReferrerCode)}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">✓</button>
                    <button onClick={() => setEditingReferrerId(null)}
                      className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs">✕</button>
                  </div>
                )}

                {!selectedUser.referred_by && editingReferrerId !== selectedUser.user_id && (
                  <button onClick={() => { setEditingReferrerId(selectedUser.user_id); setNewReferrerCode(""); }}
                    className="text-xs text-primary border border-primary/30 px-4 py-2 rounded-xl">
                    + Assigner un parrain
                  </button>
                )}
              </div>

              {loadingTeam ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Chargement de l'équipe...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Niveau E — Filleuls directs", members: teamData.l1, color: "text-primary", badge: "bg-primary/20 text-primary" },
                    { label: "Niveau F — 2ème niveau", members: teamData.l2, color: "text-success", badge: "bg-success/20 text-success" },
                    { label: "Niveau G — 3ème niveau", members: teamData.l3, color: "text-warning", badge: "bg-warning/20 text-warning" },
                  ].map(({ label: lbl, members, color, badge }) => (
                    <div key={lbl} className="bg-card border border-secondary rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-secondary bg-secondary/20 flex items-center justify-between">
                        <p className={`text-xs font-bold ${color}`}>{lbl}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>{members.length}</span>
                      </div>
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucun membre</p>
                      ) : members.map(m => (
                        <div key={m.id} className="flex items-center justify-between px-4 py-2.5 border-b border-secondary/30 last:border-0">
                          <div>
                            <p className="text-xs font-medium text-foreground">{label(m)}</p>
                            <p className="text-[10px] text-muted-foreground">{m.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-foreground">{fmtAmt(m.balance)} USDT</p>
                            <p className="text-[10px] font-mono text-primary">{m.referral_code || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  Recherchez un utilisateur pour voir son réseau complet (parrain + 3 niveaux de filleuls) et modifier les relations de parrainage.
                </p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={netSearch} onChange={e => setNetSearch(e.target.value)}
                  placeholder="Nom, téléphone ou code de parrainage..."
                  className="w-full bg-card border border-secondary rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              {netSearch.trim() && netResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
              )}
              <div className="space-y-2">
                {netResults.map(p => (
                  <div key={p.id} className="bg-card border border-secondary rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{label(p)}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                        <p className="text-[10px] text-primary font-mono mt-0.5">Code : {p.referral_code || "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-2">
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary">{fmtAmt(p.referral_balance)} USDT</p>
                          <p className="text-[10px] text-muted-foreground">commissions</p>
                        </div>
                        <button onClick={() => loadTeam(p)}
                          className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold whitespace-nowrap">
                          Voir réseau
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReferralTab;
