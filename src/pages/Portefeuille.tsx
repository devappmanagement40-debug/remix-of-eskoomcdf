import { ChevronRight, Wallet, Send, Zap, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const menuItems = [
  { label: "Historique des retraits", path: "/historique-retraits", hasChevron: true },
  { label: "Historique des fonds", path: "/historique-fonds", hasChevron: true },
  { label: "Energy Storage", path: "#", value: "0" },
  { label: "Points Cadeaux", path: "/points-cadeaux", value: "0", hasChevron: true },
];

const stats = [
  { label: "Revenu D'aujourd'hui", value: "0.00" },
  { label: "Revenu Total", value: "0.00" },
  { label: "Recharge Totale", value: "0.00" },
  { label: "Total Retraits", value: "0.00" },
];

const Portefeuille = () => {
  const navigate = useNavigate();

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
            <p className="text-4xl font-bold text-primary">0.00 <span className="text-base font-normal">FCFA</span></p>
          </div>

          {/* Portefeuil Recharge */}
          <div className="flex items-center justify-center mb-5">
            <span className="inline-flex items-center gap-2 bg-secondary text-muted-foreground text-xs px-4 py-1.5 rounded-full">
              Portefeuil Recharge <span className="text-primary font-semibold">0.00 FCFA</span>
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
            <button className="gradient-button text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <Wallet size={18} />
              Recharger
            </button>
            <button className="bg-gradient-to-r from-muted to-secondary text-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-secondary">
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
