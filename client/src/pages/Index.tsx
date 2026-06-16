import { Headphones, Mail, RefreshCw, ShoppingBag, Clock, Download, Users, TrendingUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import FloatingButtons from "@/components/FloatingButtons";
import PremiumModal from "@/components/PremiumModal";
import InviteModal from "@/components/InviteModal";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

type BannerItem = { image_url: string; link_path: string };

const BannerCarousel = ({ banners }: { banners: BannerItem[] }) => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const paused = useRef(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + banners.length) % banners.length);
  }, [banners.length]);

  const next = useCallback(() => { if (!paused.current) goTo(current + 1); }, [current, goTo]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [next, banners.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    paused.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      diff > 0 ? goTo(current + 1) : goTo(current - 1);
    }
    paused.current = false;
  };

  if (banners.length === 0) return null;

  return (
    <section className="px-4 pt-4">
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <img
              key={index}
              src={banner.image_url}
              alt="GE Energy"
              className="w-full h-44 object-cover flex-shrink-0 cursor-pointer select-none"
              draggable={false}
              onClick={() => navigate(banner.link_path)}
              loading={index === 0 ? undefined : "lazy"}
            />
          ))}
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 items-center">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === current
                    ? "bg-white w-5 h-2"
                    : "bg-white/50 w-2 h-2"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showService, setShowService] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);

  const circleActions = [
    { icon: ShoppingBag, label: t.index.myProducts, path: "/mes-produits" },
    { icon: Clock, label: t.index.depositAction, path: "/recharge" },
    { icon: Download, label: t.index.withdrawAction, path: "/portefeuille" },
    { icon: Users, label: t.index.myTeam, path: "/equipe" },
  ];

  const quickActions = [
    { icon: Headphones, label: t.index.support, key: "Support" },
    { icon: Mail, label: t.index.inviteFriends, key: "Invite" },
    { icon: RefreshCw, label: t.index.exchange, key: "Exchange" },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bannersData, productsData, annoncesData] = await Promise.allSettled([
          api.get("/banners"),
          api.get("/products"),
          api.get("/info-items"),
        ]);
        if (bannersData.status === "fulfilled" && bannersData.value?.length) {
          setBanners(bannersData.value.map((b: any) => ({
            image_url: b.imageUrl ?? b.image_url ?? "",
            link_path: b.linkPath ?? b.link_path ?? "/",
          })));
        }
        if (productsData.status === "fulfilled" && productsData.value) {
          setFeaturedProducts(productsData.value.filter((p: any) => p.isFeatured || p.is_featured));
        }
        if (annoncesData.status === "fulfilled" && annoncesData.value) {
          setAnnonces(annoncesData.value);
        }
      } catch (err) {
        console.error("Index load error:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    setShowPromo(false);
    const timer = setTimeout(() => {
      api.get("/popup-messages?triggerKey=welcome_promo").then((data: any[]) => {
        if (data?.length > 0) setShowPromo(true);
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [location.key]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <BannerCarousel banners={banners} />

      {/* Circle Actions */}
      <section className={`px-4 ${banners.length > 0 ? "mt-6" : "mt-4"}`}>
        <div className="grid grid-cols-4 gap-4">
          {circleActions.map((action) => (
            <button key={action.path} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2">
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
              key={action.key}
              onClick={() => {
                if (action.key === "Support") setShowService(true);
                else if (action.key === "Invite") setShowInvite(true);
                else if (action.key === "Exchange") navigate("/echanger-code");
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
              <TrendingUp size={18} className="text-primary" /> {t.index.popularProducts}
            </h2>
            <button onClick={() => navigate("/produits")} className="text-xs text-primary font-semibold">{t.common.viewAll}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {featuredProducts.map((product) => (
              <div key={product.id} className="bg-card rounded-xl border border-secondary overflow-hidden min-w-[280px] snap-start flex flex-col">
                <div className="flex gap-3 p-3">
                  {product.image_url ? (
                    <div className="relative w-28 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={product.image_url} alt={product.name} width={224} height={256} loading="lazy" className="w-full h-full object-cover" />
                      {product.is_new && (
                        <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">{t.common.new}</Badge>
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
                        <p className="text-[9px] text-muted-foreground">{t.index.totalRevenue}</p>
                        <p className="text-xs font-bold text-primary">{Number(product.total_revenue).toLocaleString("en-US")} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">{t.index.dailyRevenue}</p>
                        <p className="text-xs font-bold text-primary">{Number(product.daily_revenue).toLocaleString("en-US")} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">{t.index.cycles}</p>
                        <p className="text-xs font-bold text-primary">{product.cycles}d</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">{t.index.price}</p>
                        <p className="text-xs font-bold text-primary">{Number(product.price).toLocaleString("en-US")} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <button onClick={() => navigate("/produits")} className="gradient-button w-full h-8 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg text-primary-foreground">
                    <ShoppingBag size={14} /> {t.common.buy}
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
          <h2 className="text-lg font-bold text-foreground mb-4">{t.index.announcements}</h2>
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
                  <span className="text-[10px] text-primary font-semibold mt-2 inline-block">{t.common.readMore}</span>
                </div>
                {item.image_url && (
                  <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/40">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      width={192}
                      height={160}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
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

      <PremiumModal
        triggerKey="welcome_promo"
        open={showPromo}
        onClose={() => setShowPromo(false)}
      />

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
      <FloatingButtons />
      <BottomNav />
    </div>
  );
};

export default Index;
