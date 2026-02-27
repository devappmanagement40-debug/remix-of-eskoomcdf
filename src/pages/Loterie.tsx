import { useState, useRef, useEffect } from "react";
import { Zap, Trophy, History, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

type WheelPrize = {
  id: string; label: string; value: number; prize_type: string;
  vip_level: number | null; probability: number; is_active: boolean;
};

type WheelSetting = { key: string; value: string | null };
type SpinRecord = { id: string; prize_label: string; prize_value: number; prize_type: string; created_at: string; status: string; vip_level: number | null };

const Loterie = () => {
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<string>("cash");
  const [loading, setLoading] = useState(true);
  const [spins, setSpins] = useState<SpinRecord[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [pz, ss] = await Promise.all([
      supabase.from("wheel_prizes").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("site_settings").select("key, value").eq("category", "wheel"),
    ]);
    if (pz.data) setPrizes(pz.data as WheelPrize[]);
    const settingsMap: Record<string, string> = {};
    (ss.data || []).forEach((s: WheelSetting) => { if (s.value) settingsMap[s.key] = s.value; });
    setSettings(settingsMap);

    // Load user spins history
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: spinData } = await supabase.from("wheel_spins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (spinData) {
        setSpins(spinData as SpinRecord[]);
        const total = spinData.filter(s => s.prize_type === "cash").reduce((sum, s) => sum + Number(s.prize_value), 0);
        setTotalWon(total);
      }
    }
    setLoading(false);
  };

  const segments = prizes.length > 0 ? prizes : [{ id: "1", label: "—", value: 0, prize_type: "cash", vip_level: null, probability: 100, is_active: true }];
  const SEGMENT_COUNT = segments.length;
  const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

  // Weighted random selection based on probability
  const selectPrize = () => {
    const totalProb = segments.reduce((s, p) => s + p.probability, 0);
    let rand = Math.random() * totalProb;
    for (let i = 0; i < segments.length; i++) {
      rand -= segments[i].probability;
      if (rand <= 0) return i;
    }
    return segments.length - 1;
  };

  const spin = async () => {
    if (spinning || segments.length === 0) return;
    setSpinning(true);
    setResult(null);

    const winIndex = selectPrize();
    const extraSpins = 5 * 360;
    const targetAngle = extraSpins + (360 - winIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);

    setRotation((prev) => prev + targetAngle);

    setTimeout(async () => {
      setSpinning(false);
      const prize = segments[winIndex];
      setResultType(prize.prize_type);

      if (prize.prize_type === "vip") {
        setResult(`VIP${prize.vip_level || 1}`);
      } else {
        setResult(`${Number(prize.value).toLocaleString("fr-FR")} FCFA`);
      }

      // Save spin to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const spinData: any = {
          user_id: user.id,
          prize_id: prize.id,
          prize_label: prize.label,
          prize_value: prize.value,
          prize_type: prize.prize_type,
          vip_level: prize.vip_level,
          status: prize.prize_type === "vip" ? "pending_vip" : "completed",
        };
        await supabase.from("wheel_spins").insert(spinData);

        // If cash prize, credit earnings_balance
        if (prize.prize_type === "cash" && prize.value > 0) {
          const { data: profile } = await supabase.from("profiles").select("balance, earnings_balance").eq("user_id", user.id).single();
          if (profile) {
            await supabase.from("profiles").update({
              balance: (profile.balance || 0) + prize.value,
              earnings_balance: (profile.earnings_balance || 0) + prize.value,
            }).eq("user_id", user.id);
          }
        }
        // Reload history
        loadData();
      }
    }, 4000);
  };

  const colors = [
    "hsl(190, 60%, 35%)", "hsl(190, 50%, 28%)", "hsl(195, 60%, 38%)", "hsl(195, 50%, 30%)",
    "hsl(200, 60%, 35%)", "hsl(200, 50%, 28%)", "hsl(185, 60%, 38%)", "hsl(185, 50%, 30%)",
    "hsl(210, 60%, 35%)", "hsl(210, 50%, 28%)", "hsl(205, 60%, 38%)", "hsl(205, 50%, 30%)",
  ];

  const renderSegments = () => {
    const cx = 150, cy = 150, r = 140;
    return segments.map((seg, i) => {
      const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

      const midAngle = ((i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) - 90) * (Math.PI / 180);
      const textX = cx + r * 0.65 * Math.cos(midAngle);
      const textY = cy + r * 0.65 * Math.sin(midAngle);
      const textRotation = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;

      return (
        <g key={i}>
          <path
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
            fill={colors[i % colors.length]}
            stroke="hsl(190, 40%, 20%)"
            strokeWidth="1"
          />
          <text x={textX} y={textY} fill="white" fontSize={SEGMENT_COUNT > 8 ? "11" : "14"} fontWeight="bold"
            textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRotation}, ${textX}, ${textY})`}>
            {seg.label}
          </text>
          {seg.prize_type === "cash" && (
            <text x={cx + r * 0.52 * Math.cos(midAngle)} y={cy + r * 0.52 * Math.sin(midAngle)}
              fill="hsla(0,0%,100%,0.6)" fontSize="8" textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${textRotation}, ${cx + r * 0.52 * Math.cos(midAngle)}, ${cy + r * 0.52 * Math.sin(midAngle)})`}>
              FCFA
            </text>
          )}
        </g>
      );
    });
  };

  const wheelTitle = settings.wheel_title || "Roue de la Fortune";
  const wheelSubtitle = settings.wheel_subtitle || "100% Gagnant • Cadeaux Divers";
  const wheelInfoTitle = settings.wheel_info_title || "Règlement du jeu";
  const wheelRules = settings.wheel_rules || "Règle 1 : Chaque investissement vous donne droit à un tirage.\nRègle 2 : Inviter un membre valide vous donne droit à un tirage.";
  const wheelWinMessage = settings.wheel_win_message || "Vous avez gagné";
  const wheelBanner = settings.wheel_banner_url;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="⚡ LOTERIE ESKOM" showBack />

      {/* Banner */}
      {wheelBanner && (
        <div className="px-4 pt-4">
          <img src={wheelBanner} alt="Bannière" className="w-full rounded-xl object-cover max-h-32" />
        </div>
      )}

      {/* Header section */}
      <div className="bg-gradient-to-b from-[hsl(250,50%,30%)] to-background px-4 pt-6 pb-8">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Zap size={24} className="text-warning" /> {wheelTitle}
          </h1>
          <div className="mt-2 inline-block bg-[hsl(270,30%,25%)] rounded-full px-6 py-1.5">
            <span className="text-sm text-primary font-medium">{wheelSubtitle}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-xl border border-secondary p-4 flex">
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">{totalWon.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
            <p className="text-xs text-muted-foreground mt-1">Montant gagné</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-foreground">{spins.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Tirages effectués</p>
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center px-4 -mt-2">
        <div className="relative w-[300px] h-[300px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 - 90) * (Math.PI / 180);
            const x = 150 + 148 * Math.cos(angle);
            const y = 150 + 148 * Math.sin(angle);
            return <div key={i} className="absolute w-2 h-2 rounded-full bg-primary" style={{ left: x - 4, top: y - 4 }} />;
          })}

          <svg ref={wheelRef} viewBox="0 0 300 300" className="w-full h-full"
            style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none" }}>
            {renderSegments()}
            <circle cx="150" cy="150" r="35" fill="hsl(220, 25%, 12%)" stroke="hsl(45, 90%, 50%)" strokeWidth="3" />
            <text x="150" y="144" fill="hsl(45, 90%, 50%)" fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">⚡</text>
            <text x="150" y="162" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">ESKOM</text>
          </svg>
        </div>

        <button onClick={spin} disabled={spinning}
          className="mt-4 gradient-button text-primary-foreground font-bold py-3 px-10 rounded-xl text-lg disabled:opacity-50 transition-opacity">
          {spinning ? "En cours..." : "TOURNER"}
        </button>

        {result && (
          <div className={`mt-3 bg-card border rounded-xl px-6 py-3 text-center ${resultType === "vip" ? "border-warning" : "border-primary"}`}>
            <p className="text-sm text-muted-foreground">{wheelWinMessage}</p>
            <p className={`text-xl font-bold ${resultType === "vip" ? "text-warning" : "text-primary"}`}>{result}</p>
            {resultType === "vip" && (
              <p className="text-xs text-muted-foreground mt-1">⏳ En attente de validation par l'administration</p>
            )}
          </div>
        )}

      </div>

      {/* Spin History */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-xl border border-secondary p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <History size={16} className="text-primary" /> Historique des tirages
          </h3>
          {spins.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun tirage effectué</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {spins.map((spin) => (
                <div key={spin.id} className="flex items-center justify-between border-b border-secondary pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${spin.prize_type === "vip" ? "bg-warning/20" : "bg-primary/20"}`}>
                      {spin.prize_type === "vip" ? <Trophy size={14} className="text-warning" /> : <Gift size={14} className="text-primary" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{spin.prize_label}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(spin.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${spin.prize_type === "vip" ? "text-warning" : "text-primary"}`}>
                      {spin.prize_type === "vip" ? `VIP${spin.vip_level || ""}` : `${Number(spin.prize_value).toLocaleString("fr-FR")} FCFA`}
                    </p>
                    {spin.status === "pending_vip" && <span className="text-[10px] text-warning">⏳ En attente</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rules */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            🏛 {wheelInfoTitle}
          </h3>
          <div className="border-t border-secondary pt-3 space-y-3">
            {wheelRules.split("\n").filter(Boolean).map((rule: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">{rule.split(":")[0]}:</span>{rule.includes(":") ? rule.substring(rule.indexOf(":") + 1) : ""}
              </p>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Loterie;
