import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

type Recharge = {
  id: string;
  phone: string;
  country_code: string;
  amount: number;
  transaction_ref: string | null;
  payment_method: string | null;
  status: string;
  created_at: string | null;
  user_id: string;
};

const AdminRecharges = () => {
  const navigate = useNavigate();
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    checkAdminAndLoad();

    const channel = supabase
      .channel("admin-recharges")
      .on("postgres_changes", { event: "*", schema: "public", table: "recharges" }, () => {
        loadRecharges();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) {
      toast.error("Accès refusé");
      navigate("/");
      return;
    }
    loadRecharges();
  };

  const loadRecharges = async () => {
    const { data, error } = await supabase
      .from("recharges")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setRecharges(data);
    setLoading(false);
  };

  const handleAction = async (id: string, status: "approved" | "rejected", userId: string, amount: number) => {
    const { error } = await supabase
      .from("recharges")
      .update({ status })
      .eq("id", id);

    if (error) { toast.error("Erreur lors de la mise à jour"); return; }

    if (status === "approved") {
      // Credit user balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: (profile.balance || 0) + amount })
          .eq("user_id", userId);
      }
    }

    toast.success(status === "approved" ? "Recharge approuvée ✅" : "Recharge refusée ❌");
    loadRecharges();
  };

  const filtered = recharges.filter((r) => filter === "all" || r.status === filter);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/20 text-warning",
      approved: "bg-success/20 text-success",
      rejected: "bg-destructive/20 text-destructive",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      approved: "Approuvé",
      rejected: "Refusé",
    };
    return (
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${map[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin - Recharges" showBack />

      {/* Filter tabs */}
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {f === "all" ? "Toutes" : f === "pending" ? "En attente" : f === "approved" ? "Approuvées" : "Refusées"}
            {f === "pending" && ` (${recharges.filter((r) => r.status === "pending").length})`}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">Aucune recharge</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
                <span className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}...</span>
                {statusBadge(r.status)}
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Montant</span>
                  <span className="text-sm font-bold text-primary">{r.amount.toLocaleString()} CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Téléphone</span>
                  <span className="text-sm text-foreground">{r.country_code} {r.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Référence</span>
                  <span className="text-sm text-foreground font-mono">{r.transaction_ref || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Méthode</span>
                  <span className="text-sm text-foreground">{r.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <span className="text-sm text-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "—"}
                  </span>
                </div>

                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <button
                      onClick={() => handleAction(r.id, "approved", r.user_id, r.amount)}
                      className="bg-success text-success-foreground font-bold py-2.5 rounded-xl text-sm"
                    >
                      ✅ Valider
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "rejected", r.user_id, r.amount)}
                      className="bg-destructive text-destructive-foreground font-bold py-2.5 rounded-xl text-sm"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminRecharges;
