import { Banknote } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const HistoriqueFonds = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Historique des fonds" showBack />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center py-16">
          <Banknote size={40} className="text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Aucun fond enregistré pour le moment</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoriqueFonds;
