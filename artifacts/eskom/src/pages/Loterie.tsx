import { useState, useEffect } from "react";
import { Trophy, Zap } from "lucide-react";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

type WheelPrize = {
  id: string; label: string; value: number; prize_type: string;
  vip_level: number | null; probability: number; is_active: boolean;
};

const JACKPOT_COLORS = [
  "#E53935", "#1E88E5", "#FFB300", "#43A047",
  "#E91E63", "#8E24AA", "#FF7043", "#00ACC1",
  "#7CB342", "#5E35B1", "#F4511E", "#039BE5",
];

const Loterie = () => {
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spins, setSpins] = useState<any[]>([]);
  const [globalSpins, setGlobalSpins] = useState<any[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(0);
  const { showPopup, showError } = useActionPopup();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prizesRes, settingsRes] = await Promise.all([
        fetch("/api/wheel/prizes").then(r => r.ok ? r.json() : []),
        fetch("/api/site-settings?category=wheel").then(r => r.ok ? r.json() : []),
      ]);

      if (Array.isArray(prizesRes)) setPrizes(prizesRes.map((p: any) => ({
        id: p.id, label: p.label, value: Number(p.value ?? 0), prize_type: p.prizeType ?? p.prize_type,
        vip_level: p.vipLevel ?? p.vip_level ?? null, probability: Number(p.probability ?? 0), is_active: p.isActive ?? p.is_active,
      })));

      const settingsMap: Record<string, string> = {};
      (Array.isArray(settingsRes) ? settingsRes : []).forEach((s: any) => { if (s.value) settingsMap[s.key] = s.value; });
      setSettings(settingsMap);

      const token = getAuthToken();
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        const [spinRes, profileRes, globalRes] = await Promise.all([
          fetch("/api/wheel/my-spins?limit=20", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/profiles/me", { headers }).then(r => r.ok ? r.json() : null),
          fetch("/api/wheel/recent-winners").then(r => r.ok ? r.json() : []),
        ]);

        if (Array.isArray(spinRes)) {
          setSpins(spinRes);
          const total = spinRes.filter((s: any) => (s.prizeType ?? s.prize_type) === "cash").reduce((sum: number, s: any) => sum + Number(s.prizeValue ?? s.prize_value ?? 0), 0);
          setTotalWon(total);
        }
        if (profileRes) setSpinsLeft(profileRes.spinsBalance ?? profileRes.spins_balance ?? 0);
        if (Array.isArray(globalRes)) setGlobalSpins(globalRes);
      }
    } catch (err) {
      console.error("Loterie load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const segments = prizes.length > 0 ? prizes : [{ id: "1", label: "—", value: 0, prize_type: "cash", vip_level: null, probability: 100, is_active: true }];
  const SEGMENT_COUNT = segments.length;
  const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

  const spin = async () => {
    if (spinning || segments.length === 0) return;
    if (spinsLeft <= 0) {
      showError("No spins available", "You have no spins left. Buy a product or invite a friend who purchases a product to get a free spin.");
      return;
    }
    const token = getAuthToken();
    if (!token) return;

    setSpinning(true);
    try {
      const res = await fetch("/api/wheel/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        showError("Error", data.error || "An error occurred");
        setSpinning(false);
        return;
      }

      const { winIndex, prize, spinsLeft: newSpinsLeft } = data;
      setSpinsLeft(newSpinsLeft ?? spinsLeft - 1);

      const extraSpins = 5 * 360;
      const targetAngle = extraSpins + (360 - winIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
      setRotation(prev => prev + targetAngle);

      setTimeout(() => {
        setSpinning(false);
        if (prize.prizeType === "vip" || prize.prize_type === "vip") {
          showPopup({ type: "success", title: "Congratulations!", message: `You won VIP${prize.vipLevel || prize.vip_level || 1} level! Awaiting admin validation.` });
        } else if (Number(prize.value) > 0) {
          showPopup({ type: "success", title: "Congratulations!", message: `You won ${Number(prize.value).toLocaleString("en-US")} USDT! The amount has been credited to your account.` });
        } else {
          showPopup({ type: "info", title: "Thanks for playing", message: "You didn't win this time. Try again!" });
        }
        loadData();
      }, 4500);
    } catch (e: any) {
      showError("Error", e.message || "Network error");
      setSpinning(false);
    }
  };

  const renderWheel = () => {
    const cx = 200, cy = 200, r = 180, outerR = 195;
    return (
      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="goldCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA000" />
            <stop offset="100%" stopColor="#FF8F00" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD54F" />
            <stop offset="50%" stopColor="#FF8F00" />
            <stop offset="100%" stopColor="#FFD54F" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={outerR} fill="url(#goldBorder)" />
        <circle cx={cx} cy={cy} r={r + 2} fill="hsl(220, 20%, 8%)" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 - 90) * (Math.PI / 180);
          return <circle key={`bulb-${i}`} cx={cx + (outerR - 3) * Math.cos(angle)} cy={cy + (outerR - 3) * Math.sin(angle)} r="4" fill={i % 2 === 0 ? "#FFD700" : "#FFF9C4"} filter="url(#glow)" opacity={i % 2 === 0 ? 1 : 0.7} />;
        })}
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "200px 200px", transition: spinning ? "transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none" }}>
          {segments.map((seg, i) => {
            const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
            const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle); const y2 = cy + r * Math.sin(endAngle);
            const midAngle = ((i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) - 90) * (Math.PI / 180);
            const textR = r * 0.62;
            return (
              <g key={i}>
                <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${SEGMENT_ANGLE > 180 ? 1 : 0},1 ${x2},${y2} Z`} fill={JACKPOT_COLORS[i % JACKPOT_COLORS.length]} stroke="#FFD54F" strokeWidth="2" />
                <text x={cx + textR * Math.cos(midAngle)} y={cy + textR * Math.sin(midAngle)} fill="white" fontSize={SEGMENT_COUNT > 8 ? "13" : "16"} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}, ${cx + textR * Math.cos(midAngle)}, ${cy + textR * Math.sin(midAngle)})`}>
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r="32" fill="url(#goldCenter)" stroke="#FFD54F" strokeWidth="4" />
          <circle cx={cx} cy={cy} r="22" fill="url(#goldCenter)" stroke="#FFECB3" strokeWidth="2" />
        </g>
        <polygon points={`${cx - 14},${cy - r - 6} ${cx + 14},${cy - r - 6} ${cx},${cy - r + 16}`} fill="#E53935" stroke="#B71C1C" strokeWidth="1.5" filter="url(#glow)" />
      </svg>
    );
  };

  const wheelTitle = settings.wheel_title || "Fortune Wheel";
  const wheelSubtitle = settings.wheel_subtitle || "100% Winner";
  const wheelInfoTitle = settings.wheel_info_title || "Game rules";
  const wheelRules = settings.wheel_rules || "Rule 1: Each investment gives you one spin.\nRule 2: Inviting a validated member gives you one spin.";
  const wheelBanner = settings.wheel_banner_url;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="GE Energy LOTTERY" showBack />
      {wheelBanner && <div className="px-4 pt-4"><img src={wheelBanner} alt="Banner" className="w-full rounded-xl object-cover max-h-32" /></div>}
      <div className="bg-gradient-to-b from-[hsl(0,70%,20%)] via-[hsl(30,80%,15%)] to-background px-4 pt-6 pb-8">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2"><Zap size={24} className="text-warning" /> {wheelTitle}</h1>
          <div className="mt-2 inline-block bg-warning/20 rounded-full px-6 py-1.5"><span className="text-sm text-warning font-medium">{wheelSubtitle}</span></div>
        </div>
        <div className="bg-card rounded-xl border border-secondary p-4 flex">
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">{totalWon.toLocaleString("en-US")} <span className="text-sm font-normal text-muted-foreground">USDT</span></p>
            <p className="text-xs text-muted-foreground mt-1">Amount won</p>
          </div>
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">{spins.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Spins</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-warning">{spinsLeft}</p>
            <p className="text-xs text-muted-foreground mt-1">Spins left</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center px-4 -mt-2">
        <div className="relative w-[320px] h-[320px]">{renderWheel()}</div>
        <button onClick={spin} disabled={spinning} className={`mt-6 font-bold py-3.5 px-12 rounded-2xl text-lg transition-all shadow-lg ${spinsLeft > 0 ? "bg-gradient-to-r from-[#FFD54F] to-[#FF8F00] text-[hsl(220,20%,8%)] hover:shadow-warning/30 hover:shadow-xl active:scale-95" : "bg-secondary text-muted-foreground cursor-not-allowed"} disabled:opacity-50`}>
          {spinning ? "Spinning..." : spinsLeft > 0 ? "SPIN" : "No spins"}
        </button>
      </div>
      <div className="px-4 mt-6">
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">{wheelInfoTitle}</h3>
          <div className="border-t border-secondary pt-3 space-y-3">
            {wheelRules.split("\n").filter(Boolean).map((rule: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">{rule.split(":")[0]}:</span>{rule.includes(":") ? rule.substring(rule.indexOf(":") + 1) : ""}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 mt-4">
        <div className="bg-card rounded-xl border border-secondary p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3"><Trophy size={16} className="text-warning" /> Recent winners</h3>
          <div className="border-t border-secondary">
            <div className="grid grid-cols-3 py-2.5 text-xs text-muted-foreground font-semibold"><span>Time</span><span>User</span><span className="text-right">Prize</span></div>
            {globalSpins.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No spins yet</p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-secondary">
                {globalSpins.map((s) => (
                  <div key={s.id} className="grid grid-cols-3 py-2.5 text-xs items-center">
                    <span className="text-muted-foreground">{new Date(s.createdAt ?? s.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", timeZone: "America/Port-au-Prince" })}{" "}{new Date(s.createdAt ?? s.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" })}</span>
                    <span className="font-bold text-foreground">{s.maskedPhone ?? s.masked_phone}</span>
                    <span className="text-right font-bold text-warning">{(s.prizeType ?? s.prize_type) === "vip" ? `VIP${s.vipLevel ?? s.vip_level ?? ""}` : `${Number(s.prizeValue ?? s.prize_value).toLocaleString("en-US")} USDT`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Loterie;
