import { History } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const Historique = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Historique" showBack />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center py-16">
          <History size={40} className="text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Aucune transaction pour le moment</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Historique;
