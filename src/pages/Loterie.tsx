import { useState, useRef } from "react";
import { Zap, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

const segments = [
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "VIP", value: 0 },
  { label: "500", value: 500 },
  { label: "3K", value: 3000 },
  { label: "10K", value: 10000 },
  { label: "50K", value: 50000 },
];

const winners = [
  { time: "25/02 15:05", user: "76****2018", gain: "300 FCFA" },
  { time: "25/02 15:00", user: "75****7825", gain: "300 FCFA" },
  { time: "25/02 15:02", user: "72****5941", gain: "200 FCFA" },
  { time: "25/02 14:42", user: "77****5055", gain: "100 FCFA" },
  { time: "25/02 14:30", user: "75****8581", gain: "500 FCFA" },
];

const SEGMENT_COUNT = segments.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

const Loterie = () => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const randomSegment = Math.floor(Math.random() * SEGMENT_COUNT);
    const extraSpins = 5 * 360;
    const targetAngle = extraSpins + (360 - randomSegment * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);

    setRotation((prev) => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(segments[randomSegment].label === "VIP" ? "VIP" : `${segments[randomSegment].label} FCFA`);
    }, 4000);
  };

  const colors = [
    "hsl(190, 60%, 35%)",
    "hsl(190, 50%, 28%)",
    "hsl(195, 60%, 38%)",
    "hsl(195, 50%, 30%)",
    "hsl(200, 60%, 35%)",
    "hsl(200, 50%, 28%)",
    "hsl(185, 60%, 38%)",
    "hsl(185, 50%, 30%)",
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
          <text
            x={textX}
            y={textY}
            fill="white"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
          >
            {seg.label}
          </text>
          <text
            x={cx + r * 0.52 * Math.cos(midAngle)}
            y={cy + r * 0.52 * Math.sin(midAngle)}
            fill="hsla(0,0%,100%,0.6)"
            fontSize="8"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textRotation}, ${cx + r * 0.52 * Math.cos(midAngle)}, ${cy + r * 0.52 * Math.sin(midAngle)})`}
          >
            {seg.label === "VIP" ? "" : "FCFA"}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="⚡ LOTERIE ESKOM" showBack />

      {/* Header section */}
      <div className="bg-gradient-to-b from-[hsl(250,50%,30%)] to-background px-4 pt-6 pb-8">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Zap size={24} className="text-warning" /> Roue de la Fortune
          </h1>
          <div className="mt-2 inline-block bg-[hsl(270,30%,25%)] rounded-full px-6 py-1.5">
            <span className="text-sm text-primary font-medium">100% Gagnant • Cadeaux Divers</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-xl border border-secondary p-4 flex">
          <div className="flex-1 text-center border-r border-secondary">
            <p className="text-xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
            <p className="text-xs text-muted-foreground mt-1">Montant gagné</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">Tirages restants</p>
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center px-4 -mt-2">
        <div className="relative w-[300px] h-[300px]">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          {/* Dots around */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 - 90) * (Math.PI / 180);
            const x = 150 + 148 * Math.cos(angle);
            const y = 150 + 148 * Math.sin(angle);
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{ left: x - 4, top: y - 4 }}
              />
            );
          })}

          <svg
            ref={wheelRef}
            viewBox="0 0 300 300"
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {renderSegments()}
            {/* Center circle */}
            <circle cx="150" cy="150" r="35" fill="hsl(220, 25%, 12%)" stroke="hsl(45, 90%, 50%)" strokeWidth="3" />
            <text x="150" y="144" fill="hsl(45, 90%, 50%)" fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">⚡</text>
            <text x="150" y="162" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">ESKOM</text>
          </svg>
        </div>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning}
          className="mt-4 gradient-button text-primary-foreground font-bold py-3 px-10 rounded-xl text-lg disabled:opacity-50 transition-opacity"
        >
          {spinning ? "En cours..." : "TOURNER"}
        </button>

        {result && (
          <div className="mt-3 bg-card border border-primary rounded-xl px-6 py-3 text-center">
            <p className="text-sm text-muted-foreground">Vous avez gagné</p>
            <p className="text-xl font-bold text-primary">{result}</p>
          </div>
        )}

        {/* History link */}
        <button className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Voir l'historique →
        </button>
      </div>

      {/* Rules */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            🏛 Règlement du jeu
          </h3>
          <div className="border-t border-secondary pt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-semibold">Règle 1 :</span> Chaque investissement vous donne droit à un tirage.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-semibold">Règle 2 :</span> Inviter un membre valide vous donne droit à un tirage.
            </p>
          </div>
        </div>
      </div>

      {/* Winners */}
      <div className="px-4 mt-4 mb-6">
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-warning" /> Derniers gagnants
          </h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left pb-3 font-medium">Heure</th>
                <th className="text-left pb-3 font-medium">Utilisateur</th>
                <th className="text-right pb-3 font-medium">Gain</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w, i) => (
                <tr key={i} className="border-t border-secondary">
                  <td className="py-3 text-xs text-muted-foreground">{w.time}</td>
                  <td className="py-3 text-sm font-bold text-foreground">{w.user}</td>
                  <td className="py-3 text-sm font-bold text-primary text-right">{w.gain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Loterie;
