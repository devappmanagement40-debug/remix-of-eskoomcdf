import { Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const Portefeuille = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Portefeuille" />
      <div className="px-4 pt-6">
        <div className="bg-card rounded-xl border border-secondary p-5 mb-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-3xl font-bold text-primary">0,00 FCFA</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="gradient-button text-foreground font-semibold py-3 rounded-xl text-sm">
            Recharger
          </button>
          <button className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm border border-muted hover:border-primary transition-colors">
            Retirer
          </button>
        </div>

        <h3 className="text-sm font-bold text-foreground mb-3">Historique</h3>
        <div className="flex flex-col items-center py-10">
          <Wallet size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Aucune transaction</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Portefeuille;
