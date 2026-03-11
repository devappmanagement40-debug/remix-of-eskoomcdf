import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ShoppingCart, Package, Lock } from "lucide-react";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PremiumModal from "@/components/PremiumModal";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Series = {
  id: string; name: string; color: string | null; sort_order: number | null;
  min_vip_level: number | null; min_personal_investment: number | null;
  min_team_investment: number | null; min_active_members: number | null;
};
type Product = {
  id: string; series_id: string; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  max_purchases: number | null;
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

type UserAccessData = {
  vipLevel: number;
  personalInvestment: number;
  activeMembers: number;
  teamInvestment: number;
};

const Products = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSeries, setActiveSeries] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedName, setPurchasedName] = useState("");
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccessData | null>(null);
  const { showError } = useActionPopup();

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p] = await Promise.all([
          supabase.from("product_series").select("*").order("sort_order"),
          supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
        ]);
        if (s.data) setSeries(s.data as Series[]);
        if (p.data) setProducts(p.data as Product[]);

        // Load user access data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("vip_level, deposit_balance, user_id").eq("user_id", user.id).single();
          if (profile) {
            const { data: teamIds } = await supabase.rpc("get_team_profile_ids", { _user_id: user.id });
            let activeMembers = 0;
            let teamInvestment = 0;
            const ids = (teamIds || []) as string[];
            if (ids.length > 0) {
              const { data: memberProfiles } = await supabase.from("profiles").select("user_id, deposit_balance").in("id", ids);
              if (memberProfiles) {
                const memberUserIds = memberProfiles.map((m: any) => m.user_id);
                if (memberUserIds.length > 0) {
                  const { data: teamProducts } = await supabase.from("user_products").select("user_id").in("user_id", memberUserIds);
                  activeMembers = new Set((teamProducts || []).map((tp: any) => tp.user_id)).size;
                }
                teamInvestment = memberProfiles.reduce((s: number, m: any) => s + (m.deposit_balance || 0), 0);
              }
            }
            setUserAccess({
              vipLevel: profile.vip_level || 0,
              personalInvestment: profile.deposit_balance || 0,
              activeMembers,
              teamInvestment,
            });
          }
        }
      } catch (err) {
        console.error("Products load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const checkSeriesAccess = (s: Series): string[] => {
    if (!userAccess) return ["Connectez-vous pour acheter"];
    const missing: string[] = [];
    if ((s.min_vip_level || 0) > 0 && userAccess.vipLevel < (s.min_vip_level || 0)) {
      missing.push(`VIP ${s.min_vip_level} minimum requis (vous êtes VIP ${userAccess.vipLevel})`);
    }
    if ((s.min_personal_investment || 0) > 0 && userAccess.personalInvestment < (s.min_personal_investment || 0)) {
      missing.push(`Investissement personnel de ${Number(s.min_personal_investment).toLocaleString("fr-FR")} FCFA requis`);
    }
    if ((s.min_team_investment || 0) > 0 && userAccess.teamInvestment < (s.min_team_investment || 0)) {
      missing.push(`Investissement équipe de ${Number(s.min_team_investment).toLocaleString("fr-FR")} FCFA requis`);
    }
    if ((s.min_active_members || 0) > 0 && userAccess.activeMembers < (s.min_active_members || 0)) {
      missing.push(`${s.min_active_members} membres actifs requis (vous en avez ${userAccess.activeMembers})`);
    }
    return missing;
  };

  const handlePurchase = async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    setPurchasing(product.id);

    try {
      const { data: profile } = await supabase.from("profiles")
        .select("balance, deposit_balance, earnings_balance")
        .eq("user_id", user.id).single();
      if (!profile) { showError("Erreur", "Profil introuvable"); return; }

      const price = Number(product.price) || 0;
      const totalBalance = (profile.balance || 0);

      if (totalBalance < price) {
        showError("Solde insuffisant", `Votre solde (${totalBalance.toLocaleString("fr-FR")} FCFA) est insuffisant pour acheter ce produit (${price.toLocaleString("fr-FR")} FCFA). Veuillez recharger votre compte.`);
        return;
      }

      // Check if user already has an active (non-expired) instance of this product
      const { count: activeCount } = await supabase.from("user_products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString());

      // Rule: Cannot buy same product while a previous purchase is still active
      if ((activeCount || 0) > 0) {
        showError("Produit encore actif", `Vous possédez déjà ce produit et il est encore actif. Vous pourrez le racheter une fois qu'il sera expiré.`);
        return;
      }

      // Also check max_purchases lifetime limit (total purchases including expired)
      if (product.max_purchases) {
        const { count: totalCount } = await supabase.from("user_products")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("product_id", product.id);
        if ((totalCount || 0) >= product.max_purchases) {
          showError("Limite atteinte", `Vous avez atteint la limite maximale de ${product.max_purchases} achat(s) pour ce produit.`);
          return;
        }
      }

      const depositBal = profile.deposit_balance || 0;
      let newDeposit = depositBal;
      let newBalance = totalBalance;

      if (depositBal >= price) {
        newDeposit = depositBal - price;
      } else {
        newDeposit = 0;
      }
      newBalance = totalBalance - price;

      const cycles = product.cycles || 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cycles);

      const { error: insertError } = await supabase.from("user_products").insert({
        user_id: user.id,
        product_id: product.id,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        showError("Erreur", "Erreur lors de l'achat");
        return;
      }

      await supabase.from("profiles").update({
        balance: newBalance,
        deposit_balance: newDeposit,
      }).eq("user_id", user.id);

      // Grant 1 spin to buyer
      const { data: buyerProfile } = await supabase.from("profiles")
        .select("id, spins_balance, referred_by")
        .eq("user_id", user.id).single();
      if (buyerProfile) {
        await supabase.from("profiles").update({
          spins_balance: (buyerProfile.spins_balance || 0) + 1,
        }).eq("user_id", user.id);

        // Grant 1 spin to referrer if exists
        if (buyerProfile.referred_by) {
          const { data: referrerProfile } = await supabase.from("profiles")
            .select("user_id, spins_balance")
            .eq("id", buyerProfile.referred_by).single();
          if (referrerProfile) {
            await supabase.from("profiles").update({
              spins_balance: (referrerProfile.spins_balance || 0) + 1,
            }).eq("id", buyerProfile.referred_by);
          }
        }

        // Referral commissions are now handled automatically by database trigger
        // on user_products INSERT — no client-side RPC needed
      }

      setPurchasedName(product.name);
      setShowSuccess(true);
    } finally {
      setPurchasing(null);
    }
  };

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

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <ClipboardList size={40} className="text-muted-foreground/50" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">La liste des produits est vide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const productSeries = series.find(s => s.id === product.series_id);
              const seriesColor = productSeries?.color || "primary";
              const missingConditions = productSeries ? checkSeriesAccess(productSeries) : [];
              const isLocked = missingConditions.length > 0;

              return (
                <div key={product.id} className={`bg-card rounded-xl border border-secondary overflow-hidden ${isLocked ? "opacity-80" : ""}`}>
                  <div className="flex gap-3 p-3">
                    {product.image_url ? (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        {product.is_new && (
                          <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">nouveau</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/30 flex items-center justify-center">
                        <Package size={28} className="text-muted-foreground/30" />
                        {product.is_new && (
                          <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">nouveau</Badge>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <Badge variant="outline" className={`${colorBorderMap[seriesColor] || ""} text-[10px]`}>{product.name}</Badge>
                        <Badge className="bg-success text-success-foreground text-[10px]">{product.return_percent}%</Badge>
                        <Badge className="bg-primary/90 text-primary-foreground text-[9px]">Actuellement</Badge>
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
                        {product.max_purchases && (
                          <div className="col-span-2 mt-0.5">
                            <p className="text-[9px] text-muted-foreground">Limite d'achat</p>
                            <p className="text-xs font-bold text-warning">{product.max_purchases} achat{product.max_purchases > 1 ? "s" : ""} max</p>
                          </div>
                        )}
                      </div>
                      {isLocked && productSeries && (
                        <div className="mt-1.5 bg-destructive/10 rounded-lg px-2 py-1.5 space-y-0.5">
                          {missingConditions.map((c, i) => (
                            <p key={i} className="text-[9px] text-destructive flex items-start gap-1">
                              <Lock size={8} className="mt-0.5 flex-shrink-0" />
                              {c}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    {isLocked ? (
                      <Button
                        className="w-full h-8 text-xs font-semibold gap-1.5 bg-secondary text-muted-foreground hover:bg-secondary"
                        onClick={() => showError("Conditions non remplies", missingConditions.join("\n• "))}
                      >
                        <Lock size={14} />
                        Conditions requises
                      </Button>
                    ) : (
                      <Button
                        className="gradient-button w-full h-8 text-xs font-semibold gap-1.5"
                        disabled={purchasing === product.id}
                        onClick={() => setConfirmProduct(product)}
                      >
                        <ShoppingCart size={14} />
                        {purchasing === product.id ? "Achat..." : "Acheter"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={!!confirmProduct} onOpenChange={(open) => { if (!open) setConfirmProduct(null); }}>
        <AlertDialogContent className="bg-card border-secondary rounded-2xl max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center">Confirmer l'achat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {confirmProduct?.image_url && (
                  <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border border-secondary">
                    <img src={confirmProduct.image_url} alt={confirmProduct.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-foreground">{confirmProduct?.name}</p>
                  <p className="text-lg font-bold text-primary">{Number(confirmProduct?.price || 0).toLocaleString("fr-FR")} FCFA</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Revenu quotidien</p>
                    <p className="text-xs font-bold text-primary">{Number(confirmProduct?.daily_revenue || 0).toLocaleString("fr-FR")} F</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Cycles</p>
                    <p className="text-xs font-bold text-primary">{confirmProduct?.cycles}j</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rendement</p>
                    <p className="text-xs font-bold text-success">{confirmProduct?.return_percent}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total revenus</p>
                    <p className="text-xs font-bold text-primary">{Number(confirmProduct?.total_revenue || 0).toLocaleString("fr-FR")} F</p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:flex-row">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 gradient-button rounded-xl font-bold"
              onClick={async () => { if (confirmProduct) { await handlePurchase(confirmProduct); } setConfirmProduct(null); }}
            >
              Confirmer l'achat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PremiumModal
        triggerKey="purchase_success"
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        replacements={{ product: purchasedName }}
      />

      <BottomNav />
    </div>
  );
};

export default Products;
