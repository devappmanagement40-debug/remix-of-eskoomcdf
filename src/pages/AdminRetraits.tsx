import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Search, Clock, CheckCircle2, XCircle, ArrowDown, CreditCard } from "lucide-react";

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
};

type ProfileInfo = {
  full_name: string | null;
  phone: string | null;
  balance: number | null;
};

const AdminRetraits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

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
  };

  const loadData = async () => {
    const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (data) {
      setItems(data);
      // Load profiles for all unique user_ids
      const userIds = [...new Set(data.map(d => d.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, phone, balance").in("user_id", userIds);
        if (profilesData) {
          const map: Record<string, ProfileInfo> = {};
          profilesData.forEach(p => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  const handleAction = async (item: Withdrawal, status: "approved" | "rejected") => {
    const { error } = await supabase.from("withdrawals").update({ status }).eq("id", item.id);
    if (error) { showError("Erreur", "Erreur lors de la mise à jour"); return; }

    if (status === "approved") {
      const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", item.user_id).single();
      if (profile) {
        const newBal = Math.max(0, (profile.balance || 0) - item.amount);
        await supabase.from("profiles").update({ balance: newBal }).eq("user_id", item.user_id);
      }
    }

    showSuccess(
      status === "approved" ? "Retrait approuvé" : "Retrait refusé",
      status === "approved" ? "Le retrait a été validé et le solde débité ✅" : "Le retrait a été refusé ❌"
    );
    loadData();
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
                    <p className="text-[10px] text-muted-foreground">Client :</p>
                    <p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Solde actuel :</p>
                    <p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("fr-FR")} FCFA` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nom compte :</p>
                    <p className="text-xs font-semibold text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date :</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => handleAction(r, "approved")}
                      className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Approuver
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRetraits;
