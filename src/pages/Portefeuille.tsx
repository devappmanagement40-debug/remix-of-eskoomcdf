import { useState, useEffect } from "react";
import { ChevronRight, Wallet, Send, Zap, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const menuItems = [
  { label: "Historique des retraits", path: "/historique-retraits", hasChevron: true },
  { label: "Historique des fonds", path: "/historique-fonds", hasChevron: true },
  { label: "Energy Storage", path: "#", value: "0" },
  { label: "Points Cadeaux", path: "/points-cadeaux", value: "0", hasChevron: true },
];

const Portefeuille = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [depositBalance, setDepositBalance] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [depositNotWithdrawable, setDepositNotWithdrawable] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("balance, deposit_balance, earnings_balance, referral_balance").eq("user_id", user.id).single(),
      supabase.from("site_settings").select("value").eq("key", "deposit_not_withdrawable").single(),
    ]);
    if (profileRes.data) {
      setBalance(profileRes.data.balance || 0);
      setDepositBalance(profileRes.data.deposit_balance || 0);
      setEarningsBalance(profileRes.data.earnings_balance || 0);
      setReferralBalance(profileRes.data.referral_balance || 0);
    }
    if (settingsRes.data) setDepositNotWithdrawable(settingsRes.data.value === "true");
  };

  const withdrawable = depositNotWithdrawable
    ? earningsBalance + referralBalance
    : balance;

  const stats = [
    { label: "Revenu D'aujourd'hui", value: "0.00" },
    { label: "Revenu Total", value: earningsBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) },
    { label: "Recharge Totale", value: depositBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) },
    { label: "Total Retraits", value: "0.00" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Portefeuille" />
      <div className="px-4 pt-6">
        {/* Main Card */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-6">
          {/* Portefeuil Revenus */}
          <div className="text-center mb-4">
            <span className="inline-block bg-secondary text-muted-foreground text-xs px-4 py-1.5 rounded-full mb-3">
              Portefeuil Revenus
            </span>
            <p className="text-4xl font-bold text-primary">{earningsBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-base font-normal">FCFA</span></p>
          </div>

          {/* Split balances */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Dépôt</p>
              <p className="text-xs font-bold text-foreground">{depositBalance.toLocaleString("fr-FR")} F</p>
              {depositNotWithdrawable && <p className="text-[8px] text-destructive">Non retirable</p>}
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Gains</p>
              <p className="text-xs font-bold text-success">{earningsBalance.toLocaleString("fr-FR")} F</p>
              <p className="text-[8px] text-success">Retirable</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Parrainage</p>
              <p className="text-xs font-bold text-primary">{referralBalance.toLocaleString("fr-FR")} F</p>
              <p className="text-[8px] text-primary">Retirable</p>
            </div>
          </div>

          {/* Portefeuil Recharge */}
          <div className="flex items-center justify-center mb-5">
            <span className="inline-flex items-center gap-2 bg-secondary text-muted-foreground text-xs px-4 py-1.5 rounded-full">
              Solde retirable <span className="text-primary font-semibold">{withdrawable.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} FCFA</span>
            </span>
          </div>

          {/* Menu List */}
          <div className="space-y-0">
            {menuItems.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => item.path !== "#" && navigate(item.path)}
                className={`w-full flex items-center justify-between py-3.5 ${
                  idx < menuItems.length - 1 ? "border-b border-secondary" : ""
                }`}
              >
                <span className="text-sm text-foreground">{item.label}</span>
                <div className="flex items-center gap-1">
                  {item.value && (
                    <span className="text-sm font-semibold text-primary">{item.value}</span>
                  )}
                  {item.hasChevron && (
                    <ChevronRight size={18} className="text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => navigate("/recharge")} className="gradient-button text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <Wallet size={18} />
              Recharger
            </button>
            <button onClick={() => navigate("/retrait")} className="bg-gradient-to-r from-muted to-secondary text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-secondary">
              <Send size={18} />
              Retrait
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Statistiques</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-secondary p-4 text-center"
            >
              <p className="text-xl font-bold text-primary">
                {stat.value} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portefeuille;
