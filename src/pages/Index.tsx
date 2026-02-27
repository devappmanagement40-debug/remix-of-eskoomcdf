import { Headphones, Mail, RefreshCw, ShoppingBag, Clock, Download, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import FloatingButtons from "@/components/FloatingButtons";
import PremiumModal from "@/components/PremiumModal";
import InviteModal from "@/components/InviteModal";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import bannerHome from "@/assets/banner-home.jpg";
import newsAudit from "@/assets/news-audit.jpg";
import newsCertificat from "@/assets/news-certificat.jpg";

const circleActions = [
  { icon: ShoppingBag, label: "Mon produit", path: "/mes-produits" },
  { icon: Clock, label: "Rechargeur", path: "/recharge" },
  { icon: Download, label: "Retrait", path: "/portefeuille" },
  { icon: Users, label: "Mon équipe", path: "/equipe" },
];

const quickActions = [
  { icon: Headphones, label: "Service" },
  { icon: Mail, label: "Inviter des amis" },
  { icon: RefreshCw, label: "Échangeur" },
];

const fallbackBanners = [
  { image_url: bannerHome, link_path: "/loterie" },
  { image_url: newsAudit, link_path: "/actualite/controle-fiscal" },
  { image_url: newsCertificat, link_path: "/actualite/certificat-officiel" },
];

const newsItems = [
  {
    title: "Contrôle fiscal en cours..",
    description: "Suite au récent contrôle de conformité financière et fiscale, ESKOM a reçu une notification officielle des autorités réglementaires...",
    image: newsAudit,
    slug: "controle-fiscal",
  },
  {
    title: "ESKOM reçoit un certificat officiel",
    description: "Nous avons le plaisir de vous annoncer qu'ESKOM Energy a officiellement reçu un certificat de conformité délivré par la Direction Générale des Impôts...",
    image: newsCertificat,
    slug: "certificat-officiel",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showService, setShowService] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [banners, setBanners] = useState<{ image_url: string; link_path: string }[]>(fallbackBanners);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("banners").select("image_url, link_path").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data && data.length > 0) setBanners(data);
    });
    supabase.from("products").select("*").eq("is_active", true).eq("is_featured", true).order("sort_order").then(({ data }) => {
      if (data) setFeaturedProducts(data);
    });
  }, []);

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    const interval = setInterval(nextBanner, 4000);
    return () => clearInterval(interval);
  }, [nextBanner]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner Carousel */}
      <section className="px-4 pt-4">
        <div className="relative rounded-xl overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <img
                key={index}
                src={banner.image_url}
                alt="ESKOM Energy"
                className="w-full h-44 object-cover flex-shrink-0 cursor-pointer"
                onClick={() => navigate(banner.link_path)}
              />
            ))}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentBanner ? "bg-primary w-5" : "bg-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Circle Actions */}
      <section className="px-4 mt-6">
        <div className="grid grid-cols-4 gap-4">
          {circleActions.map((action) => (
            <button key={action.label} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border border-muted hover:border-primary transition-colors">
                <action.icon size={22} className="text-muted-foreground" />
              </div>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Actions Row */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (action.label === "Service") setShowService(true);
                else if (action.label === "Inviter des amis") setShowInvite(true);
                else if (action.label === "Échangeur") navigate("/echanger-code");
              }}
              className="flex flex-col items-center gap-2 bg-card rounded-xl py-4 px-2 border border-secondary hover:border-primary transition-colors"
            >
              <action.icon size={22} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Products */}
      {featuredProducts.length > 0 && (
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Produits populaires
            </h2>
            <button onClick={() => navigate("/produits")} className="text-xs text-primary font-semibold">Voir tout</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {featuredProducts.map((product) => (
              <div key={product.id} onClick={() => navigate("/produits")} className="bg-card rounded-xl border border-secondary overflow-hidden min-w-[220px] snap-start cursor-pointer hover:border-primary transition-colors">
                <div className="flex gap-3 p-3">
                  {product.image_url ? (
                    <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      {product.is_new && (
                        <Badge className="absolute top-1 left-1 bg-success text-success-foreground text-[8px] px-1 py-0">new</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-secondary/30 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={20} className="text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">{product.name}</span>
                    <div className="flex gap-1">
                      <Badge className="bg-success text-success-foreground text-[9px] px-1 py-0">{product.return_percent}%</Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Revenu: <span className="text-primary font-bold">{Number(product.daily_revenue).toLocaleString("fr-FR")} FCFA/j</span></p>
                    <p className="text-[10px] font-bold text-primary">{Number(product.price).toLocaleString("fr-FR")} FCFA</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Information / News */}
      <section className="mt-6 px-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Information</h2>
        <div className="space-y-4">
          {newsItems.map((item) => (
            <div
              key={item.title}
              onClick={() => navigate(`/actualite/${item.slug}`)}
              className="bg-card rounded-xl border border-secondary p-4 flex gap-4 cursor-pointer hover:border-primary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
              <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <PremiumModal
        triggerKey="service_client"
        open={showService}
        onClose={() => setShowService(false)}
        onConfirm={() => navigate("/service-chat")}
      />

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
      <FloatingButtons />
      <BottomNav />
    </div>
  );
};

export default Index;
