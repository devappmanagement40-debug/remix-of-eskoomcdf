import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Search, Clock, CheckCircle2, XCircle, CreditCard, Image as ImageIcon, X, ZoomIn, Info } from "lucide-react";
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
    const interval = setInterval(loadRecharges, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const adminCheck = await api.get("/admin/check");
      if (!adminCheck.isAdmin && !adminCheck.isModerator) {
        showError("Access denied", "You do not have administrator rights"); navigate("/"); return;
      }
      loadRecharges();
    } catch {
      navigate("/connexion");
    }
  };

  const loadRecharges = async () => {
    try {
      const data = await api.get("/admin/recharges");
      if (data) {
        setRecharges(data);
        const map: Record<string, ProfileInfo> = {};
        data.forEach((r: any) => {
          if (r.profile) map[r.user_id] = r.profile;
        });
        setProfiles(map);
      }
    } catch {}
    setLoading(false);
  };

  const handleAction = async (id: string, status: "approved" | "rejected", userId: string, amount: number) => {
    try {
      await api.patch(`/admin/recharges/${id}`, { status, userId, amount });
      showSuccess(
        status === "approved" ? "Deposit approved" : "Deposit rejected",
        status === "approved" ? "Deposit validated and balance credited ✅" : "Deposit rejected ❌"
      );
      loadRecharges();
    } catch {
      showError("Error", "Error updating record");
    }
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
    return date.toLocaleDateString("en-US", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin — Deposits" showBack />

      <div className="px-4 pt-4 space-y-4">
        {/* Méthodes de dépôt acceptées */}
        <div className="bg-card rounded-2xl border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-primary flex-shrink-0" />
            <p className="text-xs font-bold text-foreground">Méthodes de dépôt acceptées</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "USDT BEP20", network: "BNB Smart Chain", color: "#26A17B", bg: "rgba(38,161,123,0.12)" },
              { label: "USDT TRC20", network: "TRON (TRC20)", color: "#EF0027", bg: "rgba(239,0,39,0.12)" },
              { label: "TRX", network: "TRON", color: "#EF0027", bg: "rgba(239,0,39,0.12)" },
              { label: "USDT Polygon", network: "Polygon (MATIC)", color: "#8247E5", bg: "rgba(130,71,229,0.12)" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: m.bg }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: m.color + "33", color: m.color }}>₮</div>
                <div>
                  <p className="text-[11px] font-bold text-foreground">{m.label}</p>
                  <p className="text-[9px] text-muted-foreground">{m.network}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setFilter("pending")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "pending" ? "border-warning" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-warning">{counts.pending}</span>
            <span className="text-[10px] text-muted-foreground">Pending</span>
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "approved" ? "border-success" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-success">{counts.approved}</span>
            <span className="text-[10px] text-muted-foreground">Approved</span>
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`bg-card rounded-xl border p-4 flex flex-col items-center gap-1 transition-colors ${filter === "rejected" ? "border-destructive" : "border-secondary"}`}
          >
            <span className="text-2xl font-bold text-destructive">{counts.rejected}</span>
            <span className="text-[10px] text-muted-foreground">Rejected</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by account, name or phone"
            className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-sm text-muted-foreground">No deposits</p></div>
        ) : filtered.map(r => {
          const profile = profiles[r.user_id];

          return (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    r.status === "pending" ? "bg-warning/15 text-warning" :
                    r.status === "approved" ? "bg-success/15 text-success" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {r.status === "pending" ? <Clock size={12} /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {r.status === "pending" ? "Pending" : r.status === "approved" ? "Approved" : "Rejected"}
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                  <CreditCard size={12} />
                  {(r.payment_method || "Mobile Money").toUpperCase()}
                </div>

                <div className="border-t border-secondary my-2" />

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Client:</p>
                    <p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Current balance:</p>
                    <p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Reference:</p>
                    <p className="text-xs font-semibold text-foreground font-mono">{r.transaction_ref || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Client name:</p>
                    <p className="text-xs font-semibold text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  {r.proof_image_url && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Payment proof:</p>
                      <button
                        onClick={() => setZoomedImage(r.proof_image_url)}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={r.proof_image_url}
                          alt="Payment proof"
                          className="w-full max-w-[200px] h-24 object-cover rounded-lg border border-secondary"
                        />
                        <div className="absolute inset-0 max-w-[200px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <ZoomIn size={20} className="text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date:</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => handleAction(r.id, "approved", r.user_id, r.amount)}
                      className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "rejected", r.user_id, r.amount)}
                      className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Payment proof</DialogTitle>
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-3 right-3 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Payment proof (enlarged)"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecharges;
