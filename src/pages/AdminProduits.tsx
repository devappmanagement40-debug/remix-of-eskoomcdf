import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Plus, Edit2, Trash2, Package, Layers, ChevronDown, ChevronUp, X } from "lucide-react";

type Series = { id: string; name: string; color: string | null; sort_order: number | null; created_at: string | null };
type Product = {
  id: string; series_id: string; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  sort_order: number | null;
};

const colorOptions = [
  { value: "primary", label: "Turquoise", css: "bg-primary" },
  { value: "success", label: "Vert", css: "bg-success" },
  { value: "warning", label: "Jaune", css: "bg-warning" },
  { value: "destructive", label: "Rouge", css: "bg-destructive" },
  { value: "purple", label: "Violet", css: "bg-purple-500" },
  { value: "blue", label: "Bleu", css: "bg-blue-500" },
];

const AdminProduits = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

  // Series form
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesName, setSeriesName] = useState("");
  const [seriesColor, setSeriesColor] = useState("primary");

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSeriesId, setProductSeriesId] = useState("");
  const [productName, setProductName] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productReturnPercent, setProductReturnPercent] = useState("");
  const [productTotalRevenue, setProductTotalRevenue] = useState("");
  const [productDailyRevenue, setProductDailyRevenue] = useState("");
  const [productCycles, setProductCycles] = useState("365");
  const [productPrice, setProductPrice] = useState("");
  const [productIsNew, setProductIsNew] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) { toast.error("Accès refusé"); navigate("/"); return; }
    loadAll();
  };

  const loadAll = async () => {
    const [s, p] = await Promise.all([
      supabase.from("product_series").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    if (s.data) setSeries(s.data);
    if (p.data) setProducts(p.data);
    setLoading(false);
  };

  // === SERIES CRUD ===
  const openSeriesForm = (s?: Series) => {
    if (s) { setEditingSeries(s); setSeriesName(s.name); setSeriesColor(s.color || "primary"); }
    else { setEditingSeries(null); setSeriesName(""); setSeriesColor("primary"); }
    setShowSeriesForm(true);
    setShowProductForm(false);
  };

  const saveSeries = async () => {
    if (!seriesName.trim()) { toast.error("Nom requis"); return; }
    if (editingSeries) {
      await supabase.from("product_series").update({ name: seriesName, color: seriesColor }).eq("id", editingSeries.id);
      toast.success("Série modifiée ✅");
    } else {
      await supabase.from("product_series").insert({ name: seriesName, color: seriesColor, sort_order: series.length });
      toast.success("Série créée ✅");
    }
    setShowSeriesForm(false);
    loadAll();
  };

  const deleteSeries = async (id: string) => {
    await supabase.from("product_series").delete().eq("id", id);
    toast.success("Série supprimée");
    loadAll();
  };

  // === PRODUCT CRUD ===
  const openProductForm = (seriesId: string, p?: Product) => {
    setProductSeriesId(seriesId);
    if (p) {
      setEditingProduct(p);
      setProductName(p.name);
      setProductImageUrl(p.image_url || "");
      setProductReturnPercent(String(p.return_percent || 0));
      setProductTotalRevenue(String(p.total_revenue || 0));
      setProductDailyRevenue(String(p.daily_revenue || 0));
      setProductCycles(String(p.cycles || 365));
      setProductPrice(String(p.price || 0));
      setProductIsNew(p.is_new || false);
    } else {
      setEditingProduct(null);
      setProductName(""); setProductImageUrl(""); setProductReturnPercent(""); setProductTotalRevenue("");
      setProductDailyRevenue(""); setProductCycles("365"); setProductPrice(""); setProductIsNew(false);
    }
    setShowProductForm(true);
    setShowSeriesForm(false);
  };

  const saveProduct = async () => {
    if (!productName.trim()) { toast.error("Nom requis"); return; }
    const payload = {
      series_id: productSeriesId,
      name: productName,
      image_url: productImageUrl || null,
      return_percent: Number(productReturnPercent) || 0,
      total_revenue: Number(productTotalRevenue) || 0,
      daily_revenue: Number(productDailyRevenue) || 0,
      cycles: Number(productCycles) || 365,
      price: Number(productPrice) || 0,
      is_new: productIsNew,
    };
    if (editingProduct) {
      await supabase.from("products").update(payload).eq("id", editingProduct.id);
      toast.success("Produit modifié ✅");
    } else {
      const seriesProducts = products.filter(p => p.series_id === productSeriesId);
      await supabase.from("products").insert({ ...payload, sort_order: seriesProducts.length });
      toast.success("Produit créé ✅");
    }
    setShowProductForm(false);
    loadAll();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produit supprimé");
    loadAll();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    loadAll();
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin - Produits" showBack />

      <div className="px-4 pt-4">
        {/* Add series button */}
        <button onClick={() => openSeriesForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4">
          <Layers size={16} /> Ajouter une série
        </button>

        {/* Series form modal */}
        {showSeriesForm && (
          <div className="bg-card rounded-xl border border-secondary p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">{editingSeries ? "Modifier la série" : "Nouvelle série"}</h3>
              <button onClick={() => setShowSeriesForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="Nom de la série"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map(c => (
                  <button key={c.value} onClick={() => setSeriesColor(c.value)}
                    className={`w-8 h-8 rounded-full ${c.css} border-2 ${seriesColor === c.value ? "border-foreground scale-110" : "border-transparent"} transition-transform`}
                    title={c.label} />
                ))}
              </div>
            </div>
            <button onClick={saveSeries} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">
              {editingSeries ? "Modifier" : "Créer"}
            </button>
          </div>
        )}

        {/* Product form modal */}
        {showProductForm && (
          <div className="bg-card rounded-xl border border-secondary p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">{editingProduct ? "Modifier le produit" : "Nouveau produit"}</h3>
              <button onClick={() => setShowProductForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nom du produit"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
            <input value={productImageUrl} onChange={e => setProductImageUrl(e.target.value)} placeholder="URL de l'image (optionnel)"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Prix (FCFA)</label>
                <input type="number" value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="5000"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Retour (%)</label>
                <input type="number" value={productReturnPercent} onChange={e => setProductReturnPercent(e.target.value)} placeholder="1560"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Revenu total</label>
                <input type="number" value={productTotalRevenue} onChange={e => setProductTotalRevenue(e.target.value)} placeholder="78000"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Revenu quotidien</label>
                <input type="number" value={productDailyRevenue} onChange={e => setProductDailyRevenue(e.target.value)} placeholder="200"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cycles (jours)</label>
                <input type="number" value={productCycles} onChange={e => setProductCycles(e.target.value)} placeholder="365"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={productIsNew} onChange={e => setProductIsNew(e.target.checked)}
                    className="w-4 h-4 accent-primary" />
                  <span className="text-xs text-foreground">Nouveau</span>
                </label>
              </div>
            </div>
            <button onClick={saveProduct} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">
              {editingProduct ? "Modifier" : "Créer"}
            </button>
          </div>
        )}

        {/* Series list with products */}
        {series.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune série créée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {series.map(s => {
              const seriesProducts = products.filter(p => p.series_id === s.id);
              const isExpanded = expandedSeries === s.id;
              const colorClass = colorOptions.find(c => c.value === s.color)?.css || "bg-primary";

              return (
                <div key={s.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  {/* Series header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => setExpandedSeries(isExpanded ? null : s.id)} className="flex items-center gap-3 flex-1">
                      <div className={`w-4 h-4 rounded-full ${colorClass}`} />
                      <span className="text-sm font-bold text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">({seriesProducts.length})</span>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => openSeriesForm(s)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Edit2 size={12} className="text-primary" />
                      </button>
                      <button onClick={() => deleteSeries(s.id)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Trash2 size={12} className="text-destructive" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded products */}
                  {isExpanded && (
                    <div className="border-t border-secondary">
                      <div className="px-4 py-3 space-y-2">
                        {seriesProducts.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">Aucun produit</p>
                        ) : seriesProducts.map(p => (
                          <div key={p.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${p.is_active ? "bg-secondary/50" : "bg-secondary/20 opacity-60"}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                                {p.is_new && <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} FCFA • {p.return_percent}% • {p.cycles}j</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => toggleActive(p)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${p.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                                {p.is_active ? "ON" : "OFF"}
                              </button>
                              <button onClick={() => openProductForm(s.id, p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                                <Edit2 size={10} className="text-primary" />
                              </button>
                              <button onClick={() => deleteProduct(p.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                                <Trash2 size={10} className="text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pb-3">
                        <button onClick={() => openProductForm(s.id)} className="w-full bg-secondary text-foreground font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
                          <Plus size={14} /> Ajouter un produit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProduits;
