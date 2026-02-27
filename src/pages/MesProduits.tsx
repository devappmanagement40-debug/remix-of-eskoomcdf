import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { X, Info } from "lucide-react";

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
  } | null;
};

const MesProduits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [activeTab, setActiveTab] = useState<TabKey>("tous");
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<UserProduct | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const { data } = await supabase
      .from("user_products")
      .select("*, products(name, price, daily_revenue, total_revenue, cycles, description, image_url)")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false });

    if (data) setUserProducts(data as UserProduct[]);
    setLoading(false);
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
    if (!up.purchased_at) return 0;
    const start = new Date(up.purchased_at);
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const cycles = up.products?.cycles || 365;
    return Math.min(diff, cycles);
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

    // Credit earnings
    const { error: updateErr } = await supabase.from("profiles").update({
      balance: (profile.balance || 0) + dailyRevenue,
      earnings_balance: (profile.earnings_balance || 0) + dailyRevenue,
    }).eq("user_id", user.id);

    if (updateErr) {
      showError("Erreur", "Impossible de collecter les gains");
      setCollecting(null);
      return;
    }

    // Update last_collected_at and total_collected
    await supabase.from("user_products").update({
      last_collected_at: new Date().toISOString(),
      total_collected: (up.total_collected || 0) + dailyRevenue,
    }).eq("id", up.id);

    showSuccess("Gains collectés ! 🎉", `+${dailyRevenue.toLocaleString("fr-FR")} FCFA crédités sur votre compte`);
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

  // Product detail modal
  if (detailProduct) {
    const product = detailProduct.products;
    const status = getStatus(detailProduct);
    const cycles = product?.cycles || 365;
    const daysReceived = getDaysReceived(detailProduct);
    const dailyRevenue = Number(product?.daily_revenue) || 0;
    const totalRevenue = dailyRevenue * cycles;
    const earnedSoFar = detailProduct.total_collected || 0;

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
                <p className="text-sm font-bold text-foreground">{Number(product?.price).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Revenu quotidien</p>
                <p className="text-sm font-bold text-success">{dailyRevenue.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Revenu total</p>
                <p className="text-sm font-bold text-primary">{totalRevenue.toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Durée (cycles)</p>
                <p className="text-sm font-bold text-foreground">{cycles} jours</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Déjà collecté</p>
                <p className="text-sm font-bold text-foreground">{Number(earnedSoFar).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Jours reçus</p>
                <p className="text-sm font-bold text-foreground">{daysReceived} / {cycles}</p>
              </div>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              status === "actif" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}>
              {status === "actif" ? "✅ Actif" : "⏹ Terminé"}
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
        {/* Tabs - green gradient style like reference */}
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
              const totalRevenue = dailyRevenue * cycles;
              const earnedSoFar = up.total_collected || 0;
              const purchaseDate = up.purchased_at
                ? new Date(up.purchased_at).toLocaleDateString("fr-FR")
                : "—";
              const collectible = canCollect(up);

              return (
                <div key={up.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  {/* Green gradient header like reference */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-success to-success/70 cursor-pointer"
                    onClick={() => setDetailProduct(up)}
                  >
                    <span className="text-sm font-bold text-success-foreground">{product.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-success-foreground/80">Heure de réception</span>
                      <span className="text-xs font-semibold text-success-foreground">{purchaseDate}</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2.5">
                    {/* Revenu Total */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">Revenu Total</span>
                      <span className="text-lg font-bold text-foreground">
                        {totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">CFA</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Revenu obtenu</span>
                        <span className="text-sm text-foreground">
                          {Number(earnedSoFar).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">CFA</span>
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

                    {/* Collect / status button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCollect(up); }}
                      disabled={!collectible || collecting === up.id || status !== "actif"}
                      className={`w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-colors ${
                        status !== "actif"
                          ? "bg-secondary text-muted-foreground cursor-not-allowed"
                          : collectible
                            ? "bg-gradient-to-r from-success to-success/80 text-success-foreground active:scale-[0.98] transition-transform"
                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {collecting === up.id
                        ? "Collecte..."
                        : status !== "actif"
                          ? "Recevoir"
                          : collectible
                            ? "Recevoir"
                            : "Recevoir"}
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
