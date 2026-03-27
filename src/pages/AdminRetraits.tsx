import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Search, Clock, CheckCircle2, XCircle, ArrowDown, CreditCard, Loader2, Zap, Hand, ChevronDown, ChevronUp, History, DollarSign, Image } from "lucide-react";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  phone: string;
  country_code: string;
  network: string;
  status: string;
  admin_note: string | null;
  created_at: string | null;
  wallet_id: string | null;
  processing_fee_amount: number;
  processing_fee_paid: boolean;
  processing_fee_proof_url: string | null;
};

type FeePayment = {
  id: string;
  user_id: string;
  fee_amount: number;
  capital_amount: number;
  proof_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type ProfileInfo = {
  full_name: string | null;
  phone: string | null;
  balance: number | null;
};

type WalletInfo = {
  holder_name: string | null;
  phone: string;
  network: string;
};


const AdminRetraits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [activeTab, setActiveTab] = useState<"withdrawals" | "fees">("fees");
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [wallets, setWallets] = useState<Record<string, WalletInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "approved" | "rejected">("pending");
  const [feeFilter, setFeeFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [countryAutoMap, setCountryAutoMap] = useState<Record<string, boolean>>({});

  const isAutoForWithdrawal = (w: Withdrawal) => countryAutoMap[w.country_code] ?? false;

  useEffect(() => {
    checkAdminAndLoad();
    const channel = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_fee_payments" }, () => loadFeePayments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMod } = await supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" });
    if (!isAdmin && !isMod) { showError("Accès refusé", "Vous n'avez pas les droits d'administrateur"); navigate("/"); return; }
    if (isMod && !isAdmin) {
      const { data: hasPerm } = await supabase.rpc("has_permission", { _user_id: user.id, _permission: "manage_withdrawals" });
      if (!hasPerm) { showError("Accès refusé", "Vous n'avez pas la permission de gérer les retraits"); navigate("/"); return; }
    }
    loadData();
    loadFeePayments();
    loadCountryModes();
  };

  const loadCountryModes = async () => {
    const { data } = await supabase.from("countries").select("country_code, api_enabled");
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((c: any) => { map[c.country_code] = c.api_enabled; });
      setCountryAutoMap(map);
    }
  };

  const loadFeePayments = async () => {
    const { data } = await supabase.from("withdrawal_fee_payments").select("*").order("created_at", { ascending: false });
    if (data) {
      setFeePayments(data as FeePayment[]);
      // Load profiles for fee payments
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, phone, balance").in("user_id", userIds);
        if (profilesData) {
          setProfiles(prev => {
            const map = { ...prev };
            profilesData.forEach(p => { map[p.user_id] = p; });
            return map;
          });
        }
      }
    }
  };

  const loadData = async () => {
    const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (data) {
      setItems(data);
      const userIds = [...new Set(data.map(d => d.user_id))];
      const walletIds = data.map(d => d.wallet_id).filter(Boolean) as string[];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, phone, balance").in("user_id", userIds);
        if (profilesData) {
          setProfiles(prev => {
            const map = { ...prev };
            profilesData.forEach(p => { map[p.user_id] = p; });
            return map;
          });
        }
      }
      if (walletIds.length > 0) {
        const { data: walletsData } = await supabase.from("user_wallets").select("id, holder_name, phone, network").in("id", walletIds);
        if (walletsData) {
          const wmap: Record<string, WalletInfo> = {};
          walletsData.forEach(w => { wmap[w.id] = w; });
          setWallets(wmap);
        }
      }
    }
    setLoading(false);
  };

  const [autoPayingId, setAutoPayingId] = useState<string | null>(null);

  const handleAction = async (item: Withdrawal, status: "approved" | "rejected") => {
    const note = status === "approved"
      ? `✅ Validé manuellement par l'admin`
      : `❌ Rejeté manuellement par l'admin`;
    const { error } = await supabase.from("withdrawals").update({ status, admin_note: note }).eq("id", item.id);
    if (error) { showError("Erreur", error.message || "Erreur lors de la mise à jour"); return; }

    showSuccess(
      status === "approved" ? "Retrait approuvé" : "Retrait refusé",
      status === "approved" ? "Le retrait a été validé manuellement ✅" : "Le retrait a été refusé et le montant recrédité ❌"
    );
    loadData();
  };

  const handleAutoTransfer = async (item: Withdrawal) => {
    setAutoPayingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawal_id: item.id },
      });

      if (error) {
        showError("Erreur", "Erreur de connexion au serveur");
        return;
      }

      if (data?.success) {
        showSuccess("Retrait validé", "Le retrait a été approuvé avec succès ✅");
        loadData();
      } else {
        showError("Erreur", data?.error || "Le retrait a échoué");
        loadData();
      }
    } catch {
      showError("Erreur", "Erreur de connexion");
    } finally {
      setAutoPayingId(null);
    }
  };

  const handleFeeAction = async (fp: FeePayment, status: "approved" | "rejected", note?: string) => {
    const { error } = await supabase.from("withdrawal_fee_payments").update({
      status,
      admin_note: status === "approved" ? "✅ Paiement des frais confirmé" : (note || "❌ Paiement refusé"),
    }).eq("id", fp.id);
    if (error) { showError("Erreur", error.message); return; }
    showSuccess(
      status === "approved" ? "Frais confirmés" : "Frais refusés",
      status === "approved" ? "L'utilisateur peut maintenant effectuer son retrait" : "Le paiement a été refusé"
    );
    loadFeePayments();
  };

  const counts = {
    pending: items.filter(r => r.status === "pending").length,
    processing: items.filter(r => r.status === "processing").length,
    approved: items.filter(r => r.status === "approved").length,
    rejected: items.filter(r => r.status === "rejected").length,
  };

  const feeCounts = {
    pending: feePayments.filter(f => f.status === "pending").length,
    approved: feePayments.filter(f => f.status === "approved").length,
    rejected: feePayments.filter(f => f.status === "rejected").length,
  };

  const filtered = items
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const profile = profiles[r.user_id];
      return (
        r.phone.includes(s) ||
        r.id.toLowerCase().includes(s) ||
        r.network.toLowerCase().includes(s) ||
        (profile?.full_name?.toLowerCase().includes(s)) ||
        (profile?.phone?.toLowerCase().includes(s))
      );
    });

  const filteredFees = feePayments
    .filter(f => feeFilter === "all" || f.status === feeFilter)
    .filter(f => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const profile = profiles[f.user_id];
      return (
        f.id.toLowerCase().includes(s) ||
        (profile?.full_name?.toLowerCase().includes(s)) ||
        (profile?.phone?.toLowerCase().includes(s))
      );
    });

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin - Retraits" showBack />

      <div className="px-4 pt-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "fees" ? "bg-warning text-warning-foreground" : "bg-secondary text-foreground"
            }`}
          >
            <DollarSign size={14} />
            Frais ({feeCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "withdrawals" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}
          >
            <ArrowDown size={14} />
            Retraits ({counts.pending})
          </button>
        </div>

        {/* ====== FEE PAYMENTS TAB ====== */}
        {activeTab === "fees" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setFeeFilter("pending")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${feeFilter === "pending" ? "border-warning" : "border-secondary"}`}>
                <span className="text-xl font-bold text-warning">{feeCounts.pending}</span>
                <span className="text-[9px] text-muted-foreground">En attente</span>
              </button>
              <button onClick={() => setFeeFilter("approved")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${feeFilter === "approved" ? "border-success" : "border-secondary"}`}>
                <span className="text-xl font-bold text-success">{feeCounts.approved}</span>
                <span className="text-[9px] text-muted-foreground">Confirmés</span>
              </button>
              <button onClick={() => setFeeFilter("rejected")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${feeFilter === "rejected" ? "border-destructive" : "border-secondary"}`}>
                <span className="text-xl font-bold text-destructive">{feeCounts.rejected}</span>
                <span className="text-[9px] text-muted-foreground">Refusés</span>
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>

            {filteredFees.length === 0 ? (
              <div className="text-center py-16"><p className="text-sm text-muted-foreground">Aucun paiement de frais</p></div>
            ) : filteredFees.map(fp => {
              const profile = profiles[fp.user_id];
              return (
                <div key={fp.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{profile?.full_name || "Utilisateur"}</p>
                        <p className="text-[10px] text-muted-foreground">{profile?.phone || "—"}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        fp.status === "approved" ? "bg-success/15 text-success" :
                        fp.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-warning/15 text-warning"
                      }`}>
                        {fp.status === "approved" ? "✅ Confirmé" : fp.status === "rejected" ? "❌ Refusé" : "⏳ En attente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-warning/10 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Frais payés</p>
                        <p className="text-sm font-bold text-warning">{fp.fee_amount.toLocaleString("fr-FR")} F</p>
                      </div>
                      <div className="bg-primary/10 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Capital</p>
                        <p className="text-sm font-bold text-primary">{fp.capital_amount.toLocaleString("fr-FR")} F</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mb-2">Soumis le {formatDate(fp.created_at)}</p>

                    {fp.proof_url && (
                      <a href={fp.proof_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
                        <div className="rounded-xl overflow-hidden border border-border/30 relative">
                          <img src={fp.proof_url} alt="Preuve" className="w-full h-40 object-cover" />
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                            <Image size={10} />
                            Voir en grand
                          </div>
                        </div>
                      </a>
                    )}

                    {fp.admin_note && (
                      <div className="bg-muted/50 rounded-lg p-2 mb-3">
                        <p className="text-[10px] text-muted-foreground">{fp.admin_note}</p>
                      </div>
                    )}

                    {fp.status === "pending" && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleFeeAction(fp, "approved")}
                          className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm"
                        >
                          <CheckCircle2 size={16} />Confirmer
                        </button>
                        <button
                          onClick={() => handleFeeAction(fp, "rejected", "Preuve invalide")}
                          className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm"
                        >
                          <XCircle size={16} />Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ====== WITHDRAWALS TAB ====== */}
        {activeTab === "withdrawals" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => setFilter("pending")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === "pending" ? "border-warning" : "border-secondary"}`}>
                <span className="text-xl font-bold text-warning">{counts.pending}</span>
                <span className="text-[9px] text-muted-foreground">En attente</span>
              </button>
              <button onClick={() => setFilter("processing")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === "processing" ? "border-primary" : "border-secondary"}`}>
                <span className="text-xl font-bold text-primary">{counts.processing}</span>
                <span className="text-[9px] text-muted-foreground">En cours</span>
              </button>
              <button onClick={() => setFilter("approved")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === "approved" ? "border-success" : "border-secondary"}`}>
                <span className="text-xl font-bold text-success">{counts.approved}</span>
                <span className="text-[9px] text-muted-foreground">Approuvés</span>
              </button>
              <button onClick={() => setFilter("rejected")} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === "rejected" ? "border-destructive" : "border-secondary"}`}>
                <span className="text-xl font-bold text-destructive">{counts.rejected}</span>
                <span className="text-[9px] text-muted-foreground">Rejetés</span>
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par compte, nom ou téléphone" className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16"><p className="text-sm text-muted-foreground">Aucun retrait</p></div>
            ) : filtered.map(r => {
              const profile = profiles[r.user_id];
              const wallet = r.wallet_id ? wallets[r.wallet_id] : null;
              const feePercent = r.amount > 0 ? Math.round((r.fee_amount / r.amount) * 100) : 0;

              return (
                <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("fr-FR")} CDF</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ArrowDown size={12} className="text-success" />
                          <span className="text-sm font-semibold text-success">Net : {r.net_amount.toLocaleString("fr-FR")} CDF</span>
                          <span className="text-xs text-muted-foreground">(- {feePercent} %)</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        r.status === "pending" ? "bg-warning/15 text-warning" :
                        r.status === "processing" ? "bg-primary/15 text-primary" :
                        r.status === "approved" ? "bg-success/15 text-success" :
                        "bg-destructive/15 text-destructive"
                      }`}>
                        {r.status === "pending" ? <Clock size={12} /> : r.status === "processing" ? <Loader2 size={12} className="animate-spin" /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {r.status === "pending" ? "En attente" : r.status === "processing" ? "En cours" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                      <CreditCard size={12} />
                      {r.network.toUpperCase()}
                    </div>

                    <div className="border-t border-secondary my-2" />

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Nom du titulaire :</p>
                        <p className="text-xs font-semibold text-foreground">{wallet?.holder_name || profile?.full_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Numéro de retrait :</p>
                        <p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Moyen de paiement :</p>
                        <p className="text-xs font-semibold text-foreground">{r.network}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Montant demandé :</p>
                        <p className="text-xs font-semibold text-foreground">{r.amount.toLocaleString("fr-FR")} CDF</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Solde actuel :</p>
                        <p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("fr-FR")} CDF` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Date & heure :</p>
                        <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                      </div>
                    </div>

                    {r.status === "pending" && (
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold mt-3 mb-2 ${isAutoForWithdrawal(r) ? "text-primary" : "text-warning"}`}>
                        {isAutoForWithdrawal(r) ? <Zap size={12} /> : <Hand size={12} />}
                        Mode : {isAutoForWithdrawal(r) ? "Automatique" : "Manuel"} — {r.country_code}
                      </div>
                    )}

                    {r.admin_note && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-secondary">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">📋 Note :</p>
                        <p className="text-[11px] text-foreground leading-relaxed break-all">{r.admin_note}</p>
                      </div>
                    )}


                    {r.status === "pending" && (
                      <div className="mt-2">
                        <div className="grid grid-cols-2 gap-3">
                          {isAutoForWithdrawal(r) ? (
                            <button
                              onClick={() => handleAutoTransfer(r)}
                              disabled={autoPayingId === r.id}
                              className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                            >
                              {autoPayingId === r.id ? (
                                <><Loader2 size={16} className="animate-spin" />Envoi...</>
                              ) : (
                                <><Zap size={16} />Auto Valider</>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(r, "approved")}
                              className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm"
                            >
                              <CheckCircle2 size={16} />Valider
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(r, "rejected")}
                            className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                          >
                            <XCircle size={16} />Rejeter
                          </button>
                        </div>
                      </div>
                    )}
                    {r.status === "processing" && (
                      <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2 text-warning text-xs font-semibold">
                          <Loader2 size={14} className="animate-spin" />
                          Transfert en cours — En attente de confirmation
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-1 bg-success/10 text-success font-semibold py-2 rounded-lg text-[11px] border border-success/20">
                            <CheckCircle2 size={12} />Forcer Succès
                          </button>
                          <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-1 bg-destructive/10 text-destructive font-semibold py-2 rounded-lg text-[11px] border border-destructive/20">
                            <XCircle size={12} />Forcer Échec
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRetraits;
