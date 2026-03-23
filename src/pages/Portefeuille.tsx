import { useState, useEffect } from "react";
import { ChevronRight, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const menuItems = [
  { label: "Historique des retraits", path: "/historique-retraits", hasChevron: true },
  { label: "Historique des fonds", path: "/historique-fonds", hasChevron: true },
  { label: "Energy Storage", path: "#", value: "0" },
  { label: "Monnaie Eskom", path: "/points-cadeaux", value: "0", hasChevron: true },
];

const Portefeuille = () => {
  const navigate = useNavigate();
  const { profile, loading } = useRealtimeProfile();
  const [depositNotWithdrawable, setDepositNotWithdrawable] = useState(true);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    const loadExtra = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const [settingsRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "deposit_not_withdrawable").single(),
        supabase.from("recharges").select("amount").eq("user_id", user.id).eq("status", "approved"),
        supabase.from("withdrawals").select("amount").eq("user_id", user.id).eq("status", "approved"),
      ]);
      if (settingsRes.data) setDepositNotWithdrawable(settingsRes.data.value === "true");
      if (depositsRes.data) setTotalDeposits(depositsRes.data.reduce((s, r) => s + r.amount, 0));
      if (withdrawalsRes.data) setTotalWithdrawals(withdrawalsRes.data.reduce((s, w) => s + w.amount, 0));
    };
    loadExtra();

    // Realtime for deposits/withdrawals totals
    const channel = supabase
      .channel("wallet-totals")
      .on("postgres_changes", { event: "*", schema: "public", table: "recharges" }, () => loadExtra())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => loadExtra())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const withdrawable = depositNotWithdrawable
    ? profile.earnings_balance + profile.referral_balance
    : profile.balance;

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Portefeuille" />
      <div className="px-4 pt-6 space-y-4">
        {/* Main Balance Card */}
        <div className="bg-card rounded-2xl border border-border/30 p-5">
          <p className="text-xs text-muted-foreground text-center mb-1">Solde total</p>
          {loading ? (
            <div className="h-9 w-40 mx-auto bg-secondary/50 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-foreground text-center">{fmt(profile.balance)} <span className="text-sm font-normal text-muted-foreground">XAF</span></p>
          )}

          {/* Split balances */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Depot</p>
              <p className="text-xs font-bold text-foreground">{profile.deposit_balance.toLocaleString("fr-FR")} F</p>
              {depositNotWithdrawable && <p className="text-[8px] text-destructive mt-0.5">Non retirable</p>}
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Gains</p>
              <p className="text-xs font-bold text-success">{profile.earnings_balance.toLocaleString("fr-FR")} F</p>
              <p className="text-[8px] text-success mt-0.5">Retirable</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Parrainage</p>
              <p className="text-xs font-bold text-primary">{profile.referral_balance.toLocaleString("fr-FR")} F</p>
              <p className="text-[8px] text-primary mt-0.5">Retirable</p>
            </div>
          </div>

          {/* Withdrawable */}
          <div className="mt-4 bg-secondary/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Solde retirable</span>
            <span className="text-sm font-bold text-foreground">{fmt(withdrawable)} XAF</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => navigate("/recharge")} className="gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <ArrowDownLeft size={16} />
              Deposer
            </button>
            <button onClick={() => navigate("/retrait")} className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-border/30">
              <ArrowUpRight size={16} />
              Retrait
            </button>
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-card rounded-2xl border border-border/30">
          {menuItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className={`w-full flex items-center justify-between px-5 py-3.5 ${
                idx < menuItems.length - 1 ? "border-b border-border/20" : ""
              }`}
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <div className="flex items-center gap-1">
                {item.value !== undefined && (
                  <span className="text-sm font-semibold text-muted-foreground">{item.value}</span>
                )}
                {item.hasChevron && <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            </button>
          ))}
        </div>

        {/* Statistics */}
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Statistiques</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Revenu d'aujourd'hui", value: fmt(todayEarnings), icon: TrendingUp },
            { label: "Revenu total", value: fmt(profile.earnings_balance), icon: TrendingUp },
            { label: "Recharge totale", value: fmt(totalDeposits), icon: ArrowDownLeft },
            { label: "Total retraits", value: fmt(totalWithdrawals), icon: ArrowUpRight },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border/30 p-4 text-center">
              <p className="text-lg font-bold text-foreground">
                {stat.value} <span className="text-[10px] font-normal text-muted-foreground">XAF</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portefeuille;
