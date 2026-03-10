import { useState, useEffect } from "react";
import { History, ArrowDownLeft, ArrowUpRight, ShoppingBag, TrendingUp, Gift, Users, X, Copy, CheckCircle2 } from "lucide-react";
import { safeClipboardWrite } from "@/lib/clipboard";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type TabKey = "tous" | "depots" | "retraits" | "achats" | "gains" | "points";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "depots", label: "Dépôts" },
  { key: "retraits", label: "Retraits" },
  { key: "achats", label: "Achats" },
  { key: "gains", label: "Gains" },
  { key: "points", label: "Points" },
];

type Operation = {
  id: string;
  rawId: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  icon: typeof ArrowDownLeft;
  color: string;
  details: Record<string, string>;
};

const statusLabel = (s: string) => {
  if (s === "approved" || s === "completed") return "Validé";
  if (s === "pending") return "En attente";
  if (s === "rejected") return "Refusé";
  return s;
};

const statusColor = (s: string) => {
  if (s === "approved" || s === "completed") return "text-success";
  if (s === "pending") return "text-warning";
  if (s === "rejected") return "text-destructive";
  return "text-muted-foreground";
};

const Historique = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("tous");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    await safeClipboardWrite(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [depositsRes, withdrawalsRes, purchasesRes, exchangesRes] = await Promise.all([
          supabase.from("recharges").select("id, amount, status, created_at, payment_method, phone, country_code, transaction_ref").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("withdrawals").select("id, amount, net_amount, fee_amount, status, created_at, network, phone, country_code").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("user_products").select("id, purchased_at, total_collected, products(name, price, daily_revenue, cycles)").eq("user_id", user.id).order("purchased_at", { ascending: false }),
          supabase.from("point_exchanges").select("id, points_spent, money_credited, reward_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);

        const ops: Operation[] = [];

        (depositsRes.data || []).forEach((d: any) => {
          ops.push({
            id: `dep-${d.id}`, rawId: d.id, type: "depots", amount: d.amount, date: d.created_at,
            status: d.status, description: `Dépôt via ${d.payment_method || "Mobile Money"}`,
            icon: ArrowDownLeft, color: "text-success",
            details: {
              "N° de commande": d.id.substring(0, 8).toUpperCase(),
              "Type": "Dépôt / Recharge",
              "Montant": `${Number(d.amount).toLocaleString("fr-FR")} F`,
              "Moyen de paiement": d.payment_method || "Mobile Money",
              "Téléphone": `${d.country_code || ""} ${d.phone || ""}`,
              "Réf. transaction": d.transaction_ref || "—",
              "Statut": statusLabel(d.status),
              "Date": fmtDateFull(d.created_at),
            },
          });
        });

        (withdrawalsRes.data || []).forEach((w: any) => {
          ops.push({
            id: `ret-${w.id}`, rawId: w.id, type: "retraits", amount: w.amount, date: w.created_at,
            status: w.status, description: `Retrait via ${w.network}`,
            icon: ArrowUpRight, color: "text-destructive",
            details: {
              "N° de commande": w.id.substring(0, 8).toUpperCase(),
              "Type": "Retrait",
              "Montant demandé": `${Number(w.amount).toLocaleString("fr-FR")} F`,
              "Frais": `${Number(w.fee_amount).toLocaleString("fr-FR")} F`,
              "Montant reçu": `${Number(w.net_amount).toLocaleString("fr-FR")} F`,
              "Réseau": w.network || "—",
              "Téléphone": `${w.country_code || ""} ${w.phone || ""}`,
              "Statut": statusLabel(w.status),
              "Date": fmtDateFull(w.created_at),
            },
          });
        });

        (purchasesRes.data || []).forEach((p: any) => {
          const product = p.products;
          ops.push({
            id: `ach-${p.id}`, rawId: p.id, type: "achats", amount: Number(product?.price) || 0, date: p.purchased_at,
            status: "completed", description: `Achat : ${product?.name || "Produit"}`,
            icon: ShoppingBag, color: "text-primary",
            details: {
              "N° de commande": p.id.substring(0, 8).toUpperCase(),
              "Type": "Achat de produit",
              "Produit": product?.name || "—",
              "Prix": `${Number(product?.price || 0).toLocaleString("fr-FR")} F`,
              "Revenu journalier": `${Number(product?.daily_revenue || 0).toLocaleString("fr-FR")} F`,
              "Durée": `${product?.cycles || 365} jours`,
              "Gains collectés": `${Number(p.total_collected || 0).toLocaleString("fr-FR")} F`,
              "Statut": "Validé",
              "Date d'achat": fmtDateFull(p.purchased_at),
            },
          });
          if ((p.total_collected || 0) > 0) {
            ops.push({
              id: `gain-${p.id}`, rawId: p.id, type: "gains", amount: p.total_collected, date: p.purchased_at,
              status: "completed", description: `Gains : ${product?.name || "Produit"}`,
              icon: TrendingUp, color: "text-success",
              details: {
                "N° de commande": p.id.substring(0, 8).toUpperCase(),
                "Type": "Gains produit",
                "Produit": product?.name || "—",
                "Total collecté": `${Number(p.total_collected).toLocaleString("fr-FR")} F`,
                "Statut": "Validé",
                "Date": fmtDateFull(p.purchased_at),
              },
            });
          }
        });

        (exchangesRes.data || []).forEach((ex: any) => {
          ops.push({
            id: `pts-${ex.id}`, rawId: ex.id, type: "points", amount: ex.money_credited, date: ex.created_at,
            status: "completed", description: `Conversion : ${ex.reward_name} (${ex.points_spent} pts)`,
            icon: Gift, color: "text-primary",
            details: {
              "N° de commande": ex.id.substring(0, 8).toUpperCase(),
              "Type": "Échange de points",
              "Récompense": ex.reward_name,
              "Points dépensés": `${ex.points_spent} pts`,
              "Montant crédité": `${Number(ex.money_credited).toLocaleString("fr-FR")} F`,
              "Statut": "Validé",
              "Date": fmtDateFull(ex.created_at),
            },
          });
        });

        ops.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOperations(ops);
      } catch (err) {
        console.error("Historique load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel("history-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recharges" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_products" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = activeTab === "tous" ? operations : operations.filter((o) => o.type === activeTab);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("fr-FR") + " " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Historique" showBack />
      <div className="px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "gradient-button text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <History size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Aucune opération dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((op) => (
              <div
                key={op.id}
                onClick={() => setSelectedOp(op)}
                className="bg-card rounded-xl border border-border/30 p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <op.icon size={18} className={op.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{op.description}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(op.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${op.type === "retraits" ? "text-destructive" : "text-success"}`}>
                    {op.type === "retraits" ? "-" : "+"}{fmt(op.amount)} F
                  </p>
                  <p className={`text-[10px] font-semibold ${statusColor(op.status)}`}>
                    {statusLabel(op.status)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedOp && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-in fade-in duration-200"
          onClick={() => setSelectedOp(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{
                background: selectedOp.type === "retraits"
                  ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%))"
                  : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%), hsl(210 70% 50%))",
              }}
            >
              <div className="flex items-center gap-2">
                <selectedOp.icon size={20} className="text-white" />
                <h3 className="text-white font-bold text-base">Reçu de transaction</h3>
              </div>
              <button onClick={() => setSelectedOp(null)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            {/* Amount highlight */}
            <div className="bg-card px-5 py-4 text-center border-b border-border/20">
              <p className={`text-2xl font-black ${selectedOp.type === "retraits" ? "text-destructive" : "text-success"}`}>
                {selectedOp.type === "retraits" ? "-" : "+"}{fmt(selectedOp.amount)} F
              </p>
              <p className="text-xs text-muted-foreground mt-1">{selectedOp.description}</p>
            </div>

            {/* Details */}
            <div className="bg-card px-5 py-3 max-h-[50vh] overflow-y-auto">
              {Object.entries(selectedOp.details).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold text-foreground text-right max-w-[180px] truncate ${
                      key === "Statut" ? statusColor(selectedOp.status) : ""
                    }`}>
                      {value}
                    </span>
                    {(key === "N° de commande" || key === "Réf. transaction") && value !== "—" && (
                      <button
                        onClick={() => copyText(value, key)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === key ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-card px-5 py-4 border-t border-border/20">
              <button
                onClick={() => setSelectedOp(null)}
                className="w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{
                  background: selectedOp.type === "retraits"
                    ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%))"
                    : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

function fmtDateFull(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " à " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default Historique;
