import { useState, useEffect } from "react";
import { ArrowDownLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type Retrait = {
  id: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  network: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_note: string | null;
};

const DetailRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-secondary/50 last:border-b-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
  </div>
);

const statusLabel = (s: string) => {
  if (s === "approved") return "Approuvé";
  if (s === "pending") return "En attente";
  if (s === "rejected") return "Refusé";
  return s;
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR") + " " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 });

const HistoriqueRetraits = () => {
  const [retraits, setRetraits] = useState<Retrait[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRetraits(data as Retrait[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("retraits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Historique des retraits" showBack />
      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : retraits.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <ArrowDownLeft size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Aucun retrait pour le moment</p>
          </div>
        ) : (
          retraits.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-secondary to-secondary/60">
                <span className="text-xs font-mono font-semibold text-foreground truncate max-w-[200px]">{r.id.slice(0, 18)}...</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  r.status === "approved" ? "bg-success text-success-foreground" : r.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
                }`}>{statusLabel(r.status)}</span>
              </div>
              <div className="px-4 pt-2 pb-3">
                <div className="grid grid-cols-2 gap-4 py-3 border-b border-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Montant du retrait</p>
                    <p className="text-lg font-bold text-foreground">{fmt(r.amount)} <span className="text-xs font-normal text-muted-foreground">CFA</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Montant reçu</p>
                    <p className="text-lg font-bold text-foreground">{fmt(r.net_amount)} <span className="text-xs font-normal text-muted-foreground">CFA</span></p>
                  </div>
                </div>
                <DetailRow label="Frais" value={`${fmt(r.fee_amount)} CFA`} />
                <DetailRow label="Réseau" value={r.network} />
                <DetailRow label="Numéro" value={r.phone} />
                <DetailRow label="Heure de la demande" value={fmtDate(r.created_at)} />
                <DetailRow label="État" value={statusLabel(r.status)} highlight />
                {r.admin_note && <DetailRow label="Note admin" value={r.admin_note} />}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoriqueRetraits;
