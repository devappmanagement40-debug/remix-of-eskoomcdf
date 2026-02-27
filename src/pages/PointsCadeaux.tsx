import { Gift, Star, ArrowRightLeft, Clock, Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

const rewardItems = [
  { name: "Bonus 500 FCFA", points: 100, icon: Gift },
  { name: "Bonus 2 000 FCFA", points: 350, icon: Star },
  { name: "Bonus 5 000 FCFA", points: 800, icon: Trophy },
  { name: "Bonus 10 000 FCFA", points: 1500, icon: Trophy },
];

const PointsCadeaux = () => {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      if (data) setFullName(data.full_name || "");
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Points Cadeaux" showBack />
      <div className="px-4 pt-6 space-y-4">

        {/* Points balance card */}
        <div className="relative bg-card rounded-2xl border border-secondary p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift size={28} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Points disponibles</p>
              <p className="text-3xl font-bold text-primary">{points}</p>
            </div>
          </div>
          {fullName && (
            <p className="text-xs text-muted-foreground mt-3">Bonjour, <span className="text-foreground font-medium">{fullName}</span></p>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/echanger-code")}
            className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors"
          >
            <ArrowRightLeft size={20} className="text-primary" />
            <span className="text-[11px] font-medium text-foreground">Échanger code</span>
          </button>
          <button
            onClick={() => navigate("/historique")}
            className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors"
          >
            <Clock size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Historique</span>
          </button>
          <button
            onClick={() => navigate("/equipe")}
            className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors"
          >
            <Star size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Gagner plus</span>
          </button>
        </div>

        {/* Comment gagner */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Comment gagner des points ?</h2>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Investissez dans un produit pour recevoir des points quotidiens
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Invitez des amis et gagnez des points bonus par niveau
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Utilisez un code d'échange pour obtenir des points gratuits
            </li>
          </ul>
        </div>

        {/* Rewards catalog */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Récompenses disponibles</h2>
          <div className="space-y-3">
            {rewardItems.map((item) => (
              <div
                key={item.name}
                className="bg-card rounded-xl border border-secondary p-4 flex items-center justify-between hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.points} points requis</p>
                  </div>
                </div>
                <button
                  disabled={points < item.points}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold gradient-button text-primary-foreground disabled:opacity-40"
                >
                  Échanger
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PointsCadeaux;
