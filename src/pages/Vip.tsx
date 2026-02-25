import { Crown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const vipLevels = [
  { level: "VIP 1", requirement: "10 000 FCFA", bonus: "5%" },
  { level: "VIP 2", requirement: "50 000 FCFA", bonus: "8%" },
  { level: "VIP 3", requirement: "100 000 FCFA", bonus: "12%" },
  { level: "VIP 4", requirement: "500 000 FCFA", bonus: "18%" },
];

const Vip = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="VIP" />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
            <Crown size={28} className="text-warning" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Montez en grade VIP pour débloquer des bonus exclusifs.
          </p>
        </div>
        <div className="space-y-3">
          {vipLevels.map((v) => (
            <div
              key={v.level}
              className="bg-card rounded-xl border border-secondary p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-foreground">{v.level}</p>
                <p className="text-xs text-muted-foreground">Investissement min: {v.requirement}</p>
              </div>
              <span className="text-primary font-bold text-sm">+{v.bonus}</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Vip;
