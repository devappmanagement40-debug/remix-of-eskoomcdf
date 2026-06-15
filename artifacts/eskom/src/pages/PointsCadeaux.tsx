import { Gift, Star, ArrowRightLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";

type Reward = {
  id: string; name: string; points_required: number; money_value: number; image_url: string | null; is_active: boolean;
};
type Exchange = {
  id: string; points_spent: number; money_credited: number; reward_name: string; created_at: string;
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
      const token = getAuthToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [profileRes, rewardsRes, settingsRes, exchangesRes] = await Promise.all([
          fetch("/api/profiles/me", { headers }).then(r => r.ok ? r.json() : null),
          fetch("/api/gift-rewards").then(r => r.ok ? r.json() : []),
          fetch("/api/site-settings?keys=points_per_active_member,points_per_vip_level_per_day,points_per_deposit_value,points_per_withdrawal").then(r => r.ok ? r.json() : []),
          fetch("/api/point-exchanges/my", { headers }).then(r => r.ok ? r.json() : []),
        ]);

        if (profileRes) {
          setFullName(profileRes.fullName ?? profileRes.full_name ?? "");
          setPoints(profileRes.giftPoints ?? profileRes.gift_points ?? 0);
        }
        if (Array.isArray(rewardsRes)) setRewards(rewardsRes.map((r: any) => ({
          id: r.id, name: r.name,
          points_required: r.pointsRequired ?? r.points_required,
          money_value: Number(r.moneyValue ?? r.money_value ?? 0),
          image_url: r.imageUrl ?? r.image_url ?? null,
          is_active: r.isActive ?? r.is_active,
        })));
        if (Array.isArray(exchangesRes)) setExchanges(exchangesRes.map((ex: any) => ({
          id: ex.id, points_spent: ex.pointsSpent ?? ex.points_spent,
          money_credited: Number(ex.moneyCredited ?? ex.money_credited ?? 0),
          reward_name: ex.rewardName ?? ex.reward_name,
          created_at: ex.createdAt ?? ex.created_at,
        })));

        if (Array.isArray(settingsRes)) {
          const tips: string[] = [];
          const get = (k: string) => settingsRes.find((s: any) => s.key === k)?.value;
          const pam = get("points_per_active_member");
          const pvip = get("points_per_vip_level_per_day");
          const pdep = get("points_per_deposit_value");
          const pw = get("points_per_withdrawal");
          if (pam && Number(pam) > 0) tips.push(`Each active member earns you ${pam} ESK`);
          if (pvip && Number(pvip) > 0) tips.push(`Earn ${pvip} ESK per VIP level each day`);
          if (pdep && Number(pdep) > 0) tips.push(`Each deposit earns you ${pdep} ESK`);
          if (pw && Number(pw) > 0) tips.push(`Each withdrawal earns you ${pw} ESK`);
          tips.push("Invite friends and earn bonus ESK per level");
          tips.push("Use a redemption code to get free ESK");
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
      showError("Insufficient ESK", `You need ${reward.points_required} ESK to redeem this reward.`);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setExchanging(reward.id);
    try {
      const res = await fetch("/api/point-exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok) { showError("Error", data.error || "An error occurred"); return; }

      setPoints(data.newPoints ?? points - reward.points_required);
      setExchanges(prev => [{
        id: data.exchangeId ?? crypto.randomUUID(),
        points_spent: reward.points_required,
        money_credited: reward.money_value,
        reward_name: reward.name,
        created_at: new Date().toISOString(),
      }, ...prev]);
      showSuccess("Conversion successful ✅", `${reward.points_required} ESK converted to ${reward.money_value.toLocaleString("en-US")} USDT. The amount has been credited to your account.`);
    } finally {
      setExchanging(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="GE Currency" showBack />
      <div className="px-4 pt-6 space-y-4">
        <div className="relative bg-card rounded-2xl border border-secondary p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><Gift size={28} className="text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Available GE Currency</p>
              <p className="text-3xl font-bold text-primary">{points} <span className="text-sm font-normal">ESK</span></p>
            </div>
          </div>
          {fullName && <p className="text-xs text-muted-foreground mt-3">Hello, <span className="text-foreground font-medium">{fullName}</span></p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate("/echanger-code")} className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors">
            <ArrowRightLeft size={20} className="text-primary" />
            <span className="text-[11px] font-medium text-foreground">Redeem Code</span>
          </button>
          <button onClick={() => navigate("/historique")} className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors">
            <Clock size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">History</span>
          </button>
          <button onClick={() => navigate("/equipe")} className="bg-card rounded-xl border border-secondary p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors">
            <Star size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Earn More</span>
          </button>
        </div>

        {howToEarn.length > 0 && (
          <div className="bg-card rounded-xl border border-secondary p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">How to earn GE Currency?</h2>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {howToEarn.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Convert your GE Currency</h2>
          {rewards.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No rewards available at the moment</p>
          ) : (
            <div className="space-y-3">
              {rewards.map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-secondary p-4 flex items-center justify-between hover:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover" alt={item.name} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Gift size={18} className="text-primary" /></div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.points_required} ESK → <span className="text-success font-semibold">{item.money_value.toLocaleString("en-US")} USDT</span></p>
                    </div>
                  </div>
                  <button onClick={() => handleExchange(item)} disabled={points < item.points_required || exchanging === item.id} className="px-4 py-1.5 rounded-lg text-xs font-semibold gradient-button text-primary-foreground disabled:opacity-40">
                    {exchanging === item.id ? "..." : "Convert"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {exchanges.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Conversion history</h2>
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
