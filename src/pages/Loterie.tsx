import { useState, useRef, useEffect, useCallback } from "react";
import { Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

type WheelPrize = {
  id: string; label: string; value: number; prize_type: string;
  vip_level: number | null; probability: number; is_active: boolean;
};
type WheelSetting = { key: string; value: string | null };
type SpinRecord = { id: string; prize_label: string; prize_value: number; prize_type: string; created_at: string; status: string; vip_level: number | null };

/* ── Jackpot colors ── */
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
  const [spins, setSpins] = useState<SpinRecord[]>([]);
  const [globalSpins, setGlobalSpins] = useState<any[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(0);
  const { showPopup, showError } = useActionPopup();
  const spinResolveRef = useRef<((idx: number) => void) | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pz, ss] = await Promise.all([
        supabase.from("wheel_prizes").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("site_settings").select("key, value").eq("category", "wheel"),
      ]);
      if (pz.data) setPrizes(pz.data as WheelPrize[]);
      const settingsMap: Record<string, string> = {};
      (ss.data || []).forEach((s: WheelSetting) => { if (s.value) settingsMap[s.key] = s.value; });
      setSettings(settingsMap);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [spinRes, profileRes] = await Promise.all([
          supabase.from("wheel_spins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
          supabase.from("profiles").select("spins_balance").eq("user_id", user.id).single(),
        ]);
        if (spinRes.data) {
          setSpins(spinRes.data as SpinRecord[]);
          const total = spinRes.data.filter(s => s.prize_type === "cash").reduce((sum, s) => sum + Number(s.prize_value), 0);
          setTotalWon(total);
        }
        setSpinsLeft((profileRes.data as any)?.spins_balance || 0);
      }
      const { data: globalData } = await supabase.rpc("get_recent_winners", { lim: 30 });
      if (globalData) setGlobalSpins(globalData);
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
      showError("Aucun tour disponible", "Vous n'avez pas de tour disponible. Achetez un produit ou invitez un ami qui achète un produit pour obtenir un tour gratuit.");
      return;
    }

    setSpinning(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("spin-wheel", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || res.data?.error) {
        showError("Erreur", res.data?.error || "Une erreur est survenue");
        setSpinning(false);
        return;
      }

      const { winIndex, prize, spins_left } = res.data;
      setSpinsLeft(spins_left);

      // Animate
      const extraSpins = 5 * 360;
      const targetAngle = extraSpins + (360 - winIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
      setRotation(prev => prev + targetAngle);

      setTimeout(() => {
        setSpinning(false);
        // Show result popup
        if (prize.prize_type === "vip") {
          showPopup({
            type: "success",
            title: "Félicitations !",
            message: `Vous avez gagné le niveau VIP${prize.vip_level || 1} ! En attente de validation par l'administration.`,
          });
        } else if (Number(prize.value) > 0) {
          showPopup({
            type: "success",
            title: "Félicitations !",
            message: `Vous avez gagné ${Number(prize.value).toLocaleString("fr-FR")} CDF ! Le montant a été crédité sur votre compte.`,
          });
        } else {
          showPopup({
            type: "info",
            title: "Merci pour votre participation",
            message: "Vous n'avez rien gagné cette fois. Tentez encore votre chance !",
          });
        }
        loadData();
      }, 4500);
    } catch (e: any) {
      showError("Erreur", e.message || "Erreur réseau");
      setSpinning(false);
    }
  };

  /* ── SVG Wheel Rendering ── */
  const renderWheel = () => {
    const cx = 200, cy = 200, r = 180;
    const outerR = 195;

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

        {/* Gold outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="url(#goldBorder)" />
        <circle cx={cx} cy={cy} r={r + 2} fill="hsl(220, 20%, 8%)" />

        {/* Light bulbs around the ring */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 - 90) * (Math.PI / 180);
          const bx = cx + (outerR - 3) * Math.cos(angle);
          const by = cy + (outerR - 3) * Math.sin(angle);
          return (
            <circle key={`bulb-${i}`} cx={bx} cy={by} r="4"
              fill={i % 2 === 0 ? "#FFD700" : "#FFF9C4"}
              filter="url(#glow)" opacity={i % 2 === 0 ? 1 : 0.7}
            />
          );
        })}

        {/* Segments */}
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "200px 200px", transition: spinning ? "transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none" }}>
          {segments.map((seg, i) => {
            const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
            const midAngle = ((i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2) - 90) * (Math.PI / 180);
            const textR = r * 0.62;
            const textX = cx + textR * Math.cos(midAngle);
            const textY = cy + textR * Math.sin(midAngle);
            const textRotation = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
            const color = JACKPOT_COLORS[i % JACKPOT_COLORS.length];

            return (
              <g key={i}>
                <path
                  d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={color}
                  stroke="#FFD54F"
                  strokeWidth="2"
                />
                {/* Sparkle dots */}
                {[0.3, 0.5, 0.75].map((dist, si) => {
                  const sparkAngle = ((i * SEGMENT_ANGLE + SEGMENT_ANGLE * (0.3 + si * 0.2)) - 90) * (Math.PI / 180);
                  const sx = cx + r * dist * Math.cos(sparkAngle);
                  const sy = cy + r * dist * Math.sin(sparkAngle);
                  return <circle key={si} cx={sx} cy={sy} r="1.5" fill="white" opacity="0.4" />;
                })}
                <text x={textX} y={textY} fill="white" fontSize={SEGMENT_COUNT > 8 ? "13" : "16"} fontWeight="bold"
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                  {seg.label}
                </text>
              </g>
            );
          })}

          {/* Gold center hub */}
          <circle cx={cx} cy={cy} r="32" fill="url(#goldCenter)" stroke="#FFD54F" strokeWidth="4" />
          <circle cx={cx} cy={cy} r="22" fill="url(#goldCenter)" stroke="#FFECB3" strokeWidth="2" />
          {/* Small dots around center */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30) * (Math.PI / 180);
            return <circle key={i} cx={cx + 27 * Math.cos(a)} cy={cy + 27 * Math.sin(a)} r="2.5" fill="#FFD54F" />;
          })}
        </g>

        {/* Fixed pointer at top */}
        <polygon points={`${cx - 14},${cy - r - 6} ${cx + 14},${cy - r - 6} ${cx},${cy - r + 16}`}
          fill="#E53935" stroke="#B71C1C" strokeWidth="1.5" filter="url(#glow)" />
        <polygon points={`${cx - 6},${cy - r - 2} ${cx + 6},${cy - r - 2} ${cx},${cy - r + 10}`}
          fill="#EF9A9A" opacity="0.5" />
      </svg>
    );
  };

  const wheelTitle = settings.wheel_title || "Roue de la Fortune";
  const wheelSubtitle = settings.wheel_subtitle || "100% Gagnant";
  const wheelInfoTitle = settings.wheel_info_title || "Règlement du jeu";
  const wheelRules = settings.wheel_rules || "Règle 1 : Chaque investissement vous donne droit à un tirage.\nRègle 2 : Inviter un membre valide vous donne droit à un tirage.";
  const wheelBanner = settings.wheel_banner_url;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="LOTERIE ESKOM" showBack />

      {wheelBanner && (
        <div className="px-4 pt-4">
          <img src={wheelBanner} alt="Bannière" className="w-full rounded-xl object-cover max-h-32" />
        </div>
      )}

      {/* Header gradient */}
      <div className="bg-gradient-to-b from-[hsl(0,70%,20%)] via-[hsl(30,80%,15%)] to-background px-4 pt-6 pb-8">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Zap size={24} className="text-warning" /> {wheelTitle}
          </h1>
          <div className="mt-2 inline-block bg-warning/20 rounded-full px-6 py-1.5">
            <span className="text-sm text-warning font-medium">{wheelSubtitle}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-xl border border-secondary p-4 flex">
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">{totalWon.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">CDF</span></p>
            <p className="text-xs text-muted-foreground mt-1">Montant gagné</p>
          </div>
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">{spins.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Tirages</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-warning">{spinsLeft}</p>
            <p className="text-xs text-muted-foreground mt-1">Tours restants</p>
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center px-4 -mt-2">
        <div className="relative w-[320px] h-[320px]">
          {renderWheel()}
        </div>

        <button onClick={spin} disabled={spinning}
          className={`mt-6 font-bold py-3.5 px-12 rounded-2xl text-lg transition-all shadow-lg ${
            spinsLeft > 0
              ? "bg-gradient-to-r from-[#FFD54F] to-[#FF8F00] text-[hsl(220,20%,8%)] hover:shadow-warning/30 hover:shadow-xl active:scale-95"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          } disabled:opacity-50`}>
          {spinning ? "En cours..." : spinsLeft > 0 ? "TOURNER" : "Aucun tour"}
        </button>
      </div>

      {/* Rules */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            {wheelInfoTitle}
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

      {/* Recent winners */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-xl border border-secondary p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-warning" /> Derniers gagnants
          </h3>
          <div className="border-t border-secondary">
            <div className="grid grid-cols-3 py-2.5 text-xs text-muted-foreground font-semibold">
              <span>Heure</span><span>Utilisateur</span><span className="text-right">Gain</span>
            </div>
            {globalSpins.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun tirage</p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-secondary">
                {globalSpins.map((s) => (
                  <div key={s.id} className="grid grid-cols-3 py-2.5 text-xs items-center">
                    <span className="text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Lubumbashi" })}{" "}
                      {new Date(s.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lubumbashi" })}
                    </span>
                    <span className="font-bold text-foreground">{s.masked_phone}</span>
                    <span className="text-right font-bold text-warning">
                      {s.prize_type === "vip" ? `VIP${s.vip_level || ""}` : `${Number(s.prize_value).toLocaleString("fr-FR")} CDF`}
                    </span>
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
