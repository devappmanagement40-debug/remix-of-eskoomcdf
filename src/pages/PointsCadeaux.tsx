import { Gift } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const PointsCadeaux = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Points Cadeaux" showBack />
      <div className="px-4 pt-6">
        {/* Points balance */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Points disponibles</p>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>

        <div className="flex flex-col items-center py-10">
          <Gift size={40} className="text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Aucun point cadeau pour le moment</p>
          <p className="text-xs text-muted-foreground mt-2 text-center max-w-xs">
            Gagnez des points en investissant dans nos produits et échangez-les contre des récompenses exclusives.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PointsCadeaux;
