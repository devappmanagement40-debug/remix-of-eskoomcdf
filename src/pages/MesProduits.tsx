import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type TabKey = "tous" | "detenir" | "expire";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "detenir", label: "Détenir" },
  { key: "expire", label: "Expiré" },
];

type UserProduct = {
  id: string;
  product_id: string;
  is_active: boolean | null;
  purchased_at: string | null;
  expires_at: string | null;
  products: {
    name: string;
    price: number | null;
    daily_revenue: number | null;
    total_revenue: number | null;
    cycles: number | null;
  } | null;
};

const MesProduits = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("tous");
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }

      const { data } = await supabase
        .from("user_products")
        .select("*, products(name, price, daily_revenue, total_revenue, cycles)")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      if (data) setUserProducts(data as UserProduct[]);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const now = new Date();

  const getStatus = (up: UserProduct) => {
    if (!up.is_active) return "expire";
    if (up.expires_at && new Date(up.expires_at) < now) return "expire";
    return "actif";
  };

  const getDaysReceived = (up: UserProduct) => {
    if (!up.purchased_at) return 0;
    const start = new Date(up.purchased_at);
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const cycles = up.products?.cycles || 365;
    return Math.min(diff, cycles);
  };

  const filtered = userProducts.filter((up) => {
    const status = getStatus(up);
    if (activeTab === "tous") return true;
    if (activeTab === "detenir") return status === "actif";
    if (activeTab === "expire") return status === "expire";
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon produit" showBack />
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-10">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <p className="text-sm text-muted-foreground">Aucun produit dans cette catégorie</p>
            </div>
          ) : (
            filtered.map((up) => {
              const product = up.products;
              if (!product) return null;
              const status = getStatus(up);
              const cycles = product.cycles || 365;
              const daysReceived = getDaysReceived(up);
              const dailyRevenue = Number(product.daily_revenue) || 0;
              const totalRevenue = dailyRevenue * cycles;
              const earnedSoFar = dailyRevenue * daysReceived;
              const purchaseDate = up.purchased_at
                ? new Date(up.purchased_at).toLocaleDateString("fr-FR")
                : "—";

              return (
                <div key={up.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/80 to-primary">
                    <span className="text-sm font-bold text-primary-foreground">{product.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-primary-foreground/80">Acheté le</span>
                      <span className="text-xs font-semibold text-primary-foreground">{purchaseDate}</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">Revenu Total</span>
                      <span className="text-lg font-bold text-foreground">
                        {totalRevenue.toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">CFA</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Revenu obtenu</span>
                        <span className="text-sm text-foreground">
                          {earnedSoFar.toLocaleString("fr-FR")} <span className="text-xs text-muted-foreground">CFA</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Période de validité</span>
                        <span className="text-sm text-foreground">{cycles} Jour</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Nombre de fois reçu</span>
                        <span className="text-sm text-foreground">{daysReceived} / {cycles}</span>
                      </div>
                    </div>

                    <button
                      disabled={status !== "actif"}
                      className={`w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-colors ${
                        status === "actif"
                          ? "gradient-button text-foreground"
                          : "bg-secondary text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {status === "actif" ? "Actif" : "Terminé"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MesProduits;
