import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";

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

const AdminRetraits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

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
    if (data) setItems(data);
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

  const filtered = items.filter((r) => filter === "all" || r.status === filter);

  const badge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/20 text-warning",
      approved: "bg-success/20 text-success",
      rejected: "bg-destructive/20 text-destructive",
    };
    const labels: Record<string, string> = { pending: "En attente", approved: "Approuvé", rejected: "Refusé" };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${map[status] || ""}`}>{labels[status] || status}</span>;
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin - Retraits" showBack />

      <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {f === "all" ? "Tous" : f === "pending" ? "En attente" : f === "approved" ? "Approuvés" : "Refusés"}
            {f === "pending" && ` (${items.filter(r => r.status === "pending").length})`}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-sm text-muted-foreground">Aucun retrait</p></div>
        ) : filtered.map((r) => (
          <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
              <span className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}...</span>
              {badge(r.status)}
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Montant</span><span className="text-sm font-bold text-primary">{r.amount.toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Frais (10%)</span><span className="text-sm text-destructive">-{r.fee_amount.toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Net à verser</span><span className="text-sm font-bold text-success">{r.net_amount.toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Téléphone</span><span className="text-sm text-foreground">{r.country_code} {r.phone}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Réseau</span><span className="text-sm text-foreground">{r.network}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Date</span><span className="text-sm text-foreground">{r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "—"}</span></div>

              {r.status === "pending" && (
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button onClick={() => handleAction(r, "approved")} className="bg-success text-success-foreground font-bold py-2.5 rounded-xl text-sm">✅ Valider</button>
                  <button onClick={() => handleAction(r, "rejected")} className="bg-destructive text-destructive-foreground font-bold py-2.5 rounded-xl text-sm">❌ Refuser</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRetraits;
