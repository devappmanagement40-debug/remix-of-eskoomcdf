import { useState, useEffect } from "react";
import { History, ArrowDownLeft, ArrowUpRight, ShoppingBag, TrendingUp, Gift, Users, X, Copy, CheckCircle2 } from "lucide-react";
import { safeClipboardWrite } from "@/lib/clipboard";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { getAuthToken } from "@/integrations/supabase/client";

type TabKey = "tous" | "depots" | "retraits" | "achats" | "gains" | "parrainage" | "points";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tous", label: "All" },
  { key: "depots", label: "Deposits" },
  { key: "retraits", label: "Withdrawals" },
  { key: "achats", label: "Purchases" },
  { key: "gains", label: "Earnings" },
  { key: "parrainage", label: "Referral" },
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
  if (s === "approved" || s === "completed") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
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
      const token = getAuthToken();
      if (!token) { setLoading(false); return; }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [depositsRes, withdrawalsRes, purchasesRes, exchangesRes, commissionsRes] = await Promise.all([
          fetch("/api/payments/recharges/my", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/payments/withdrawals/my", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/products/user-products/my", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/point-exchanges/my", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/referral-commissions/my", { headers }).then(r => r.ok ? r.json() : []),
        ]);

        const ops: Operation[] = [];

        (Array.isArray(depositsRes) ? depositsRes : []).forEach((d: any) => {
          ops.push({
            id: `dep-${d.id}`, rawId: d.id, type: "depots", amount: Number(d.amount), date: d.createdAt ?? d.created_at,
            status: d.status, description: `Deposit via ${d.paymentMethod ?? d.payment_method ?? "USDT"}`,
            icon: ArrowDownLeft, color: "text-success",
            details: {
              "Order #": d.id.substring(0, 8).toUpperCase(),
              "Type": "Deposit / Top-up",
              "Amount": `${Number(d.amount).toLocaleString("en-US")} USDT`,
              "Payment method": d.paymentMethod ?? d.payment_method ?? "USDT",
              "Phone": `${d.countryCode ?? d.country_code ?? ""} ${d.phone ?? ""}`,
              "Transaction ref": d.transactionRef ?? d.transaction_ref ?? "—",
              "Status": statusLabel(d.status),
              "Date": fmtDateFull(d.createdAt ?? d.created_at),
            },
          });
        });

        (Array.isArray(withdrawalsRes) ? withdrawalsRes : []).forEach((w: any) => {
          ops.push({
            id: `ret-${w.id}`, rawId: w.id, type: "retraits", amount: Number(w.amount), date: w.createdAt ?? w.created_at,
            status: w.status, description: `Withdrawal via ${w.network}`,
            icon: ArrowUpRight, color: "text-destructive",
            details: {
              "Order #": w.id.substring(0, 8).toUpperCase(),
              "Type": "Withdrawal",
              "Requested amount": `${Number(w.amount).toLocaleString("en-US")} USDT`,
              "Fee": `${Number(w.feeAmount ?? w.fee_amount ?? 0).toLocaleString("en-US")} USDT`,
              "Amount received": `${Number(w.netAmount ?? w.net_amount ?? 0).toLocaleString("en-US")} USDT`,
              "Network": w.network || "—",
              "Phone": `${w.countryCode ?? w.country_code ?? ""} ${w.phone ?? ""}`,
              "Status": statusLabel(w.status),
              "Date": fmtDateFull(w.createdAt ?? w.created_at),
            },
          });
        });

        (Array.isArray(purchasesRes) ? purchasesRes : []).forEach((p: any) => {
          const product = p.product ?? p.products;
          ops.push({
            id: `ach-${p.id}`, rawId: p.id, type: "achats", amount: Number(product?.price ?? 0), date: p.purchasedAt ?? p.purchased_at,
            status: "completed", description: `Purchase: ${product?.name ?? "Product"}`,
            icon: ShoppingBag, color: "text-primary",
            details: {
              "Order #": p.id.substring(0, 8).toUpperCase(),
              "Type": "Product purchase",
              "Product": product?.name ?? "—",
              "Price": `${Number(product?.price ?? 0).toLocaleString("en-US")} USDT`,
              "Daily revenue": `${Number(product?.dailyRevenue ?? product?.daily_revenue ?? 0).toLocaleString("en-US")} USDT`,
              "Duration": `${product?.cycles ?? 365} days`,
              "Earnings collected": `${Number(p.totalCollected ?? p.total_collected ?? 0).toLocaleString("en-US")} USDT`,
              "Status": "Approved",
              "Purchase date": fmtDateFull(p.purchasedAt ?? p.purchased_at),
            },
          });
          if ((p.totalCollected ?? p.total_collected ?? 0) > 0) {
            ops.push({
              id: `gain-${p.id}`, rawId: p.id, type: "gains", amount: Number(p.totalCollected ?? p.total_collected), date: p.purchasedAt ?? p.purchased_at,
              status: "completed", description: `Earnings: ${product?.name ?? "Product"}`,
              icon: TrendingUp, color: "text-success",
              details: {
                "Order #": p.id.substring(0, 8).toUpperCase(),
                "Type": "Product earnings",
                "Product": product?.name ?? "—",
                "Total collected": `${Number(p.totalCollected ?? p.total_collected).toLocaleString("en-US")} USDT`,
                "Status": "Approved",
                "Date": fmtDateFull(p.purchasedAt ?? p.purchased_at),
              },
            });
          }
        });

        (Array.isArray(exchangesRes) ? exchangesRes : []).forEach((ex: any) => {
          ops.push({
            id: `pts-${ex.id}`, rawId: ex.id, type: "points", amount: Number(ex.moneyCredited ?? ex.money_credited), date: ex.createdAt ?? ex.created_at,
            status: "completed", description: `Conversion: ${ex.rewardName ?? ex.reward_name} (${ex.pointsSpent ?? ex.points_spent} pts)`,
            icon: Gift, color: "text-primary",
            details: {
              "Order #": ex.id.substring(0, 8).toUpperCase(),
              "Type": "Points exchange",
              "Reward": ex.rewardName ?? ex.reward_name,
              "Points spent": `${ex.pointsSpent ?? ex.points_spent} pts`,
              "Amount credited": `${Number(ex.moneyCredited ?? ex.money_credited).toLocaleString("en-US")} USDT`,
              "Status": "Approved",
              "Date": fmtDateFull(ex.createdAt ?? ex.created_at),
            },
          });
        });

        (Array.isArray(commissionsRes) ? commissionsRes : []).forEach((c: any) => {
          const levelLabel = c.level === 'B' ? 'Level E (direct)' : c.level === 'C' ? 'Level F' : 'Level G';
          ops.push({
            id: `ref-${c.id}`, rawId: c.id, type: "parrainage", amount: Number(c.commissionAmount ?? c.commission_amount), date: c.createdAt ?? c.created_at,
            status: "completed", description: `Referral bonus ${levelLabel}`,
            icon: Users, color: "text-success",
            details: {
              "Order #": c.id.substring(0, 8).toUpperCase(),
              "Type": "Referral bonus",
              "Level": levelLabel,
              "Product price": `${Number(c.productPrice ?? c.product_price).toLocaleString("en-US")} USDT`,
              "Rate": `${c.commissionRate ?? c.commission_rate}%`,
              "Bonus received": `${Number(c.commissionAmount ?? c.commission_amount).toLocaleString("en-US")} USDT`,
              "Status": "Approved",
              "Date": fmtDateFull(c.createdAt ?? c.created_at),
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
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = activeTab === "tous" ? operations : operations.filter((o) => o.type === activeTab);
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { timeZone: "America/Port-au-Prince" }) + " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="History" showBack />
      <div className="px-4 pt-4">
        <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key ? "gradient-button text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <History size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No transactions in this category</p>
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
                    {op.type === "retraits" ? "-" : "+"}{fmt(op.amount)} USDT
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

      {selectedOp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-in fade-in duration-200" onClick={() => setSelectedOp(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: selectedOp.type === "retraits" ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%))" : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%), hsl(210 70% 50%))" }}
            >
              <div className="flex items-center gap-2">
                <selectedOp.icon size={20} className="text-white" />
                <h3 className="text-white font-bold text-base">Transaction receipt</h3>
              </div>
              <button onClick={() => setSelectedOp(null)} className="text-white/80 hover:text-white"><X size={22} /></button>
            </div>
            <div className="bg-card px-5 py-4 text-center border-b border-border/20">
              <p className={`text-2xl font-black ${selectedOp.type === "retraits" ? "text-destructive" : "text-success"}`}>
                {selectedOp.type === "retraits" ? "-" : "+"}{fmt(selectedOp.amount)} USDT
              </p>
              <p className="text-xs text-muted-foreground mt-1">{selectedOp.description}</p>
            </div>
            <div className="bg-card px-5 py-3 max-h-[50vh] overflow-y-auto">
              {Object.entries(selectedOp.details).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold text-foreground text-right max-w-[180px] truncate ${key === "Status" ? statusColor(selectedOp.status) : ""}`}>{value}</span>
                    {(key === "Order #" || key === "Transaction ref") && value !== "—" && (
                      <button onClick={() => copyText(value, key)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {copied === key ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card px-5 py-4 border-t border-border/20">
              <button
                onClick={() => setSelectedOp(null)}
                className="w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: selectedOp.type === "retraits" ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%))" : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))" }}
              >
                Close
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
  return dt.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Port-au-Prince" }) +
    " at " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Port-au-Prince" });
}

export default Historique;
