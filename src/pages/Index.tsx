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
];

const Index = () => {
  const navigate = useNavigate();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showService, setShowService] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [banners, setBanners] = useState<{ image_url: string; link_path: string }[]>(fallbackBanners);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bannersRes, productsRes, annoncesRes] = await Promise.allSettled([
          supabase.from("banners").select("image_url, link_path").eq("is_active", true).order("sort_order"),
          supabase.from("products").select("*").eq("is_active", true).eq("is_featured", true).order("sort_order"),
          supabase.from("info_items").select("*").eq("is_active", true).order("sort_order"),
        ]);
        if (bannersRes.status === "fulfilled" && bannersRes.value.data?.length) {
          setBanners(bannersRes.value.data);
        }
        if (productsRes.status === "fulfilled" && productsRes.value.data) {
          setFeaturedProducts(productsRes.value.data);
        }
        if (annoncesRes.status === "fulfilled" && annoncesRes.value.data) {
          setAnnonces(annoncesRes.value.data);
        }
      } catch (err) {
        console.error("Index load error:", err);
      }
    };
    loadData();
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
              <div key={product.id} className="bg-card rounded-xl border border-secondary overflow-hidden min-w-[280px] snap-start flex flex-col">
                <div className="flex gap-3 p-3">
                  {product.image_url ? (
                    <div className="relative w-28 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      {product.is_new && (
                        <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">nouveau</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="w-28 h-32 rounded-lg bg-secondary/30 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary text-[10px] w-fit">{product.name}</Badge>
                    <Badge className="bg-success text-success-foreground text-[10px] w-fit">{product.return_percent}%</Badge>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Total des revenus</p>
                        <p className="text-xs font-bold text-primary">{Number(product.total_revenue).toLocaleString("fr-FR")} <span className="text-[9px] font-normal text-muted-foreground">FCFA</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Revenu Quotidien</p>
                        <p className="text-xs font-bold text-primary">{Number(product.daily_revenue).toLocaleString("fr-FR")} <span className="text-[9px] font-normal text-muted-foreground">FCFA</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Cycles</p>
                        <p className="text-xs font-bold text-primary">{product.cycles}j</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Prix</p>
                        <p className="text-xs font-bold text-primary">{Number(product.price).toLocaleString("fr-FR")} <span className="text-[9px] font-normal text-muted-foreground">FCFA</span></p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <button onClick={() => navigate("/produits")} className="gradient-button w-full h-8 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg text-primary-foreground">
                    <ShoppingBag size={14} /> Acheter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Annonces */}
      {annonces.length > 0 && (
        <section className="mt-6 px-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Annonces</h2>
          <div className="space-y-3">
            {annonces.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/actualite/${item.id}`)}
                className="bg-card rounded-xl border border-secondary p-4 flex gap-4 cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>
                  <span className="text-[10px] text-primary font-semibold mt-2 inline-block">Lire la suite →</span>
                </div>
                {item.image_url && (
                  <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
