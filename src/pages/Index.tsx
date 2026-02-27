import { Headphones, Mail, RefreshCw, ShoppingBag, Clock, Download, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import FloatingButtons from "@/components/FloatingButtons";
import ProductCard from "@/components/ProductCard";
import productServer from "@/assets/product-server.jpg";
import productSolar from "@/assets/product-solar.jpg";
import productWind from "@/assets/product-wind.jpg";
import bannerHome from "@/assets/banner-home.jpg";
import newsAudit from "@/assets/news-audit.jpg";
import newsCertificat from "@/assets/news-certificat.jpg";

const banners = [
  { image: bannerHome, path: "/loterie" },
  { image: newsAudit, path: "/actualite/controle-fiscal" },
  { image: newsCertificat, path: "/actualite/certificat-officiel" },
];

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

const products = [
  {
    image: productServer,
    name: "TC 500",
    returnPercent: "1560.0%",
    totalRevenue: "78 000,00",
    dailyRevenue: "200,00",
    cycles: 365,
    price: "5 000,00",
    isNew: true,
  },
  {
    image: productSolar,
    name: "TC 1000",
    returnPercent: "1820.0%",
    totalRevenue: "182 000,00",
    dailyRevenue: "500,00",
    cycles: 365,
    price: "10 000,00",
    isNew: false,
  },
  {
    image: productWind,
    name: "TC 2500",
    returnPercent: "2100.0%",
    totalRevenue: "525 000,00",
    dailyRevenue: "1 438,00",
    cycles: 365,
    price: "25 000,00",
    isNew: true,
  },
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

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, []);

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
                src={banner.image}
                alt="ESKOM Energy"
                className="w-full h-44 object-cover flex-shrink-0 cursor-pointer"
                onClick={() => navigate(banner.path)}
              />
            ))}
          </div>
          {/* Dots */}
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
              className="flex flex-col items-center gap-2 bg-card rounded-xl py-4 px-2 border border-secondary hover:border-primary transition-colors"
            >
              <action.icon size={22} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="mt-6 px-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Produits Populaires</h2>
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
          {products.map((product) => (
            <ProductCard key={product.name} {...product} />
          ))}
        </div>
      </section>

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

      <FloatingButtons />
      <BottomNav />
    </div>
  );
};

export default Index;
