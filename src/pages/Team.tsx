import { Users, DollarSign, ChevronRight, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";

interface TeamMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  balance: number | null;
}

interface LevelData {
  label: string;
  color: string;
  members: TeamMember[];
  revenue: number;
}

const Team = () => {
  const { showCopy } = useActionPopup();
  const [levels, setLevels] = useState<LevelData[]>([
    { label: "B", color: "from-cyan-400 to-teal-400", members: [], revenue: 0 },
    { label: "C", color: "from-pink-400 to-rose-400", members: [], revenue: 0 },
    { label: "D", color: "from-purple-400 to-violet-400", members: [], revenue: 0 },
  ]);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
      .select("id, full_name, phone, country_code, balance")
      .eq("referred_by", myProfile.id);

    const bMembers = levelB || [];

    const bIds = bMembers.map((m) => m.id);
    let cMembers: TeamMember[] = [];
    if (bIds.length > 0) {
      const { data: levelC } = await supabase
        .from("profiles")
        .select("id, full_name, phone, country_code, balance")
        .in("referred_by", bIds);
      cMembers = levelC || [];
    }

    const cIds = cMembers.map((m) => m.id);
    let dMembers: TeamMember[] = [];
    if (cIds.length > 0) {
      const { data: levelD } = await supabase
        .from("profiles")
        .select("id, full_name, phone, country_code, balance")
        .in("referred_by", cIds);
      dMembers = levelD || [];
    }

    setLevels([
      { label: "B", color: "from-cyan-400 to-teal-400", members: bMembers, revenue: 0 },
      { label: "C", color: "from-pink-400 to-rose-400", members: cMembers, revenue: 0 },
      { label: "D", color: "from-purple-400 to-violet-400", members: dMembers, revenue: 0 },
    ]);
    setLoading(false);
  };

  const totalMembers = levels.reduce((sum, l) => sum + l.members.length, 0);
  const totalRevenue = levels.reduce((sum, l) => sum + l.revenue, 0);

  const openWhatsApp = (member: TeamMember) => {
    const phone = (member.country_code || "+226") + (member.phone || "");
    const cleanPhone = phone.replace(/[^0-9+]/g, "").replace("+", "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    showCopy("Votre code de parrainage a été copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon équipe" showBack />

      <div className="px-4 pt-4 space-y-4">
        {referralCode && (
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <DollarSign size={28} className="text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Revenu Total</span>
            <span className="text-lg font-bold text-primary">{totalRevenue.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">FCFA</span></span>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
              <Users size={28} className="text-cyan-400" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Taille l'équipe</span>
            <span className="text-lg font-bold text-foreground">{totalMembers}</span>
          </div>
        </div>

        {levels.map((level) => (
          <div key={level.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                {level.label}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{level.label} Niveau</span>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-muted-foreground">Taille</span>
                  <span className="text-sm text-foreground">{level.members.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenu</span>
                  <span className="text-sm text-foreground">{level.revenue} FCFA</span>
                </div>
              </div>
            </div>

            {level.members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {level.members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => openWhatsApp(member)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {(member.full_name || member.phone || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.full_name || member.phone || "Utilisateur"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.country_code}{member.phone}
                      </p>
                    </div>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-6 h-6 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Team;
