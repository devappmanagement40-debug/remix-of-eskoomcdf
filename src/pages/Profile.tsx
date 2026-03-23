import { Wallet, Download, Clock, MessageCircle, Headphones, FileText, Smartphone, CreditCard, Lock, Gift, LogOut, Crown, ChevronRight, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import { useVipProgress } from "@/hooks/useVipProgress";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import PremiumModal from "@/components/PremiumModal";

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
  { icon: Gift, label: "Monnaie Eskom", path: "/points-cadeaux" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { profile, userId, loading } = useRealtimeProfile();
  const { displaySettings } = useDisplaySettings();
  const { vipProgress } = useVipProgress(userId, profile.vip_level, profile.balance);
  const [showLogout, setShowLogout] = useState(false);
  const [userProducts, setUserProducts] = useState<any[]>([]);

  const phone = profile.phone || "...";

  // Fetch user products when display is enabled
  useEffect(() => {
    if (!userId || !displaySettings.profile_products_display_enabled) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("user_products")
        .select("id, product_id, is_active, purchased_at, products(name, image_url, price)")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (data) setUserProducts(data);
    };
    fetchProducts();
  }, [userId, displaySettings.profile_products_display_enabled]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon Compte" />
      <div className="px-4 pt-6">
        {/* VIP Header */}
        <div className="relative bg-card rounded-2xl border border-secondary p-6 mb-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              {vipProgress.currentLevelImage ? (
                <img
                  src={vipProgress.currentLevelImage}
                  alt={vipProgress.currentLevelName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-[0_0_20px_hsl(174_72%_50%/0.3)]"
                />
              ) : (
                <Avatar className="w-20 h-20 border-2 border-primary shadow-[0_0_20px_hsl(174_72%_50%/0.3)]">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-2xl font-bold text-primary">
                    {phone.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-button flex items-center justify-center shadow-lg">
                <Crown size={14} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground tracking-wide">{phone}</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full gradient-button text-xs font-bold text-primary-foreground shadow-[0_0_15px_hsl(174_72%_50%/0.4)]">
                <Crown size={12} />
                {vipProgress.currentLevelName}
              </span>
            </div>
            {displaySettings.vip_progress_bar_enabled && vipProgress.nextLevelName && (
              <p className="text-xs text-primary font-medium">
                Suivant VIP : <span className="font-bold">{vipProgress.nextLevelName}</span>
              </p>
            )}
            {displaySettings.vip_progress_bar_enabled && vipProgress.nextLevelName && (
              <div className="w-full mt-2 bg-secondary/50 rounded-xl p-4 border border-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Progression vers {vipProgress.nextLevelName}</span>
                  <span className="text-xs font-bold text-primary">{vipProgress.overallProgress}%</span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${vipProgress.overallProgress}%`,
                      background: 'linear-gradient(90deg, hsl(174 72% 50%), hsl(174 72% 65%), hsl(200 80% 55%))',
                      boxShadow: '0 0 10px hsl(174 72% 50% / 0.5)',
                    }}
                  />
                </div>
                {vipProgress.criteria.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {vipProgress.criteria.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className={c.met ? "text-success font-medium" : "text-muted-foreground"}>
                          {c.met ? "✅" : "⬜"} {c.label}
                        </span>
                        <span className={c.met ? "text-success font-bold" : "text-muted-foreground"}>
                          {typeof c.current === 'number' && c.current > 100
                            ? `${c.current.toLocaleString('fr-FR')} / ${c.required.toLocaleString('fr-FR')}`
                            : `${c.current} / ${c.required}`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {vipProgress.allMet ? "Félicitations ! Conditions remplies 🎉" : `Encore ${100 - vipProgress.overallProgress}% pour passer au niveau supérieur`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          {loading ? (
            <div className="h-8 w-32 bg-secondary/50 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-primary">{profile.balance.toLocaleString('fr-FR')} XAF</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4 flex items-center justify-around">
          {actionButtons.map((item) => (
            <button key={item.label} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-2">
              <item.icon size={24} className="text-foreground" />
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Produits actifs */}
        {displaySettings.profile_products_display_enabled && userProducts.length > 0 && (
          <div className="bg-card rounded-xl border border-secondary p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Mes produits actifs</h3>
              <span className="ml-auto text-xs font-bold text-primary">{vipProgress.currentLevelName}</span>
            </div>
            <div className="space-y-2">
              {userProducts.map((up: any) => (
                <div key={up.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                  {up.products?.image_url && (
                    <img src={up.products.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{up.products?.name || "Produit"}</p>
                    <p className="text-[10px] text-muted-foreground">{up.products?.price?.toLocaleString('fr-FR')} XAF</p>
                  </div>
                  <span className="text-[10px] font-medium text-success">Actif</span>
                </div>
              ))}
            </div>
          </div>
        )}


        <div className="bg-card rounded-xl border border-secondary p-4 mb-4">
          <div className="grid grid-cols-4 gap-x-2 gap-y-5">
            {menuGrid.map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-1.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <item.icon size={22} className="text-muted-foreground" />
                </div>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight w-full px-0.5 line-clamp-2">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Déconnexion */}
        <button onClick={() => setShowLogout(true)} className="w-full bg-card rounded-xl border border-secondary p-4 flex items-center justify-center gap-3 hover:border-primary transition-colors">
          <LogOut size={20} className="text-primary" />
          <span className="text-sm font-medium text-primary">Se déconnecter</span>
        </button>
      </div>

      <PremiumModal
        triggerKey="logout_confirm"
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={async () => { await supabase.auth.signOut(); navigate("/connexion"); }}
        onCancel={() => setShowLogout(false)}
      />
      <BottomNav />
    </div>
  );
};

export default Profile;
