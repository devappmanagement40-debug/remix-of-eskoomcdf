import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { Info, ChevronRight, Clock, TrendingUp, Zap } from "lucide-react";

type TabKey = "tous" | "detenir" | "expire";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "detenir", label: "Actifs" },
  { key: "expire", label: "Expirés" },
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
    series_id: string;
  } | null;
};

type Series = { id: string; name: string; color: string | null };

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
          .select("*, products(name, price, daily_revenue, total_revenue, cycles, description, image_url, series_id)")
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
    if (!up.last_collected_at) return true;
    const lastCollected = new Date(up.last_collected_at);
    const hoursSince = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 24;
  };

  const handleCollect = async (up: UserProduct) => {
    if (!canCollect(up) || collecting) return;
    setCollecting(up.id);

    const dailyRevenue = Number(up.products?.daily_revenue) || 0;
    if (dailyRevenue <= 0) { setCollecting(null); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCollecting(null); return; }

    const { data: profile } = await supabase.from("profiles")
      .select("balance, earnings_balance")
      .eq("user_id", user.id).single();

    if (!profile) { setCollecting(null); return; }

    const { error: updateErr } = await supabase.from("profiles").update({
      balance: (profile.balance || 0) + dailyRevenue,
      earnings_balance: (profile.earnings_balance || 0) + dailyRevenue,
    }).eq("user_id", user.id);

    if (updateErr) {
      showError("Erreur", "Impossible de collecter les gains");
      setCollecting(null);
      return;
    }

    await supabase.from("user_products").update({
      last_collected_at: new Date().toISOString(),
      total_collected: (up.total_collected || 0) + dailyRevenue,
    }).eq("id", up.id);

    showSuccess("Gains collectes", `+${dailyRevenue.toLocaleString("fr-FR")} FCFA credites sur votre compte`);
    setCollecting(null);
    load();
  };

  const filtered = userProducts.filter((up) => {
    const status = getStatus(up);
    if (activeTab === "tous") return true;
    if (activeTab === "detenir") return status === "actif";
    if (activeTab === "expire") return status === "expire";
    return true;
  });

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  // Detail view
  if (detailProduct) {
    const product = detailProduct.products;
    const status = getStatus(detailProduct);
    const cycles = product?.cycles || 365;
    const daysReceived = getDaysReceived(detailProduct);
    const dailyRevenue = Number(product?.daily_revenue) || 0;
    const totalRevenue = dailyRevenue * cycles;
    const earnedSoFar = detailProduct.total_collected || 0;
    const progress = cycles > 0 ? Math.min((daysReceived / cycles) * 100, 100) : 0;

    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Details du produit" showBack />
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setDetailProduct(null)} className="flex items-center gap-2 text-sm text-primary font-semibold">
            ← Retour
          </button>

          {product?.image_url && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-border/30">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3">
            <h2 className="text-lg font-bold text-foreground">{product?.name}</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prix d'achat", value: `${fmt(Number(product?.price))} F` },
                { label: "Revenu quotidien", value: `${fmt(dailyRevenue)} F`, highlight: true },
                { label: "Revenu total", value: `${fmt(totalRevenue)} F` },
                { label: "Duree", value: `${cycles} jours` },
                { label: "Deja collecte", value: `${fmt(earnedSoFar)} F` },
                { label: "Jours recus", value: `${daysReceived} / ${cycles}` },
              ].map((item) => (
                <div key={item.label} className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-bold ${item.highlight ? "text-primary" : "text-foreground"}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === "actif" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
            }`}>
              {status === "actif" ? "Actif" : "Termine"}
            </div>
          </div>

          {product?.description && (
            <div className="bg-card rounded-xl border border-border/30 p-4">
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

  // Stats summary
  const totalInvested = userProducts.reduce((sum, up) => sum + Number(up.products?.price || 0), 0);
  const totalEarned = userProducts.reduce((sum, up) => sum + (up.total_collected || 0), 0);
  const activeCount = userProducts.filter((up) => getStatus(up) === "actif").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mes Produits" showBack />
      <div className="px-4 pt-4">

        {/* Stats cards */}
        {!loading && userProducts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
              <Zap size={16} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Actifs</p>
            </div>
            <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
              <TrendingUp size={16} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{fmt(totalEarned)}</p>
              <p className="text-[10px] text-muted-foreground">Gains</p>
            </div>
            <div className="bg-card rounded-xl border border-border/30 p-3 text-center">
              <Clock size={16} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{fmt(totalInvested)}</p>
              <p className="text-[10px] text-muted-foreground">Investi</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 bg-secondary/50 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border/30 p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-secondary rounded" />
                      <div className="h-3 w-32 bg-secondary rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Zap size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Aucun produit</p>
              <p className="text-xs text-muted-foreground">Les produits achetes apparaitront ici</p>
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
              const earnedSoFar = up.total_collected || 0;
              const progress = cycles > 0 ? Math.min((daysReceived / cycles) * 100, 100) : 0;
              const purchaseDate = up.purchased_at
                ? new Date(up.purchased_at).toLocaleDateString("fr-FR")
                : "—";
              const collectible = canCollect(up);
              const isExpired = status !== "actif";

              return (
                <div key={up.id} className="bg-card rounded-xl border border-border/30 overflow-hidden">
                  {/* Product header with thumbnail */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer active:bg-secondary/30 transition-colors"
                    onClick={() => setDetailProduct(up)}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/20 shrink-0 bg-secondary">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Zap size={20} className="text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isExpired ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                        }`}>
                          {isExpired ? "Expire" : "Actif"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Acquis le {purchaseDate}</p>
                    </div>

                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </div>

                  {/* Data rows */}
                  <div className="px-3 pb-1">
                    <div className="bg-secondary/30 rounded-lg px-3 py-2.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Revenu total</span>
                        <span className="text-sm font-bold text-foreground">{fmt(totalRevenue)} <span className="text-[10px] text-muted-foreground font-normal">CFA</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Revenu obtenu</span>
                        <span className="text-sm font-semibold text-primary">{fmt(earnedSoFar)} <span className="text-[10px] text-muted-foreground font-normal">CFA</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Revenu journalier</span>
                        <span className="text-sm text-foreground">{fmt(dailyRevenue)} <span className="text-[10px] text-muted-foreground font-normal">CFA</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Validite</span>
                        <span className="text-sm text-foreground">{cycles} jours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Collectes</span>
                        <span className="text-sm text-foreground">{daysReceived} / {cycles}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="pt-1">
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collect button */}
                  <div className="px-3 pb-3 pt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCollect(up); }}
                      disabled={!collectible || collecting === up.id || isExpired}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                        isExpired
                          ? "bg-secondary text-muted-foreground cursor-not-allowed"
                          : collectible
                            ? "bg-primary text-primary-foreground active:scale-[0.98] shadow-sm shadow-primary/20"
                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {collecting === up.id ? "Collecte en cours..." : collectible ? "Collecter les gains" : isExpired ? "Produit expire" : "Deja collecte aujourd'hui"}
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
