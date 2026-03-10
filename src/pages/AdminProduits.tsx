import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Plus, Edit2, Trash2, Package, Layers, ChevronDown, ChevronUp, X, Upload, ImageIcon } from "lucide-react";

type Series = { id: string; name: string; color: string | null; sort_order: number | null; created_at: string | null };
type Product = {
  id: string; series_id: string; name: string; image_url: string | null;
  return_percent: number | null; total_revenue: number | null; daily_revenue: number | null;
  cycles: number | null; price: number | null; is_new: boolean | null; is_active: boolean | null;
  sort_order: number | null; max_purchases: number | null; is_featured: boolean | null;
  gain_type: string;
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
  const { showSuccess, showError } = useActionPopup();
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesName, setSeriesName] = useState("");
  const [seriesColor, setSeriesColor] = useState("primary");

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
  const [productIsFeatured, setProductIsFeatured] = useState(false);
  const [productGainType, setProductGainType] = useState<"daily" | "blocked">("daily");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!data) { showError("Accès refusé", "Vous n'avez pas les droits d'administrateur"); navigate("/"); return; }
      await loadAll();
    } catch (err) {
      console.error("Admin check error:", err);
      showError("Erreur", "Impossible de vérifier les droits d'accès");
      setLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      const [s, p] = await Promise.all([
        supabase.from("product_series").select("*").order("sort_order"),
        supabase.from("products").select("*").order("sort_order"),
      ]);
      if (s.data) setSeries(s.data);
      if (p.data) setProducts(p.data);
    } catch (err) {
      console.error("Load error:", err);
      showError("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const openSeriesForm = (s?: Series) => {
    if (s) { setEditingSeries(s); setSeriesName(s.name); setSeriesColor(s.color || "primary"); }
    else { setEditingSeries(null); setSeriesName(""); setSeriesColor("primary"); }
    setShowSeriesForm(true);
    setShowProductForm(false);
  };

  const saveSeries = async () => {
    if (!seriesName.trim()) { showError("Erreur", "Nom requis"); return; }
    if (editingSeries) {
      await supabase.from("product_series").update({ name: seriesName, color: seriesColor }).eq("id", editingSeries.id);
      showSuccess("Série modifiée", "La série a été mise à jour avec succès ✅");
    } else {
      await supabase.from("product_series").insert({ name: seriesName, color: seriesColor, sort_order: series.length });
      showSuccess("Série créée", "La nouvelle série a été créée avec succès ✅");
    }
    setShowSeriesForm(false);
    loadAll();
  };

  const deleteSeries = async (id: string) => {
    // Check if any products in this series have active user purchases
    const seriesProductIds = products.filter(p => p.series_id === id).map(p => p.id);
    if (seriesProductIds.length > 0) {
      const { count } = await supabase.from("user_products")
        .select("*", { count: "exact", head: true })
        .in("product_id", seriesProductIds)
        .eq("is_active", true);
      if ((count || 0) > 0) {
        showError("Impossible", "Des utilisateurs possèdent encore des produits actifs dans cette série. Désactivez les produits au lieu de les supprimer.");
        return;
      }
    }
    // Check if any products exist in this series at all (with past purchases)
    if (seriesProductIds.length > 0) {
      const { count: totalPurchases } = await supabase.from("user_products")
        .select("*", { count: "exact", head: true })
        .in("product_id", seriesProductIds);
      if ((totalPurchases || 0) > 0) {
        // Soft delete: deactivate all products instead of deleting
        for (const pid of seriesProductIds) {
          await supabase.from("products").update({ is_active: false }).eq("id", pid);
        }
        showSuccess("Série désactivée", "Les produits ont été désactivés car des utilisateurs les ont déjà achetés. Leurs revenus continuent normalement.");
        loadAll();
        return;
      }
    }
    // No purchases ever — safe to hard delete
    await supabase.from("products").delete().in("id", seriesProductIds);
    await supabase.from("product_series").delete().eq("id", id);
    showSuccess("Supprimé", "La série a été supprimée");
    loadAll();
  };

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
      setProductIsFeatured(p.is_featured || false);
      setProductGainType((p.gain_type as "daily" | "blocked") || "daily");
    } else {
      setEditingProduct(null);
      setProductName(""); setProductImageUrl(""); setProductReturnPercent(""); setProductTotalRevenue("");
      setProductDailyRevenue(""); setProductCycles("365"); setProductPrice(""); setProductIsNew(false); setProductIsFeatured(false);
      setProductGainType("daily");
    }
    setShowProductForm(true);
    setShowSeriesForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      if (file.size > 5 * 1024 * 1024) {
        showError("Erreur", "L'image ne doit pas dépasser 5 Mo");
        return;
      }
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (error) {
        console.error("Upload error:", error);
        showError("Erreur", "Impossible d'uploader l'image: " + (error.message || "erreur inconnue"));
        return;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setProductImageUrl(urlData.publicUrl);
      showSuccess("Image uploadée", "L'image a été ajoutée avec succès ✅");
    } catch (err) {
      console.error("Upload crash:", err);
      showError("Erreur", "Une erreur inattendue s'est produite lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveProduct = async () => {
    if (!productName.trim()) { showError("Erreur", "Nom requis"); return; }
    try {
      const payload = {
        series_id: productSeriesId,
        name: productName,
        image_url: productImageUrl || null,
        return_percent: Number(productReturnPercent) || 0,
        total_revenue: Number(productTotalRevenue) || 0,
        daily_revenue: productGainType === "blocked" ? 0 : (Number(productDailyRevenue) || 0),
        cycles: Number(productCycles) || 365,
        price: Number(productPrice) || 0,
        is_new: productIsNew,
        is_featured: productIsFeatured,
        gain_type: productGainType,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        showSuccess("Produit modifié", "Le produit a été mis à jour avec succès ✅");
      } else {
        const seriesProducts = products.filter(p => p.series_id === productSeriesId);
        const { error } = await supabase.from("products").insert({ ...payload, sort_order: seriesProducts.length });
        if (error) throw error;
        showSuccess("Produit créé", "Le nouveau produit a été créé avec succès ✅");
      }
      setShowProductForm(false);
      loadAll();
    } catch (err) {
      console.error("Save product error:", err);
      showError("Erreur", "Impossible de sauvegarder le produit");
    }
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    showSuccess("Supprimé", "Le produit a été supprimé");
    loadAll();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    showSuccess("Mis à jour", p.is_active ? "Produit désactivé" : "Produit activé ✅");
    loadAll();
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-foreground font-medium">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin - Produits" showBack />

      <div className="px-4 pt-4">
        <button onClick={() => openSeriesForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4">
          <Layers size={16} /> Ajouter une série
        </button>

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

        {showProductForm && (
          <div className="bg-card rounded-xl border border-secondary p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">{editingProduct ? "Modifier le produit" : "Nouveau produit"}</h3>
              <button onClick={() => setShowProductForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nom du produit"
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none" />
            
            {/* Image upload */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Image du produit</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {productImageUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-secondary">
                  <img src={productImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setProductImageUrl("")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                    <X size={12} className="text-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-secondary hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <span className="text-xs text-muted-foreground">Upload en cours...</span>
                  ) : (
                    <>
                      <Upload size={20} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Cliquez pour ajouter une image</span>
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Gain type selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Type de gain</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProductGainType("daily")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                    productGainType === "daily"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-secondary bg-secondary text-muted-foreground"
                  }`}
                >
                  Gain quotidien
                </button>
                <button
                  type="button"
                  onClick={() => setProductGainType("blocked")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                    productGainType === "blocked"
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-secondary bg-secondary text-muted-foreground"
                  }`}
                >
                  Gain bloqué
                </button>
              </div>
              {productGainType === "blocked" && (
                <p className="text-[10px] text-warning mt-1">⏳ Les gains seront bloqués jusqu'à la fin du cycle</p>
              )}
            </div>

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
                <label className="text-xs text-muted-foreground">{productGainType === "blocked" ? "Gain total prévu" : "Revenu total"}</label>
                <input type="number" value={productTotalRevenue} onChange={e => setProductTotalRevenue(e.target.value)} placeholder="78000"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
              </div>
              {productGainType === "daily" && (
                <div>
                  <label className="text-xs text-muted-foreground">Revenu quotidien</label>
                  <input type="number" value={productDailyRevenue} onChange={e => setProductDailyRevenue(e.target.value)} placeholder="200"
                    className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Durée du cycle (jours)</label>
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
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={productIsFeatured} onChange={e => setProductIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-primary" />
                  <span className="text-xs text-foreground">Populaire</span>
                </label>
              </div>
            </div>
            <button onClick={saveProduct} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">
              {editingProduct ? "Modifier" : "Créer"}
            </button>
          </div>
        )}

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
                                {p.is_featured && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">POP</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} FCFA • {p.return_percent}% • {p.cycles}j {p.gain_type === "blocked" ? "• 🔒" : ""}</span>
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
