import { Users, DollarSign, Copy, Check, MessageCircle, Phone, Calendar, CircleDot } from "lucide-react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  balance: number | null;
  created_at: string | null;
  is_suspended: boolean | null;
}

const WHATSAPP_MESSAGE = encodeURIComponent(
  `Bonjour à vous 👋\n\nVous vous êtes inscrit(e) avec mon lien sur la plateforme SCOM.\nJe suis votre parrain et je me permets de vous contacter pour vous accompagner si besoin.\n\nN'hésitez pas à me poser vos questions.\n\nCordialement.`
);

const Team = () => {
  const { showCopy } = useActionPopup();
  const [levelA, setLevelA] = useState<TeamMember[]>([]);
  const [levelB, setLevelB] = useState<TeamMember[]>([]);
  const [levelC, setLevelC] = useState<TeamMember[]>([]);
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

    const { data: a } = await supabase
      .from("profiles")
      .select("id, full_name, phone, country_code, balance, created_at, is_suspended")
      .eq("referred_by", myProfile.id);
    const aMembers = a || [];
    setLevelA(aMembers);

    const aIds = aMembers.map((m) => m.id);
    if (aIds.length > 0) {
      const { data: b } = await supabase
        .from("profiles")
        .select("id, full_name, phone, country_code, balance, created_at, is_suspended")
        .in("referred_by", aIds);
      const bMembers = b || [];
      setLevelB(bMembers);

      const bIds = bMembers.map((m) => m.id);
      if (bIds.length > 0) {
        const { data: c } = await supabase
          .from("profiles")
          .select("id, full_name, phone, country_code, balance, created_at, is_suspended")
          .in("referred_by", bIds);
        setLevelC(c || []);
      }
    }
    setLoading(false);
  };

  const totalMembers = levelA.length + levelB.length + levelC.length;

  const openWhatsApp = (member: TeamMember) => {
    const code = (member.country_code || "+226").replace("+", "");
    const num = (member.phone || "").replace(/\D/g, "");
    if (!num) return;
    window.open(`https://wa.me/${code}${num}?text=${WHATSAPP_MESSAGE}`, "_blank");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    showCopy("Code de parrainage copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const MemberCard = ({ member }: { member: TeamMember }) => {
    const isActive = !member.is_suspended;
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {(member.full_name || member.phone || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{member.full_name || "Utilisateur"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone size={12} /> {member.country_code}{member.phone}
              </p>
            </div>
          </div>
          <Badge variant={isActive ? "default" : "destructive"} className="text-[10px]">
            <CircleDot size={10} className="mr-1" />
            {isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(member.created_at)}</span>
          <span className="font-medium text-foreground">{member.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <button
          onClick={() => openWhatsApp(member)}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm rounded-xl py-2.5 transition-colors"
        >
          <MessageCircle size={18} />
          Contacter via WhatsApp
        </button>
      </div>
    );
  };

  const MemberList = ({ members }: { members: TeamMember[] }) => {
    if (loading) return <p className="text-center text-muted-foreground py-8 text-sm">Chargement…</p>;
    if (members.length === 0) return <p className="text-center text-muted-foreground py-8 text-sm">Aucun membre à ce niveau.</p>;
    return (
      <div className="space-y-3">
        {members.map((m) => <MemberCard key={m.id} member={m} />)}
      </div>
    );
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
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <Users size={28} className="text-primary" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Taille équipe</span>
            <span className="text-lg font-bold text-foreground">{totalMembers}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
              <DollarSign size={28} className="text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground mb-1">Revenu Total</span>
            <span className="text-lg font-bold text-primary">0 <span className="text-xs font-normal text-muted-foreground">FCFA</span></span>
          </div>
        </div>

        <Tabs defaultValue="a" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="a" className="text-xs">
              Niveau A <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{levelA.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="b" className="text-xs">
              Niveau B <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{levelB.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="c" className="text-xs">
              Niveau C <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{levelC.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="a"><MemberList members={levelA} /></TabsContent>
          <TabsContent value="b"><MemberList members={levelB} /></TabsContent>
          <TabsContent value="c"><MemberList members={levelC} /></TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Team;
