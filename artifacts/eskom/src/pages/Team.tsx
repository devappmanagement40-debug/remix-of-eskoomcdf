import { Users, DollarSign, Copy, Check, MessageCircle, Phone, Calendar, CircleDot, ChevronRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { safeClipboardWrite } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  balance: number | null;
  created_at: string | null;
  is_suspended: boolean | null;
  user_id: string;
  hasInvested: boolean;
  bonusEarned: number;
}

interface LevelData {
  label: string;
  color: string;
  members: TeamMember[];
  revenue: number;
}

const WHATSAPP_MESSAGE = encodeURIComponent(
  `Hello 👋\n\nYou registered using my referral link on the GE Energy platform.\nI am your referrer and I'm reaching out to assist you if needed.\n\nFeel free to ask me any questions.\n\nBest regards.`
);

const Team = () => {
  const { showCopy } = useActionPopup();
  const [levels, setLevels] = useState<LevelData[]>([
    { label: "E", color: "from-cyan-400 to-teal-400", members: [], revenue: 0 },
    { label: "F", color: "from-pink-400 to-rose-400", members: [], revenue: 0 },
    { label: "G", color: "from-purple-400 to-violet-400", members: [], revenue: 0 },
  ]);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id, referral_code")
        .eq("user_id", user.id)
        .single();

      if (!myProfile) return;
      setReferralCode(myProfile.referral_code || "");

      const { data: levelB } = await supabase
        .from("profiles")
        .select("id, full_name, phone, country_code, balance, created_at, is_suspended, user_id")
        .eq("referred_by", myProfile.id);
      const bRaw = levelB || [];

      const bIds = bRaw.map((m) => m.id);
      let cRaw: any[] = [];
      if (bIds.length > 0) {
        const { data: levelC } = await supabase
          .from("profiles")
          .select("id, full_name, phone, country_code, balance, created_at, is_suspended, user_id")
          .in("referred_by", bIds);
        cRaw = levelC || [];
      }

      const cIds = cRaw.map((m) => m.id);
      let dRaw: any[] = [];
      if (cIds.length > 0) {
        const { data: levelD } = await supabase
          .from("profiles")
          .select("id, full_name, phone, country_code, balance, created_at, is_suspended, user_id")
          .in("referred_by", cIds);
        dRaw = levelD || [];
      }

      const allMembers = [...bRaw, ...cRaw, ...dRaw];
      const allUserIds = allMembers.map((m) => m.user_id).filter(Boolean);

      let investedUserIds = new Set<string>();
      if (allUserIds.length > 0) {
        const { data: products } = await supabase
          .from("user_products")
          .select("user_id")
          .in("user_id", allUserIds);
        investedUserIds = new Set((products || []).map((p: any) => p.user_id));
      }

      const enrichMembers = (members: any[], rate: number): TeamMember[] =>
        members.map((m) => ({
          ...m,
          hasInvested: investedUserIds.has(m.user_id),
          bonusEarned: 0,
        }));

      let bonusMap = new Map<string, number>();
      if (allUserIds.length > 0) {
        const { data: userProds } = await supabase
          .from("user_products")
          .select("user_id, product_id, products(price)")
          .in("user_id", allUserIds);
        if (userProds) {
          const bUserIds = new Set(bRaw.map(m => m.user_id));
          const cUserIds = new Set(cRaw.map(m => m.user_id));
          const dUserIds = new Set(dRaw.map(m => m.user_id));
          for (const up of userProds) {
            const price = Number((up as any).products?.price) || 0;
            const rate = bUserIds.has(up.user_id) ? 0.10 : cUserIds.has(up.user_id) ? 0.05 : dUserIds.has(up.user_id) ? 0.01 : 0;
            bonusMap.set(up.user_id, (bonusMap.get(up.user_id) || 0) + price * rate);
          }
        }
      }

      const buildMembers = (members: any[]): TeamMember[] =>
        members.map((m) => ({
          ...m,
          hasInvested: investedUserIds.has(m.user_id),
          bonusEarned: bonusMap.get(m.user_id) || 0,
        }));

      const bMembers = buildMembers(bRaw);
      const cMembers = buildMembers(cRaw);
      const dMembers = buildMembers(dRaw);

      setLevels([
        { label: "E", color: "from-cyan-400 to-teal-400", members: bMembers, revenue: bMembers.reduce((s, m) => s + m.bonusEarned, 0) },
        { label: "F", color: "from-pink-400 to-rose-400", members: cMembers, revenue: cMembers.reduce((s, m) => s + m.bonusEarned, 0) },
        { label: "G", color: "from-purple-400 to-violet-400", members: dMembers, revenue: dMembers.reduce((s, m) => s + m.bonusEarned, 0) },
      ]);
    } catch (err) {
      console.error("Team load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalMembers = levels.reduce((sum, l) => sum + l.members.length, 0);
  const totalRevenue = levels.reduce((sum, l) => sum + l.revenue, 0);

  const openWhatsApp = (member: TeamMember) => {
    const code = (member.country_code || "+509").replace("+", "");
    const num = (member.phone || "").replace(/\D/g, "");
    if (!num) return;
    window.open(`https://wa.me/${code}${num}?text=${WHATSAPP_MESSAGE}`, "_blank");
  };

  const getReferralLink = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#/reg?invite_code=${referralCode}`;
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const copyCode = async () => {
    const ok = await safeClipboardWrite(referralCode);
    if (ok) {
      setCopied(true);
      showCopy("Code de parrainage copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = async () => {
    const ok = await safeClipboardWrite(getReferralLink());
    if (ok) {
      setCopiedLink(true);
      showCopy("Lien de parrainage copié !");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Port-au-Prince" });
  };

  // If a level is expanded, show member list view
  if (expandedLevel) {
    const level = levels.find((l) => l.label === expandedLevel)!;
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
          <button onClick={() => setExpandedLevel(null)} className="p-1">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center text-white font-bold text-sm`}>
            {level.label}
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Level {level.label}</h1>
            <p className="text-xs text-muted-foreground">{level.members.length} member(s)</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-3">
          {level.members.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No members at this level.</p>
          ) : (
            level.members.map((member) => {
              const isActive = member.hasInvested;
              return (
                <div key={member.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {(member.full_name || member.phone || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{member.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone size={12} /> {member.country_code}{member.phone}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "destructive"} className="text-[10px]">
                      <CircleDot size={10} className="mr-1" />
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(member.created_at)}</span>
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <DollarSign size={12} /> Bonus: {member.bonusEarned.toLocaleString()} USDT
                    </span>
                  </div>

                  <button
                    onClick={() => openWhatsApp(member)}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm rounded-xl py-2.5 transition-colors"
                  >
                    <MessageCircle size={18} />
                    Contact via WhatsApp
                  </button>
                </div>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="My Team" showBack />

      <div className="px-4 pt-4 space-y-4">
        {referralCode && (
          <div className="space-y-2">
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
            >
              <span className="text-sm text-muted-foreground">Mon code de parrainage</span>
              <span className="flex items-center gap-2 text-primary font-bold text-sm">
                {referralCode}
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </span>
            </button>
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-primary">Copier mon lien de parrainage</p>
                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                  {`.../#/reg?invite_code=${referralCode}`}
                </p>
              </div>
              <span className="flex-shrink-0 ml-2">
                {copiedLink ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-primary" />}
              </span>
            </button>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <DollarSign size={28} className="text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Total Revenue</span>
            <span className="text-lg font-bold text-primary">{totalRevenue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">USDT</span></span>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
              <Users size={28} className="text-cyan-400" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Team Size</span>
            <span className="text-lg font-bold text-foreground">{totalMembers}</span>
          </div>
        </div>

        {/* Level cards */}
        {levels.map((level) => (
          <button
            key={level.label}
            onClick={() => setExpandedLevel(level.label)}
            className="w-full bg-card border border-border rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                {level.label}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Level {level.label}</span>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-muted-foreground">Size</span>
                  <span className="text-sm text-foreground">{level.members.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="text-sm text-foreground">{level.revenue.toLocaleString()} USDT</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Team;
