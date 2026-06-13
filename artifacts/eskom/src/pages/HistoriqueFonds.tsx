import { useState, useEffect } from "react";
import { Banknote, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type FundEntry = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  date: string;
  method: string;
};

const statusLabel = (s: string) => {
  if (s === "approved") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
  return s;
};

const statusColor = (s: string) => {
  if (s === "approved") return "text-success";
  if (s === "pending") return "text-warning";
  if (s === "rejected") return "text-destructive";
  return "text-muted-foreground";
};

const HistoriqueFonds = () => {
  const [entries, setEntries] = useState<FundEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [depRes, retRes] = await Promise.all([
      supabase.from("recharges").select("id, amount, status, created_at, payment_method").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("id, amount, status, created_at, network").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const items: FundEntry[] = [];
    (depRes.data || []).forEach((d: any) => items.push({ id: d.id, type: "deposit", amount: d.amount, status: d.status, date: d.created_at, method: d.payment_method || "Mobile Money" }));
    (retRes.data || []).forEach((w: any) => items.push({ id: w.id, type: "withdrawal", amount: w.amount, status: w.status, date: w.created_at, method: w.network }));
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("fonds-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recharges" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { timeZone: "America/Port-au-Prince" }) + " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Fund History" showBack />
      <div className="px-4 pt-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Banknote size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No transactions recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="bg-card rounded-xl border border-border/30 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {e.type === "deposit" ? <ArrowDownLeft size={18} className="text-success" /> : <ArrowUpRight size={18} className="text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{e.type === "deposit" ? "Deposit" : "Withdrawal"} via {e.method}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(e.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${e.type === "deposit" ? "text-success" : "text-destructive"}`}>
                    {e.type === "deposit" ? "+" : "-"}{fmt(e.amount)} USDT
                  </p>
                  <p className={`text-[10px] font-semibold ${statusColor(e.status)}`}>{statusLabel(e.status)}</p>
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

export default HistoriqueFonds;
