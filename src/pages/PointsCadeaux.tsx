import { Gift, Star, ArrowRightLeft, Clock, Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";

type Reward = {
  id: string;
  name: string;
  points_required: number;
  image_url: string | null;
  is_active: boolean;
};

const PointsCadeaux = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [points, setPoints] = useState(0);
  const [fullName, setFullName] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [howToEarn, setHowToEarn] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, rewardsRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, gift_points").eq("user_id", user.id).single(),
        supabase.from("gift_rewards").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("site_settings").select("key, value").in("key", [
          "points_per_active_member", "points_per_vip_level_per_day",
          "points_per_deposit_value", "points_per_withdrawal"
        ]),
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
        setPoints((profileRes.data as any).gift_points || 0);
      }
      if (rewardsRes.data) setRewards(rewardsRes.data as Reward[]);

      // Build dynamic "how to earn" list
      if (settingsRes.data) {
        const tips: string[] = [];
        const get = (k: string) => settingsRes.data?.find(s => s.key === k)?.value;
        const pam = get("points_per_active_member");
        const pvip = get("points_per_vip_level_per_day");
        const pdep = get("points_per_deposit_value");
        const pw = get("points_per_withdrawal");
        if (pam && Number(pam) > 0) tips.push(`Chaque membre actif vous rapporte ${pam} points`);
        if (pvip && Number(pvip) > 0) tips.push(`Gagnez ${pvip} points par niveau VIP chaque jour`);
        if (pdep && Number(pdep) > 0) tips.push(`Chaque depot vous rapporte ${pdep} points`);
        if (pw && Number(pw) > 0) tips.push(`Chaque retrait vous rapporte ${pw} points`);
        tips.push("Invitez des amis et gagnez des points bonus par niveau");
        tips.push("Utilisez un code d'echange pour obtenir des points gratuits");
        setHowToEarn(tips);
      }
    };
    load();
  }, []);

  const handleExchange = async (reward: Reward) => {
    if (points < reward.points_required) {
      showError("Points insuffisants", `Il vous faut ${reward.points_required} points pour echanger ce cadeau.`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deduct points
    const newPoints = points - reward.points_required;
    const { error } = await supabase.from("profiles").update({ gift_points: newPoints } as any).eq("user_id", user.id);
    if (error) { showError("Erreur", "Une erreur est survenue"); return; }
    setPoints(newPoints);
    showSuccess("Cadeau echange", `Vous avez echange "${reward.name}" avec succes.`);
  };

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
            <span className="text-[11px] font-medium text-foreground">Echanger code</span>
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
            {howToEarn.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Rewards catalog */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Recompenses disponibles</h2>
          {rewards.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune recompense disponible pour le moment</p>
          ) : (
            <div className="space-y-3">
              {rewards.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-secondary p-4 flex items-center justify-between hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover" alt={item.name} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Gift size={18} className="text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.points_required} points requis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExchange(item)}
                    disabled={points < item.points_required}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold gradient-button text-primary-foreground disabled:opacity-40"
                  >
                    Echanger
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PointsCadeaux;
