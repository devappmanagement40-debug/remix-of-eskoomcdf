import { useState, useEffect } from "react";
import { History, ArrowDownLeft, ArrowUpRight, ShoppingBag, TrendingUp, Gift } from "lucide-react";
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
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  icon: typeof ArrowDownLeft;
  color: string;
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

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [depositsRes, withdrawalsRes, purchasesRes, exchangesRes] = await Promise.all([
          supabase.from("recharges").select("id, amount, status, created_at, payment_method").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("withdrawals").select("id, amount, net_amount, fee_amount, status, created_at, network").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("user_products").select("id, purchased_at, total_collected, products(name, price, daily_revenue)").eq("user_id", user.id).order("purchased_at", { ascending: false }),
          supabase.from("point_exchanges").select("id, points_spent, money_credited, reward_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);

        const ops: Operation[] = [];

        (depositsRes.data || []).forEach((d: any) => {
          ops.push({
            id: `dep-${d.id}`, type: "depots", amount: d.amount, date: d.created_at,
            status: d.status, description: `Dépôt via ${d.payment_method || "Mobile Money"}`,
            icon: ArrowDownLeft, color: "text-success",
          });
        });

        (withdrawalsRes.data || []).forEach((w: any) => {
          ops.push({
            id: `ret-${w.id}`, type: "retraits", amount: w.amount, date: w.created_at,
            status: w.status, description: `Retrait via ${w.network}`,
            icon: ArrowUpRight, color: "text-destructive",
          });
        });

        (purchasesRes.data || []).forEach((p: any) => {
          const product = p.products;
          ops.push({
            id: `ach-${p.id}`, type: "achats", amount: Number(product?.price) || 0, date: p.purchased_at,
            status: "completed", description: `Achat : ${product?.name || "Produit"}`,
            icon: ShoppingBag, color: "text-primary",
          });
          if ((p.total_collected || 0) > 0) {
            ops.push({
              id: `gain-${p.id}`, type: "gains", amount: p.total_collected, date: p.purchased_at,
              status: "completed", description: `Gains : ${product?.name || "Produit"}`,
              icon: TrendingUp, color: "text-success",
            });
          }
        });

        (exchangesRes.data || []).forEach((ex: any) => {
          ops.push({
            id: `pts-${ex.id}`, type: "points", amount: ex.money_credited, date: ex.created_at,
            status: "completed", description: `Conversion : ${ex.reward_name} (${ex.points_spent} pts)`,
            icon: Gift, color: "text-primary",
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

    // Realtime subscriptions
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
              <div key={op.id} className="bg-card rounded-xl border border-border/30 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0`}>
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
      <BottomNav />
    </div>
  );
};

export default Historique;
