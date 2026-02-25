import { Headphones, UserPlus, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ProductCard from "@/components/ProductCard";
import productServer from "@/assets/product-server.jpg";
import productSolar from "@/assets/product-solar.jpg";
import productWind from "@/assets/product-wind.jpg";

const quickActions = [
  { icon: Headphones, label: "Service" },
  { icon: UserPlus, label: "Inviter Des Amis" },
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

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Quick Actions */}
      <section className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 bg-card rounded-xl py-4 px-2 border border-secondary hover:border-primary transition-colors"
            >
              <action.icon size={24} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Live Ticker */}
      <section className="mx-4 mt-5">
        <div className="bg-card rounded-xl border border-secondary px-4 py-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-success live-dot" />
              <span className="text-primary text-xs font-bold">LIVE</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm text-muted-foreground whitespace-nowrap ticker-scroll">
                Plus de 1 200 partenaires actifs sur ESKOM Energy · Investissez dans l'énergie durable · Rendements quotidiens garantis
              </p>
            </div>
          </div>
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

      {/* Information */}
      <section className="mt-6 px-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Information</h2>
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Partenaires actifs</span>
            <span className="text-sm font-bold text-primary">1 200+</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total distribué</span>
            <span className="text-sm font-bold text-primary">450 000 000 FCFA</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pays d'opération</span>
            <span className="text-sm font-bold text-primary">Burkina Faso</span>
          </div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default Index;
