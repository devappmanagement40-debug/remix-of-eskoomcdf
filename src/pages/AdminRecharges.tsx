import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Search, Clock, CheckCircle2, XCircle, CreditCard, Image as ImageIcon, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Recharge = {
  id: string;
  phone: string;
  country_code: string;
  amount: number;
  transaction_ref: string | null;
  proof_image_url: string | null;
  payment_method: string | null;
  status: string;
  created_at: string | null;
  user_id: string;
};

type ProfileInfo = {
  full_name: string | null;
  phone: string | null;
  balance: number | null;
};

const AdminRecharges = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
    const channel = supabase
      .channel("admin-recharges")
      .on("postgres_changes", { event: "*", schema: "public", table: "recharges" }, () => loadRecharges())
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
      const { data: hasPerm } = await supabase.rpc("has_permission", { _user_id: user.id, _permission: "manage_deposits" });
      if (!hasPerm) { showError("Accès refusé", "Vous n'avez pas la permission de gérer les dépôts"); navigate("/"); return; }
    }
    loadRecharges();
  };

  const loadRecharges = async () => {
    const { data } = await supabase.from("recharges").select("*").order("created_at", { ascending: false });
    if (data) {
      setRecharges(data);
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

  const handleAction = async (id: string, status: "approved" | "rejected", userId: string, amount: number) => {
    const { error } = await supabase.from("recharges").update({ status }).eq("id", id);
    if (error) { showError("Erreur", "Erreur lors de la mise à jour"); return; }

    if (status === "approved") {
      const { data: profile } = await supabase.from("profiles")
        .select("balance, deposit_balance, referral_balance, referred_by, gift_points")
        .eq("user_id", userId).single();
      if (profile) {
        // Load point settings
        const { data: pointSettings } = await supabase.from("site_settings")
          .select("key, value").in("key", ["points_per_deposit_type", "points_per_deposit_value"]);
        const getPS = (k: string) => pointSettings?.find((s: any) => s.key === k)?.value || "0";
        const depositPointType = getPS("points_per_deposit_type")?.trim().toLowerCase();
        const depositPointValue = Number(getPS("points_per_deposit_value")) || 0;
        let earnedPoints = 0;
        if (depositPointValue > 0) {
          earnedPoints = depositPointType === "percent" ? Math.floor(amount * depositPointValue / 100) : depositPointValue;
        }

        // Credit both balance, deposit_balance and gift_points
        await supabase.from("profiles").update({
          balance: (profile.balance || 0) + amount,
          deposit_balance: (profile.deposit_balance || 0) + amount,
          ...(earnedPoints > 0 ? { gift_points: (profile.gift_points || 0) + earnedPoints } : {}),
        }).eq("user_id", userId);

        // Note: Referral bonus is NOT given on deposit.
        // It is given only when the user purchases a product.
      }
    }

    showSuccess(
      status === "approved" ? "Recharge approuvée" : "Recharge refusée",
      status === "approved" ? "La recharge a été validée et le solde crédité ✅" : "La recharge a été refusée ❌"
    );
    loadRecharges();
  };

  const counts = {
    pending: recharges.filter(r => r.status === "pending").length,
    approved: recharges.filter(r => r.status === "approved").length,
    rejected: recharges.filter(r => r.status === "rejected").length,
  };

  const filtered = recharges
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const profile = profiles[r.user_id];
      return (
        r.phone.includes(s) ||
        r.id.toLowerCase().includes(s) ||
        (r.transaction_ref?.toLowerCase().includes(s)) ||
        (r.payment_method?.toLowerCase().includes(s)) ||
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
      <PageHeader title="Admin - Recharges" showBack />

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
            <span className="text-[10px] text-muted-foreground">Approuvées</span>
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "rejected" ? "border-destructive" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-destructive">{counts.rejected}</span>
            <span className="text-[10px] text-muted-foreground">Rejetées</span>
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
          <div className="text-center py-16"><p className="text-sm text-muted-foreground">Aucune recharge</p></div>
        ) : filtered.map(r => {
          const profile = profiles[r.user_id];

          return (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                {/* Amount + Status */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("fr-FR")} FCFA</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    r.status === "pending" ? "bg-warning/15 text-warning" :
                    r.status === "approved" ? "bg-success/15 text-success" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {r.status === "pending" ? <Clock size={12} /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvée" : "Rejetée"}
                  </div>
                </div>

                {/* Payment method badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                  <CreditCard size={12} />
                  {(r.payment_method || "Mobile Money").toUpperCase()}
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
                    <p className="text-[10px] text-muted-foreground">Référence :</p>
                    <p className="text-xs font-semibold text-foreground font-mono">{r.transaction_ref || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nom client :</p>
                    <p className="text-xs font-semibold text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  {r.proof_image_url && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Preuve de paiement :</p>
                      <button
                        onClick={() => setZoomedImage(r.proof_image_url)}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={r.proof_image_url}
                          alt="Preuve de paiement"
                          className="w-full max-w-[200px] h-24 object-cover rounded-lg border border-secondary"
                        />
                        <div className="absolute inset-0 max-w-[200px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <ZoomIn size={20} className="text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date :</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => handleAction(r.id, "approved", r.user_id, r.amount)}
                      className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Approuver
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "rejected", r.user_id, r.amount)}
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

      {/* Image zoom modal */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Preuve de paiement</DialogTitle>
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-3 right-3 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Preuve de paiement (agrandie)"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecharges;
