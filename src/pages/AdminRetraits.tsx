import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Search, Clock, CheckCircle2, XCircle, ArrowDown, CreditCard, Loader2, Zap, Hand } from "lucide-react";

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
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [wallets, setWallets] = useState<Record<string, WalletInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(true);

  useEffect(() => {
    checkAdminAndLoad();
    const channel = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) { showError("Accès refusé", "Vous n'avez pas les droits d'administrateur"); navigate("/"); return; }
    loadData();
    loadWithdrawalMode();
  };

  const loadWithdrawalMode = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "withdrawal_mode_auto").single();
    setIsAutoMode(data?.value !== "false");
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
          const map: Record<string, ProfileInfo> = {};
          profilesData.forEach(p => { map[p.user_id] = p; });
          setProfiles(map);
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
    // Note: balance was already deducted on withdrawal creation (DB trigger).
    // Setting status to "rejected" triggers refund via handle_withdrawal_status_change.
    const { error } = await supabase.from("withdrawals").update({ status }).eq("id", item.id);
    if (error) { showError("Erreur", "Erreur lors de la mise à jour"); return; }

    showSuccess(
      status === "approved" ? "Retrait approuvé" : "Retrait refusé",
      status === "approved" ? "Le retrait a été validé ✅" : "Le retrait a été refusé et le montant recrédité ❌"
    );
    loadData();
  };

  const handleOmniPayTransfer = async (item: Withdrawal) => {
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
        showSuccess("Transfert OmniPay", `Transfert initié ✅ | Ref: ${data.reference} | Opérateur: ${data.operator || 'auto'} | Frais: ${data.fees || 0} FCFA`);
        loadData();
      } else {
        const refundMsg = data?.refunded ? "\nLe montant a été recrédité au compte." : "";
        showError("Erreur OmniPay", (data?.error || "Le transfert a échoué") + refundMsg);
        loadData();
      }
    } catch {
      showError("Erreur", "Erreur de connexion");
    } finally {
      setAutoPayingId(null);
    }
  };

  const counts = {
    pending: items.filter(r => r.status === "pending").length,
    approved: items.filter(r => r.status === "approved").length,
    rejected: items.filter(r => r.status === "rejected").length,
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
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setFilter("pending")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "pending" ? "border-warning" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-warning">{counts.pending}</span>
            <span className="text-[10px] text-muted-foreground">En attente</span>
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "approved" ? "border-success" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-success">{counts.approved}</span>
            <span className="text-[10px] text-muted-foreground">Approuvés</span>
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "rejected" ? "border-destructive" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-destructive">{counts.rejected}</span>
            <span className="text-[10px] text-muted-foreground">Rejetés</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par compte, nom ou téléphone"
            className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-sm text-muted-foreground">Aucun retrait</p></div>
        ) : filtered.map(r => {
          const profile = profiles[r.user_id];
          const wallet = r.wallet_id ? wallets[r.wallet_id] : null;
          const feePercent = r.amount > 0 ? Math.round((r.fee_amount / r.amount) * 100) : 0;

          return (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                {/* Amount + Status */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("fr-FR")} FCFA</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ArrowDown size={12} className="text-success" />
                      <span className="text-sm font-semibold text-success">
                        Net : {r.net_amount.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="text-xs text-muted-foreground">(- {feePercent} %)</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    r.status === "pending" ? "bg-warning/15 text-warning" :
                    r.status === "approved" ? "bg-success/15 text-success" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {r.status === "pending" ? <Clock size={12} /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                  </div>
                </div>

                {/* Network badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                  <CreditCard size={12} />
                  {r.network.toUpperCase()}
                </div>

                {/* Divider */}
                <div className="border-t border-secondary my-2" />

                {/* Details grid */}
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
                    <p className="text-xs font-semibold text-foreground">{r.amount.toLocaleString("fr-FR")} FCFA</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Solde actuel :</p>
                    <p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("fr-FR")} FCFA` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date & heure :</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => handleOmniPayTransfer(r)}
                      disabled={autoPayingId === r.id}
                      className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                    >
                      {autoPayingId === r.id ? (
                        <><Loader2 size={16} className="animate-spin" />Envoi...</>
                      ) : (
                        <><CheckCircle2 size={16} />Valider</>
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(r, "rejected")}
                      className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle size={16} />
                      Rejeter
                    </button>
                  </div>
                )}
                {r.status === "processing" && (
                  <div className="mt-3 flex items-center gap-2 text-warning text-xs font-semibold">
                    <Loader2 size={14} className="animate-spin" />
                    Transfert OmniPay en cours...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRetraits;
