import { useState, useEffect } from "react";
import { ChevronRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import bgDepot from "@/assets/bg-depot.png";
import bgGains from "@/assets/bg-gains.png";
import bgParrainage from "@/assets/bg-parrainage.png";
import bgTodayEarnings from "@/assets/bg-today-earnings.png";
import bgTotalRevenue from "@/assets/bg-total-revenue.png";
import bgTotalDeposit from "@/assets/bg-total-deposit.png";
import bgTotalWithdraw from "@/assets/bg-total-withdraw.png";
import { useLanguage } from "@/contexts/LanguageContext";

const Portefeuille = () => {
  const navigate = useNavigate();
  const { profile, loading } = useRealtimeProfile();
  const { t } = useLanguage();
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

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  const menuItems = [
    { label: t.wallet.withdrawalHistory, path: "/historique-retraits", hasChevron: true },
    { label: t.wallet.fundsHistory, path: "/historique-fonds", hasChevron: true },
    { label: t.wallet.energyStorage, path: "#", value: "0" },
    { label: t.wallet.eskomCurrency, path: "/points-cadeaux", value: "0", hasChevron: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={t.wallet.title} />
      <div className="px-4 pt-6 space-y-4">
        {/* Main Balance Card */}
        <div className="bg-card rounded-2xl border border-border/30 p-5">
          <p className="text-xs text-muted-foreground text-center mb-1">{t.wallet.totalBalance}</p>
          {loading ? (
            <div className="h-9 w-40 mx-auto bg-secondary/50 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-foreground text-center">{fmt(profile.balance)} <span className="text-sm font-normal text-muted-foreground">USDT</span></p>
          )}

          {/* Split balances */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="relative rounded-xl overflow-hidden min-h-[100px]">
              <img src={bgDepot} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 p-3 text-center flex flex-col justify-center h-full">
                <p className="text-[10px] text-white/80 mb-0.5">{t.wallet.depositLabel}</p>
                <p className="text-xs font-bold text-white">{profile.deposit_balance.toLocaleString("en-US")} USDT</p>
                {depositNotWithdrawable && <p className="text-[8px] text-red-400 mt-0.5">{t.wallet.nonWithdrawable}</p>}
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden min-h-[100px]">
              <img src={bgGains} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 p-3 text-center flex flex-col justify-center h-full">
                <p className="text-[10px] text-white/80 mb-0.5">{t.wallet.earningsLabel}</p>
                <p className="text-xs font-bold text-emerald-300">{profile.earnings_balance.toLocaleString("en-US")} USDT</p>
                <p className="text-[8px] text-emerald-400 mt-0.5">{t.wallet.withdrawable}</p>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden min-h-[100px]">
              <img src={bgParrainage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10 p-3 text-center flex flex-col justify-center h-full">
                <p className="text-[10px] text-white/80 mb-0.5">{t.wallet.referralLabel}</p>
                <p className="text-xs font-bold text-purple-300">{profile.referral_balance.toLocaleString("en-US")} USDT</p>
                <p className="text-[8px] text-purple-400 mt-0.5">{t.wallet.withdrawable}</p>
              </div>
            </div>
          </div>

          {/* Withdrawable */}
          <div className="mt-4 bg-secondary/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t.wallet.withdrawableBalance}</span>
            <span className="text-sm font-bold text-foreground">{fmt(withdrawable)} USDT</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => navigate("/recharge")} className="gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <ArrowDownLeft size={16} />
              {t.wallet.depositBtn}
            </button>
            <button onClick={() => navigate("/retrait")} className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-border/30">
              <ArrowUpRight size={16} />
              {t.wallet.withdrawBtn}
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
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.wallet.assets}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t.wallet.todayEarnings, value: fmt(todayEarnings), bg: bgTodayEarnings },
            { label: t.wallet.totalEarnings, value: fmt(profile.earnings_balance), bg: bgTotalRevenue },
            { label: t.wallet.totalDeposits, value: fmt(totalDeposits), bg: bgTotalDeposit },
            { label: t.wallet.totalWithdrawals, value: fmt(totalWithdrawals), bg: bgTotalWithdraw },
          ].map((stat) => (
            <div key={stat.label} className="relative rounded-2xl overflow-hidden min-h-[100px]">
              <img src={stat.bg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative z-10 p-4 text-center flex flex-col justify-center h-full">
                <p className="text-lg font-bold text-white">
                  {stat.value} <span className="text-[10px] font-normal text-white/70">USDT</span>
                </p>
                <p className="text-[10px] text-white/70 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portefeuille;
