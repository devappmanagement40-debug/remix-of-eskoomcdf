import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ShoppingCart, Package } from "lucide-react";
import { useActionPopup } from "@/components/ActionPopupProvider";

type Series = { id: string; name: string; color: string | null; sort_order: number | null };
type Product = {
  id: string; series_id: string; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
};

const colorMap: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  purple: "bg-purple-500 text-white",
  blue: "bg-blue-500 text-white",
};

const colorBorderMap: Record<string, string> = {
  primary: "border-primary text-primary",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  destructive: "border-destructive text-destructive",
  purple: "border-purple-500 text-purple-400",
  blue: "border-blue-500 text-blue-400",
};

const Products = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSeries, setActiveSeries] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { showInfo } = useActionPopup();

  useEffect(() => {
    const load = async () => {
      const [s, p] = await Promise.all([
        supabase.from("product_series").select("*").order("sort_order"),
        supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (s.data) setSeries(s.data);
      if (p.data) setProducts(p.data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = activeSeries === "all" ? products : products.filter(p => p.series_id === activeSeries);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Produits" />
      <div className="px-4 pt-4">
        {/* Series tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSeries("all")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              activeSeries === "all" ? "gradient-button text-primary-foreground" : "bg-transparent border border-primary text-primary"
            }`}
          >
            Tous
          </button>
          {series.map(s => {
            const isActive = activeSeries === s.id;
            const color = s.color || "primary";
            return (
              <button
                key={s.id}
                onClick={() => setActiveSeries(s.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive ? colorMap[color] || colorMap.primary : `bg-transparent border ${colorBorderMap[color] || colorBorderMap.primary}`
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Products */}
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-secondary/50 flex items-center justify-center relative">
                <ClipboardList size={40} className="text-muted-foreground/50" />
              </div>
              {/* Decorative diamonds */}
              <div className="absolute -top-3 -left-3 w-3 h-3 bg-muted-foreground/20 rotate-45" />
              <div className="absolute -top-1 left-6 w-2 h-2 bg-muted-foreground/15 rotate-45" />
              <div className="absolute top-2 -right-4 w-2.5 h-2.5 bg-muted-foreground/20 rotate-45" />
              <div className="absolute -bottom-2 right-4 w-2 h-2 bg-muted-foreground/15 rotate-45" />
              <div className="absolute -bottom-4 -left-1 w-2 h-2 bg-muted-foreground/10 rotate-45" />
            </div>
            <p className="text-sm text-muted-foreground">La liste des produits est vide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const productSeries = series.find(s => s.id === product.series_id);
              const seriesColor = productSeries?.color || "primary";

              return (
                <div key={product.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {product.image_url ? (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        {product.is_new && (
                          <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">
                            nouveau
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/30 flex items-center justify-center">
                        <Package size={28} className="text-muted-foreground/30" />
                        {product.is_new && (
                          <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">
                            nouveau
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <Badge variant="outline" className={`${colorBorderMap[seriesColor] || ""} text-[10px]`}>
                          {product.name}
                        </Badge>
                        <Badge className="bg-success text-success-foreground text-[10px]">
                          {product.return_percent}%
                        </Badge>
                        <Badge className="bg-primary/90 text-primary-foreground text-[9px]">
                          Actuellement
                        </Badge>
                      </div>
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
                    <Button
                      className="gradient-button w-full h-8 text-xs font-semibold gap-1.5"
                      onClick={() => showInfo(`Achat de ${product.name} à ${Number(product.price).toLocaleString("fr-FR")} FCFA`, "Confirmer l'achat")}
                    >
                      <ShoppingCart size={14} />
                      Acheter
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Products;
