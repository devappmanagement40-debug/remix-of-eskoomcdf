import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { getAuthToken } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ShoppingCart, Package, Lock, Ban } from "lucide-react";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PremiumModal from "@/components/PremiumModal";
import { useLanguage } from "@/contexts/LanguageContext";
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
  id: string; series_id: string | null; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  max_purchases: number | null; stock_status: string;
};

const colorMap: Record<string, string> = {
  primary: "bg-primary text-primary-foreground", success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground", destructive: "bg-destructive text-destructive-foreground",
  purple: "bg-purple-500 text-white", blue: "bg-blue-500 text-white",
};
const colorBorderMap: Record<string, string> = {
  primary: "border-primary text-primary", success: "border-success text-success",
  warning: "border-warning text-warning", destructive: "border-destructive text-destructive",
  purple: "border-purple-500 text-purple-400", blue: "border-blue-500 text-blue-400",
};

type UserAccessData = { vipLevel: number; personalInvestment: number; activeMembers: number; teamInvestment: number };

const Products = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        const [seriesRes, productsRes] = await Promise.all([
          fetch("/api/product-series").then(r => r.ok ? r.json() : []),
          fetch("/api/products?active=true").then(r => r.ok ? r.json() : []),
        ]);
        if (Array.isArray(seriesRes)) setSeries(seriesRes.map((s: any) => ({
          id: s.id, name: s.name, color: s.color, sort_order: s.sortOrder ?? s.sort_order,
          min_vip_level: s.minVipLevel ?? s.min_vip_level,
          min_personal_investment: s.minPersonalInvestment ?? s.min_personal_investment,
          min_team_investment: s.minTeamInvestment ?? s.min_team_investment,
          min_active_members: s.minActiveMembers ?? s.min_active_members,
        })));
        if (Array.isArray(productsRes)) setProducts(productsRes.map((p: any) => ({
          id: p.id, series_id: p.seriesId ?? p.series_id, name: p.name,
          image_url: p.imageUrl ?? p.image_url, return_percent: p.returnPercent ?? p.return_percent,
          total_revenue: p.totalRevenue ?? p.total_revenue, daily_revenue: p.dailyRevenue ?? p.daily_revenue,
          cycles: p.cycles, price: p.price, is_new: p.isNew ?? p.is_new,
          is_active: p.isActive ?? p.is_active, max_purchases: p.maxPurchases ?? p.max_purchases,
          stock_status: p.stockStatus ?? p.stock_status ?? "available",
        })));

        const token = getAuthToken();
        if (token) {
          const [profileRes, teamRes] = await Promise.all([
            fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
            fetch("/api/profiles/team/direct", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
          ]);
          if (profileRes) {
            const team = Array.isArray(teamRes) ? teamRes : [];
            const teamInvestment = team.reduce((s: number, m: any) => s + Number(m.depositBalance ?? m.deposit_balance ?? 0), 0);
            const teamUserIds = team.map((m: any) => m.userId ?? m.user_id);
            let activeMembers = 0;
            if (teamUserIds.length > 0) {
              const teamProdsRes = await fetch(`/api/products/user-products/active-by-users?userIds=${teamUserIds.join(",")}`, { headers: { Authorization: `Bearer ${token}` } });
              if (teamProdsRes.ok) {
                const teamProds = await teamProdsRes.json();
                activeMembers = new Set((Array.isArray(teamProds) ? teamProds : []).map((tp: any) => tp.userId ?? tp.user_id)).size;
              }
            }
            setUserAccess({
              vipLevel: profileRes.vipLevel ?? profileRes.vip_level ?? 0,
              personalInvestment: profileRes.depositBalance ?? profileRes.deposit_balance ?? 0,
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
    if (!userAccess) return [t.products.signInToPurchase];
    const missing: string[] = [];
    if ((s.min_vip_level || 0) > 0 && userAccess.vipLevel < (s.min_vip_level || 0)) missing.push(`VIP ${s.min_vip_level} required (you are VIP ${userAccess.vipLevel})`);
    if ((s.min_personal_investment || 0) > 0 && userAccess.personalInvestment < (s.min_personal_investment || 0)) missing.push(`Personal investment of ${Number(s.min_personal_investment).toLocaleString("en-US")} USDT required`);
    if ((s.min_team_investment || 0) > 0 && userAccess.teamInvestment < (s.min_team_investment || 0)) missing.push(`Team investment of ${Number(s.min_team_investment).toLocaleString("en-US")} USDT required`);
    if ((s.min_active_members || 0) > 0 && userAccess.activeMembers < (s.min_active_members || 0)) missing.push(`${s.min_active_members} active members required (you have ${userAccess.activeMembers})`);
    return missing;
  };

  const handlePurchase = async (product: Product) => {
    const token = getAuthToken();
    if (!token) { navigate("/connexion"); return; }
    setPurchasing(product.id);
    try {
      const res = await fetch("/api/products/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) { showError("Error", data.error || "Purchase failed"); return; }
      setPurchasedName(product.name);
      setShowSuccess(true);
    } finally {
      setPurchasing(null);
    }
  };

  const filtered = activeSeries === "all" ? products : products.filter(p => p.series_id === activeSeries);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={t.products.title} />
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button onClick={() => setActiveSeries("all")} className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeSeries === "all" ? "gradient-button text-primary-foreground" : "bg-transparent border border-primary text-primary"}`}>
            {t.products.all}
          </button>
          {series.map(s => {
            const isActive = activeSeries === s.id;
            const color = s.color || "primary";
            return (
              <button key={s.id} onClick={() => setActiveSeries(s.id)} className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${isActive ? colorMap[color] || colorMap.primary : `bg-transparent border ${colorBorderMap[color] || colorBorderMap.primary}`}`}>
                {s.name}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">{t.common.loading}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6"><ClipboardList size={40} className="text-muted-foreground/50" /></div>
            <p className="text-sm text-muted-foreground">{t.products.noProducts}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const productSeries = product.series_id ? series.find(s => s.id === product.series_id) : null;
              const seriesColor = productSeries?.color || "primary";
              const missingConditions = productSeries ? checkSeriesAccess(productSeries) : [];
              const isLocked = missingConditions.length > 0;
              const isSoldOut = product.stock_status === "sold_out";
              const isTerminated = product.stock_status === "terminated";
              const isUnavailable = isSoldOut || isTerminated;

              return (
                <div key={product.id} className={`bg-card rounded-xl border border-secondary overflow-hidden ${isLocked || isUnavailable ? "opacity-80" : ""}`}>
                  <div className="flex gap-3 p-3">
                    {product.image_url ? (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        {product.is_new && !isUnavailable && <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">{t.products.new}</Badge>}
                        {isSoldOut && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge className="bg-warning text-warning-foreground text-[10px] px-2 py-1 font-bold">{t.products.soldOut}</Badge></div>}
                        {isTerminated && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-1 font-bold">{t.products.ended}</Badge></div>}
                      </div>
                    ) : (
                      <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/30 flex items-center justify-center">
                        <Package size={28} className="text-muted-foreground/30" />
                        {isSoldOut && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge className="bg-warning text-warning-foreground text-[10px] px-2 py-1 font-bold">{t.products.soldOut}</Badge></div>}
                        {isTerminated && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-1 font-bold">{t.products.ended}</Badge></div>}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <Badge variant="outline" className={`${colorBorderMap[seriesColor] || ""} text-[10px]`}>{product.name}</Badge>
                        <Badge className="bg-success text-success-foreground text-[10px]">{product.return_percent != null ? product.return_percent : '—'}%</Badge>
                        <Badge className="bg-primary/90 text-primary-foreground text-[9px]">{t.products.live}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                        <div><p className="text-[9px] text-muted-foreground">{t.products.totalRevenue}</p><p className="text-xs font-bold text-primary">{product.total_revenue != null ? Number(product.total_revenue).toLocaleString("en-US") : '—'} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p></div>
                        <div><p className="text-[9px] text-muted-foreground">{t.products.dailyRevenue}</p><p className="text-xs font-bold text-primary">{product.daily_revenue != null ? Number(product.daily_revenue).toLocaleString("en-US") : '—'} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p></div>
                        <div><p className="text-[9px] text-muted-foreground">{t.products.cycles}</p><p className="text-xs font-bold text-primary">{product.cycles}{t.products.days}</p></div>
                        <div><p className="text-[9px] text-muted-foreground">{t.products.price}</p><p className="text-xs font-bold text-primary">{Number(product.price).toLocaleString("en-US")} <span className="text-[9px] font-normal text-muted-foreground">USDT</span></p></div>
                        {product.max_purchases && (
                          <div className="col-span-2 mt-0.5"><p className="text-[9px] text-muted-foreground">{t.products.purchaseLimit}</p><p className="text-xs font-bold text-warning">{t.products.max} {product.max_purchases}</p></div>
                        )}
                      </div>
                      {isLocked && productSeries && (
                        <div className="mt-1.5 bg-destructive/10 rounded-lg px-2 py-1.5 space-y-0.5">
                          {missingConditions.map((c, i) => (
                            <p key={i} className="text-[9px] text-destructive flex items-start gap-1"><Lock size={8} className="mt-0.5 flex-shrink-0" />{c}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    {isUnavailable ? (
                      <Button className="w-full h-8 text-xs font-semibold gap-1.5 bg-secondary text-muted-foreground hover:bg-secondary cursor-not-allowed" disabled>
                        <Ban size={14} />{isSoldOut ? t.products.outOfStock : t.products.productEnded}
                      </Button>
                    ) : isLocked ? (
                      <Button className="w-full h-8 text-xs font-semibold gap-1.5 bg-secondary text-muted-foreground hover:bg-secondary" onClick={() => showError(t.products.requirements, missingConditions.join("\n• "))}>
                        <Lock size={14} />{t.products.requirements}
                      </Button>
                    ) : (
                      <Button className="gradient-button w-full h-8 text-xs font-semibold gap-1.5" disabled={purchasing === product.id} onClick={() => setConfirmProduct(product)}>
                        <ShoppingCart size={14} />{purchasing === product.id ? t.products.buying : t.products.buy}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmProduct} onOpenChange={(open) => { if (!open) setConfirmProduct(null); }}>
        <AlertDialogContent className="bg-card border-secondary rounded-2xl max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-center">{t.products.confirmPurchase}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {confirmProduct?.image_url && <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border border-secondary"><img src={confirmProduct.image_url} alt={confirmProduct.name} className="w-full h-full object-cover" /></div>}
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-foreground">{confirmProduct?.name}</p>
                  <p className="text-lg font-bold text-primary">{Number(confirmProduct?.price || 0).toLocaleString("en-US")} USDT</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 grid grid-cols-2 gap-2 text-center">
                  <div><p className="text-[10px] text-muted-foreground">{t.products.dailyRevenue}</p><p className="text-xs font-bold text-primary">{Number(confirmProduct?.daily_revenue || 0).toLocaleString("en-US")} U</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{t.products.cycles}</p><p className="text-xs font-bold text-primary">{confirmProduct?.cycles}{t.products.days}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{t.products.yieldLabel}</p><p className="text-xs font-bold text-success">{confirmProduct?.return_percent != null ? confirmProduct.return_percent : '—'}%</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{t.products.totalRevenue}</p><p className="text-xs font-bold text-primary">{Number(confirmProduct?.total_revenue || 0).toLocaleString("en-US")} U</p></div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:flex-row">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="flex-1 gradient-button rounded-xl font-bold" onClick={async () => { if (confirmProduct) { await handlePurchase(confirmProduct); } setConfirmProduct(null); }}>
              {t.products.confirmPurchase}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PremiumModal triggerKey="purchase_success" open={showSuccess} onClose={() => setShowSuccess(false)} replacements={{ product: purchasedName }} />
      <BottomNav />
    </div>
  );
};

export default Products;
