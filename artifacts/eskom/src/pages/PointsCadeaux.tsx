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
  money_value: number;
  image_url: string | null;
  is_active: boolean;
};

type Exchange = {
  id: string;
  points_spent: number;
  money_credited: number;
  reward_name: string;
  created_at: string;
};

const PointsCadeaux = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [points, setPoints] = useState(0);
  const [fullName, setFullName] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [howToEarn, setHowToEarn] = useState<string[]>([]);
  const [exchanging, setExchanging] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, rewardsRes, settingsRes, exchangesRes] = await Promise.all([
          supabase.from("profiles").select("full_name, gift_points").eq("user_id", user.id).single(),
          supabase.from("gift_rewards").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("site_settings").select("key, value").in("key", [
            "points_per_active_member", "points_per_vip_level_per_day",
            "points_per_deposit_value", "points_per_withdrawal"
          ]),
          supabase.from("point_exchanges").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        ]);

        if (profileRes.data) {
          setFullName(profileRes.data.full_name || "");
          setPoints((profileRes.data as any).gift_points || 0);
        }
        if (rewardsRes.data) setRewards(rewardsRes.data as unknown as Reward[]);
        if (exchangesRes.data) setExchanges(exchangesRes.data as unknown as Exchange[]);

        if (settingsRes.data) {
          const tips: string[] = [];
          const get = (k: string) => settingsRes.data?.find(s => s.key === k)?.value;
          const pam = get("points_per_active_member");
          const pvip = get("points_per_vip_level_per_day");
          const pdep = get("points_per_deposit_value");
          const pw = get("points_per_withdrawal");
          if (pam && Number(pam) > 0) tips.push(`Chaque membre actif vous rapporte ${pam} ESK`);
          if (pvip && Number(pvip) > 0) tips.push(`Gagnez ${pvip} ESK par niveau VIP chaque jour`);
          if (pdep && Number(pdep) > 0) tips.push(`Chaque dépôt vous rapporte ${pdep} ESK`);
          if (pw && Number(pw) > 0) tips.push(`Chaque retrait vous rapporte ${pw} ESK`);
          tips.push("Invitez des amis et gagnez des ESK bonus par niveau");
          tips.push("Utilisez un code d'échange pour obtenir des ESK gratuits");
          setHowToEarn(tips);
        }
      } catch (err) {
        console.error("PointsCadeaux load error:", err);
      }
    };
    load();
  }, []);

  const handleExchange = async (reward: Reward) => {
    if (points < reward.points_required) {
      showError("ESK insuffisants", `Il vous faut ${reward.points_required} ESK pour échanger ce cadeau.`);
      return;
    }
    if (reward.money_value <= 0) {
      showError("Erreur", "Ce cadeau n'a pas de valeur monétaire configurée.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setExchanging(reward.id);
    try {
      // Get fresh profile
      const { data: profile } = await supabase.from("profiles")
        .select("gift_points, balance, earnings_balance")
        .eq("user_id", user.id).single();
      if (!profile) { showError("Erreur", "Profil introuvable"); return; }

      const currentPoints = (profile as any).gift_points || 0;
      if (currentPoints < reward.points_required) {
        showError("ESK insuffisants", "Votre solde ESK a changé. Veuillez réessayer.");
        setPoints(currentPoints);
        return;
      }

      const newPoints = currentPoints - reward.points_required;
      const newBalance = (profile.balance || 0) + reward.money_value;
      const newEarnings = (profile.earnings_balance || 0) + reward.money_value;

      // Update profile: deduct points, credit balance
      const { error: updateError } = await supabase.from("profiles").update({
        gift_points: newPoints,
        balance: newBalance,
        earnings_balance: newEarnings,
      } as any).eq("user_id", user.id);

      if (updateError) { showError("Erreur", "Une erreur est survenue"); return; }

      // Log the exchange
      await supabase.from("point_exchanges").insert({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.points_required,
        money_credited: reward.money_value,
        reward_name: reward.name,
      } as any);

      setPoints(newPoints);
      setExchanges(prev => [{
        id: crypto.randomUUID(),
        points_spent: reward.points_required,
        money_credited: reward.money_value,
        reward_name: reward.name,
        created_at: new Date().toISOString(),
      }, ...prev]);

      showSuccess("Conversion réussie ✅", `${reward.points_required} ESK convertis en ${reward.money_value.toLocaleString("fr-FR")} USDT. Le montant a été crédité sur votre compte.`);
    } finally {
      setExchanging(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Monnaie Eskom" showBack />
      <div className="px-4 pt-6 space-y-4">

        {/* Points balance card */}
        <div className="relative bg-card rounded-2xl border border-secondary p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift size={28} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monnaie Eskom disponible</p>
              <p className="text-3xl font-bold text-primary">{points} <span className="text-sm font-normal">ESK</span></p>
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
          <h2 className="text-sm font-bold text-foreground mb-3">Comment gagner de la Monnaie Eskom ?</h2>
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
          <h2 className="text-sm font-bold text-foreground mb-3">Convertir votre Monnaie Eskom</h2>
          {rewards.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune récompense disponible pour le moment</p>
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
                      <p className="text-xs text-muted-foreground">{item.points_required} ESK → <span className="text-success font-semibold">{item.money_value.toLocaleString("fr-FR")} USDT</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExchange(item)}
                    disabled={points < item.points_required || exchanging === item.id}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold gradient-button text-primary-foreground disabled:opacity-40"
                  >
                    {exchanging === item.id ? "..." : "Convertir"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent exchanges */}
        {exchanges.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Historique des conversions</h2>
            <div className="space-y-2">
              {exchanges.map((ex) => (
                <div key={ex.id} className="bg-card rounded-xl border border-border/30 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{ex.reward_name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(ex.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-success">+{ex.money_credited.toLocaleString("en-US")} USDT</p>
                    <p className="text-[10px] text-muted-foreground">-{ex.points_spent} ESK</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PointsCadeaux;
