import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { Info } from "lucide-react";

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
  last_collected_at: string | null;
  total_collected: number | null;
  products: {
    name: string;
    price: number | null;
    daily_revenue: number | null;
    total_revenue: number | null;
    cycles: number | null;
    description: string | null;
    image_url: string | null;
    series_id: string | null;
    gain_type: string;
  } | null;
};

type Series = { id: string; name: string; color: string | null };

const seriesGradients: Record<string, string> = {
  primary: "from-primary to-primary/70",
  success: "from-success to-success/70",
  warning: "from-warning to-warning/70",
  destructive: "from-destructive to-destructive/70",
  purple: "from-purple-500 to-purple-500/70",
  blue: "from-blue-500 to-blue-500/70",
};

const seriesTextColors: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  purple: "text-purple-400",
  blue: "text-blue-400",
};

const MesProduits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [activeTab, setActiveTab] = useState<TabKey>("tous");
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, Series>>({});
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<UserProduct | null>(null);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }

      const [productsRes, seriesRes] = await Promise.all([
        supabase
          .from("user_products")
          .select("*, products(name, price, daily_revenue, total_revenue, cycles, description, image_url, series_id, gain_type)")
          .eq("user_id", user.id)
          .order("purchased_at", { ascending: false }),
        supabase.from("product_series").select("id, name, color"),
      ]);

      if (productsRes.data) setUserProducts(productsRes.data as UserProduct[]);
      if (seriesRes.data) {
        const map: Record<string, Series> = {};
        seriesRes.data.forEach((s: any) => { map[s.id] = s; });
        setSeriesMap(map);
      }
    } catch (err) {
      console.error("MesProduits load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("mes-produits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_products" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const now = new Date();

  const getStatus = (up: UserProduct) => {
    if (!up.is_active) return "expire";
    if (up.expires_at && new Date(up.expires_at) < now) return "expire";
    return "actif";
  };

  const getDaysReceived = (up: UserProduct) => {
    const dailyRevenue = Number(up.products?.daily_revenue) || 0;
    if (dailyRevenue <= 0) return 0;
    return Math.round((up.total_collected || 0) / dailyRevenue);
  };

  const canCollect = (up: UserProduct) => {
    if (getStatus(up) !== "actif") return false;
    const gainType = up.products?.gain_type || "daily";
    
    if (gainType === "blocked") {
      // Blocked products: can only collect after cycle ends
      if (!up.purchased_at) return false;
      const purchaseDate = new Date(up.purchased_at);
      const cycles = up.products?.cycles || 365;
      const endDate = new Date(purchaseDate.getTime() + cycles * 24 * 60 * 60 * 1000);
      // Already collected?
      if ((up.total_collected || 0) > 0) return false;
      return now >= endDate;
    }
    
    // Daily products: 24h cooldown
    const referenceTime = up.last_collected_at || up.purchased_at;
    if (!referenceTime) return true;
    const refDate = new Date(referenceTime);
    const hoursSince = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 24;
  };

  const handleCollect = async (up: UserProduct) => {
    if (!canCollect(up) || collecting) return;
    setCollecting(up.id);

    try {
      const { data, error } = await supabase.functions.invoke("collect-revenue", {
        body: { user_product_id: up.id },
      });

      if (error) {
        showError("Erreur", "Impossible de collecter les gains");
        setCollecting(null);
        return;
      }

      if (data?.error) {
        showError("Impossible", data.error);
        setCollecting(null);
        return;
      }

      showSuccess("Gains collectés", `+${Number(data.amount).toLocaleString("fr-FR")} USDT crédités sur votre compte`);
      load();
    } catch (err) {
      showError("Erreur", "Une erreur est survenue");
    } finally {
      setCollecting(null);
    }
  };

  const filtered = userProducts.filter((up) => {
    const status = getStatus(up);
    if (activeTab === "tous") return true;
    if (activeTab === "detenir") return status === "actif";
    if (activeTab === "expire") return status === "expire";
    return true;
  });

  const getColor = (up: UserProduct) => {
    const seriesId = up.products?.series_id;
    if (!seriesId) return "success";
    return seriesMap[seriesId]?.color || "success";
  };

  // Product detail modal
  if (detailProduct) {
    const product = detailProduct.products;
    const status = getStatus(detailProduct);
    const cycles = product?.cycles || 365;
    const daysReceived = getDaysReceived(detailProduct);
    const dailyRevenue = Number(product?.daily_revenue) || 0;
    const gainType = product?.gain_type || "daily";
    const totalRevenue = gainType === "blocked" ? Number(product?.total_revenue) || 0 : dailyRevenue * cycles;
    const earnedSoFar = detailProduct.total_collected || 0;
    const color = getColor(detailProduct);

    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Détails du produit" showBack />
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setDetailProduct(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
            ← Retour
          </button>

          {product?.image_url && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-secondary">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
            <h2 className="text-lg font-bold text-foreground">{product?.name}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Prix d'achat</p>
                <p className="text-sm font-bold text-foreground">{Number(product?.price).toLocaleString("fr-FR")} USDT</p>
              </div>
              {gainType === "daily" && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Revenu quotidien</p>
                  <p className={`text-sm font-bold ${seriesTextColors[color] || "text-success"}`}>{dailyRevenue.toLocaleString("fr-FR")} USDT</p>
                </div>
              )}
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">{gainType === "blocked" ? "Gain prévu" : "Revenu total"}</p>
                <p className={`text-sm font-bold ${seriesTextColors[color] || "text-primary"}`}>{totalRevenue.toLocaleString("fr-FR")} USDT</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Durée (cycles)</p>
                <p className="text-sm font-bold text-foreground">{cycles} jours</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Déjà collecté</p>
                <p className="text-sm font-bold text-foreground">{Number(earnedSoFar).toLocaleString("fr-FR")} USDT</p>
              </div>
              {gainType === "daily" && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Jours reçus</p>
                  <p className="text-sm font-bold text-foreground">{daysReceived} / {cycles}</p>
                </div>
              )}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === "actif" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}>
              {status === "actif" ? "Actif" : "Termine"}
            </div>
          </div>

          {product?.description && (
            <div className="bg-card rounded-xl border border-secondary p-4">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Info size={16} className="text-primary" /> Informations
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon produit" showBack />
      <div className="px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-success to-success/80 text-success-foreground"
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
              const gainType = product.gain_type || "daily";
              const totalRevenue = gainType === "blocked" ? Number(product.total_revenue) || 0 : dailyRevenue * cycles;
              const earnedSoFar = up.total_collected || 0;
              const purchaseDate = up.purchased_at
                ? new Date(up.purchased_at).toLocaleDateString("fr-FR", { timeZone: "America/Port-au-Prince" })
                : "—";
              const collectible = canCollect(up);
              const color = getColor(up);
              const gradient = seriesGradients[color] || seriesGradients.success;
              const textColor = seriesTextColors[color] || seriesTextColors.success;

              // For blocked products, calculate remaining days
              const isBlocked = gainType === "blocked";
              let daysRemaining = 0;
              let cycleProgress = 0;
              if (isBlocked && up.purchased_at) {
                const purchaseDateObj = new Date(up.purchased_at);
                const endDate = new Date(purchaseDateObj.getTime() + cycles * 24 * 60 * 60 * 1000);
                daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                cycleProgress = Math.min(100, Math.round(((cycles - daysRemaining) / cycles) * 100));
              }

              return (
                <div key={up.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  {/* Product image small + header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-success to-success/70 cursor-pointer"
                    onClick={() => setDetailProduct(up)}
                  >
                    {product.image_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-success-foreground flex-1">
                      {product.name}
                      {isBlocked && <span className="ml-1.5 text-[10px] opacity-80">🔒</span>}
                    </span>
                    <div className="text-right">
                      <span className="text-xs text-success-foreground/80 block">{isBlocked ? "Date d'achat" : "Heure de réception"}</span>
                      <span className="text-xs font-semibold text-success-foreground">{purchaseDate}</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2.5">
                    {/* Revenu Total */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${textColor}`}>{isBlocked ? "Gain prévu" : "Revenu Total"}</span>
                      <span className="text-lg font-bold text-foreground">
                        {totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">USDT</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {isBlocked ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Durée du cycle</span>
                            <span className="text-sm text-foreground">{cycles} jours</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Jours restants</span>
                            <span className={`text-sm font-semibold ${daysRemaining > 0 ? "text-warning" : "text-success"}`}>
                              {daysRemaining > 0 ? `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}` : "Terminé ✅"}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${cycleProgress}%`,
                                background: daysRemaining > 0 
                                  ? 'linear-gradient(90deg, hsl(45 93% 47%), hsl(36 100% 50%))' 
                                  : 'linear-gradient(90deg, hsl(142 71% 45%), hsl(142 76% 36%))',
                              }}
                            />
                          </div>
                          {earnedSoFar > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Déjà collecté</span>
                              <span className="text-sm text-foreground">{Number(earnedSoFar).toLocaleString("fr-FR")} USDT</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Revenu obtenu</span>
                            <span className="text-sm text-foreground">
                              {Number(earnedSoFar).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">USDT</span>
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
                        </>
                      )}
                    </div>

                    {/* Collect button - hidden for blocked products during cycle */}
                    {isBlocked && daysRemaining > 0 && earnedSoFar === 0 ? (
                      <div className="w-full py-3 rounded-xl text-sm font-semibold mt-2 bg-warning/10 text-warning text-center border border-warning/20">
                        🔒 Gains bloqués — {daysRemaining}j restants
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCollect(up); }}
                        disabled={!collectible || collecting === up.id || status !== "actif"}
                        className={`w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-colors ${
                          status !== "actif" || (isBlocked && earnedSoFar > 0)
                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                            : collectible
                              ? `bg-gradient-to-r ${gradient} text-white active:scale-[0.98] transition-transform`
                              : "bg-secondary text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {collecting === up.id ? "Collecte..." : isBlocked && earnedSoFar > 0 ? "Déjà collecté" : isBlocked ? "Collecter les gains" : "Recevoir"}
                      </button>
                    )}
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
