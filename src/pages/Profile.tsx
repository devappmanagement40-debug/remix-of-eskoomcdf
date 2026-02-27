import { Wallet, Download, Clock, MessageCircle, Headphones, FileText, Smartphone, CreditCard, Lock, Gift, LogOut, Crown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import PremiumModal from "@/components/PremiumModal";

const vipLevels = ["VIP0", "VIP1", "VIP2", "VIP3", "VIP4", "VIP5"];

const actionButtons = [
  { icon: Wallet, label: "Recharger", path: "/portefeuille" },
  { icon: Download, label: "Retirer", path: "/retrait" },
  { icon: Clock, label: "Historique", path: "/historique" },
];

const menuGrid = [
  { icon: MessageCircle, label: "À propos de nous", path: "/a-propos" },
  { icon: Headphones, label: "Service client", path: "/aide" },
  { icon: Clock, label: "Enregistrements", path: "/historique" },
  { icon: FileText, label: "Réglementation", path: "/aide" },
  { icon: Smartphone, label: "Télécharger APP", path: "#" },
  { icon: CreditCard, label: "Lier carte bancaire", path: "/lier-carte" },
  { icon: Lock, label: "Changer mot de passe", path: "/parametres" },
  { icon: Gift, label: "Échanger cadeau", path: "/points-cadeaux" },
];

const Profile = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("...");
  const [balance, setBalance] = useState(0);
  const [vipIndex, setVipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setPhone(data.phone || user.email || "Utilisateur");
        setBalance(data.balance || 0);
        // VIP logic placeholder — customize thresholds as needed
        const bal = data.balance || 0;
        if (bal >= 500000) { setVipIndex(5); setProgress(100); }
        else if (bal >= 200000) { setVipIndex(4); setProgress(((bal - 200000) / 300000) * 100); }
        else if (bal >= 100000) { setVipIndex(3); setProgress(((bal - 100000) / 100000) * 100); }
        else if (bal >= 50000) { setVipIndex(2); setProgress(((bal - 50000) / 50000) * 100); }
        else if (bal >= 10000) { setVipIndex(1); setProgress(((bal - 10000) / 40000) * 100); }
        else { setVipIndex(0); setProgress((bal / 10000) * 100); }
      }
    };
    fetchProfile();
  }, []);

  const currentVip = vipLevels[vipIndex];
  const nextVip = vipIndex < vipLevels.length - 1 ? vipLevels[vipIndex + 1] : null;
  const progressClamped = Math.min(Math.round(progress), 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon Compte" />
      <div className="px-4 pt-6">

        {/* ===== VIP Header ===== */}
        <div className="relative bg-card rounded-2xl border border-secondary p-6 mb-4 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-20 h-20 border-2 border-primary shadow-[0_0_20px_hsl(174_72%_50%/0.3)]">
                <AvatarImage src="" />
                <AvatarFallback className="bg-secondary text-2xl font-bold text-primary">
                  {phone.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-button flex items-center justify-center shadow-lg">
                <Crown size={14} className="text-primary-foreground" />
              </div>
            </div>

            {/* Phone */}
            <p className="text-lg font-bold text-foreground tracking-wide">{phone}</p>

            {/* VIP Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full gradient-button text-xs font-bold text-primary-foreground shadow-[0_0_15px_hsl(174_72%_50%/0.4)]">
                <Crown size={12} />
                {currentVip}
              </span>
            </div>

            {nextVip && (
              <p className="text-xs text-primary font-medium">
                Suivant VIP : <span className="font-bold">{nextVip}</span>
              </p>
            )}

            {/* Progress Section */}
            {nextVip && (
              <div className="w-full mt-2 bg-secondary/50 rounded-xl p-4 border border-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Progression vers {nextVip}</span>
                  <span className="text-xs font-bold text-primary">{progressClamped}%</span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressClamped}%`,
                      background: 'linear-gradient(90deg, hsl(174 72% 50%), hsl(174 72% 65%), hsl(200 80% 55%))',
                      boxShadow: '0 0 10px hsl(174 72% 50% / 0.5)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {progressClamped < 100
                    ? `Encore ${100 - progressClamped}% pour passer au niveau supérieur`
                    : "Félicitations ! Niveau atteint 🎉"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== Balance ===== */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-2xl font-bold text-primary">{balance.toLocaleString('fr-FR')} FCFA</p>
        </div>

        {/* Action buttons */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4 flex items-center justify-around">
          {actionButtons.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2"
            >
              <item.icon size={24} className="text-foreground" />
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="bg-card rounded-xl border border-secondary p-4 mb-4">
          <div className="grid grid-cols-4 gap-x-2 gap-y-5">
            {menuGrid.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1.5 min-w-0"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <item.icon size={22} className="text-muted-foreground" />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight w-full px-0.5 line-clamp-2">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full bg-card rounded-xl border border-secondary p-4 flex items-center justify-center gap-3 hover:border-primary transition-colors"
        >
          <LogOut size={20} className="text-primary" />
          <span className="text-sm font-medium text-primary">Se déconnecter</span>
        </button>
      </div>

      <PremiumModal
        triggerKey="logout_confirm"
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={async () => {
          await supabase.auth.signOut();
          navigate("/connexion");
        }}
        onCancel={() => setShowLogout(false)}
      />

      <BottomNav />
    </div>
  );
};

export default Profile;
