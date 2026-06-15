import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Plus, X, Save, Edit2, Trash2, CheckCircle2, XCircle, Clock,
  ImageIcon, UploadIcon, Pencil
} from "lucide-react";

type WheelPrize = {
  id: string; label: string; value: number; prize_type: string;
  vip_level: number | null; probability: number; is_active: boolean; is_winnable: boolean; sort_order: number;
};

type WheelSpin = {
  id: string; user_id: string; prize_label: string; prize_value: number;
  prize_type: string; vip_level: number | null; status: string; created_at: string;
};

type SiteSetting = { id: string; key: string; value: string | null; category: string };

type Props = {
  settings: SiteSetting[];
  reload: () => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  logAction: (action: string, target_type?: string, target_id?: string, details?: string) => void;
  adminId: string;
};

const AdminWheelTab = ({ settings, reload, showSuccess, showError, logAction, adminId }: Props) => {
  const [subTab, setSubTab] = useState<"prizes" | "winners" | "settings" | "vip_spins" | "images">("prizes");
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [spins, setSpins] = useState<WheelSpin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [prizes, spins] = await Promise.all([
      api.get("/admin/wheel-prizes").catch(() => []),
      api.get("/admin/wheel-spins").catch(() => []),
    ]);
    setPrizes((prizes || []) as WheelPrize[]);
    setSpins((spins || []) as WheelSpin[]);
    setLoading(false);
  };

  const wheelSettings = settings.filter(s => s.category === "wheel");
  const financeSettings = settings.filter(s => s.category === "finance");

  const subTabs = [
    { key: "prizes", label: "🎯 Gains" },
    { key: "winners", label: "🏆 Gagnants" },
    { key: "settings", label: "📝 Textes" },
    { key: "vip_spins", label: "👑 VIP" },
    { key: "images", label: "🖼 Images" },
  ];

  if (loading) return <p className="text-xs text-muted-foreground text-center py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === t.key ? "gradient-button text-primary-foreground" : "bg-card border border-secondary text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "prizes" && <PrizesSection prizes={prizes} reload={() => { loadData(); reload(); }} showSuccess={showSuccess} showError={showError} />}
      {subTab === "winners" && <WinnersSection spins={spins} reload={() => { loadData(); reload(); }} />}
      {subTab === "settings" && <SettingsSection settings={wheelSettings} financeSettings={financeSettings} reload={reload} showSuccess={showSuccess} />}
      {subTab === "vip_spins" && <VipSpinsSection spins={spins} reload={() => { loadData(); reload(); }} showSuccess={showSuccess} showError={showError} logAction={logAction} adminId={adminId} />}
      {subTab === "images" && <ImagesSection settings={wheelSettings} reload={reload} showSuccess={showSuccess} showError={showError} />}
    </div>
  );
};

// ========== PRIZES MANAGEMENT ==========
const PrizesSection = ({ prizes, reload, showSuccess, showError }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WheelPrize | null>(null);
  const [form, setForm] = useState({ label: "", value: "0", prize_type: "cash", vip_level: "", probability: "10" });

  const openForm = (p?: WheelPrize) => {
    if (p) {
      setEditing(p);
      setForm({ label: p.label, value: String(p.value), prize_type: p.prize_type, vip_level: String(p.vip_level || ""), probability: String(p.probability) });
    } else {
      setEditing(null);
      setForm({ label: "", value: "0", prize_type: "cash", vip_level: "", probability: "10" });
    }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.label.trim()) { showError("Error", "Label required"); return; }
    const payload = {
      label: form.label,
      value: Number(form.value) || 0,
      prize_type: form.prize_type,
      vip_level: form.prize_type === "vip" ? (Number(form.vip_level) || 1) : null,
      probability: Number(form.probability) || 10,
    };
    if (editing) await api.patch(`/admin/wheel-prizes/${editing.id}`, payload).catch(() => {});
    else await api.post("/admin/wheel-prizes", { ...payload, sortOrder: prizes.length }).catch(() => {});
    showSuccess(editing ? "Gain modifié ✅" : "Gain ajouté ✅", "");
    setShowForm(false); reload();
  };

  const totalProb = prizes.filter((p: WheelPrize) => p.is_active).reduce((s: number, p: WheelPrize) => s + p.probability, 0);

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs text-muted-foreground">Probabilité totale (actifs) : <span className="font-bold text-primary">{totalProb}%</span> — Recommandé : 100%</p>
      </div>

      <button onClick={() => openForm()} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
        <Plus size={16} /> Ajouter un gain
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex justify-between"><h3 className="text-sm font-bold text-foreground">{editing ? "Edit" : "New prize"}</h3><button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Label (ex: 50, 3K, VIP1)" className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select value={form.prize_type} onChange={e => setForm({ ...form, prize_type: e.target.value })}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none">
                <option value="cash">Cash (USDT)</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            {form.prize_type === "cash" ? (
              <div>
                <label className="text-xs text-muted-foreground">Montant (USDT)</label>
                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground">Niveau VIP</label>
                <input type="number" value={form.vip_level} onChange={e => setForm({ ...form, vip_level: e.target.value })} placeholder="1"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Probabilité (%)</label>
            <input type="number" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none" />
          </div>
          <button onClick={save} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm">{editing ? "Update" : "Create"}</button>
        </div>
      )}

      {prizes.map((p: WheelPrize) => (
        <div key={p.id} className={`bg-card rounded-xl border border-secondary px-4 py-3 ${!p.is_active ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{p.label}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${p.prize_type === "vip" ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"}`}>
                  {p.prize_type === "vip" ? `VIP${p.vip_level}` : `${Number(p.value).toLocaleString()} USDT`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Probabilité : {p.probability}%</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={async () => { await api.patch(`/admin/wheel-prizes/${p.id}`, { isActive: !p.is_active }).catch(() => {}); reload(); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${p.is_active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>{p.is_active ? "ON" : "OFF"}</button>
              <button onClick={async () => { await api.patch(`/admin/wheel-prizes/${p.id}`, { isWinnable: !(p as any).is_winnable }).catch(() => {}); reload(); }}
                className={`h-7 px-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold ${(p as any).is_winnable !== false ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>{(p as any).is_winnable !== false ? "WIN" : "NO WIN"}</button>
              <button onClick={() => openForm(p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Edit2 size={10} className="text-primary" /></button>
              <button onClick={async () => { await api.delete(`/admin/wheel-prizes/${p.id}`).catch(() => {}); showSuccess("Supprimé", ""); reload(); }}
                className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><Trash2 size={10} className="text-destructive" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ========== WINNERS LIST ==========
const WinnersSection = ({ spins, reload }: { spins: WheelSpin[]; reload: () => void }) => {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    const userIds: string[] = [...new Set(spins.map(s => s.user_id))] as string[];
    if (userIds.length === 0) return;
    api.get(`/admin/profiles-by-ids?ids=${userIds.join(",")}`).then((data: any) => {
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }).catch(() => {});
  }, [spins]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise<void>((resolve) => {
        reload();
        // Give time for parent state to propagate
        setTimeout(resolve, 500);
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer TOUS les gagnants ? Cette action est irréversible.")) return;
    setResetting(true);
    try {
      await api.delete("/admin/wheel-spins/all").catch(() => {});
      reload();
    } finally {
      setResetting(false);
    }
  };

  const completedSpins = spins.filter(s => s.status === "completed" || s.status === "vip_approved");

  const totalCash = completedSpins.filter(s => s.prize_type === "cash").reduce((sum, s) => sum + s.prize_value, 0);
  const totalVip = completedSpins.filter(s => s.prize_type === "vip").length;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-secondary p-3 text-center">
          <p className="text-xl font-bold text-primary">{completedSpins.length}</p>
          <p className="text-[10px] text-muted-foreground">Total gains</p>
        </div>
        <div className="bg-card rounded-xl border border-secondary p-3 text-center">
          <p className="text-xl font-bold text-success">{totalCash.toLocaleString("en-US")}</p>
          <p className="text-[10px] text-muted-foreground">Cash (USDT)</p>
        </div>
        <div className="bg-card rounded-xl border border-secondary p-3 text-center">
          <p className="text-xl font-bold text-warning">{totalVip}</p>
          <p className="text-[10px] text-muted-foreground">VIP gagnés</p>
        </div>
      </div>

      {/* Refresh button */}
      <button onClick={handleRefresh} disabled={refreshing}
        className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        {refreshing ? (
          <><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Actualisation...</>
        ) : (
          <>🔄 Actualiser les gagnants</>
        )}
      </button>

      {/* Reset button */}
      <button onClick={handleReset} disabled={resetting}
        className="w-full bg-destructive/10 border border-destructive/30 text-destructive font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        {resetting ? (
          <><span className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" /> Suppression...</>
        ) : (
          <>🗑 Réinitialiser tous les gagnants</>
        )}
      </button>

      {/* Winners list */}
      {completedSpins.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No winners yet</p>
      ) : (
        completedSpins.map(s => {
          const p = profiles[s.user_id];
          return (
            <div key={s.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{p?.full_name || "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground">{p?.phone || s.user_id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${s.prize_type === "vip" ? "text-warning" : "text-primary"}`}>
                    {s.prize_type === "vip" ? `VIP${s.vip_level}` : `${Number(s.prize_value).toLocaleString("en-US")} USDT`}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" })}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ========== SETTINGS/TEXTS ==========
const SettingsSection = ({ settings, financeSettings, reload, showSuccess }: any) => {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const getValue = (key: string) => {
    if (edits[key] !== undefined) return edits[key];
    const all = [...settings, ...financeSettings];
    return all.find((s: SiteSetting) => s.key === key)?.value ?? "";
  };
  const setVal = (key: string, val: string) => setEdits({ ...edits, [key]: val });

  const saveAll = async () => {
    for (const [key, value] of Object.entries(edits)) {
      await api.patch("/admin/site-settings", { key, value, category: "wheel" }).catch(() => {});
    }
    showSuccess("Paramètres roue sauvegardés ✅", "");
    setEdits({});
    reload();
  };

  const fields = [
    { key: "wheel_title", label: "Titre de la roue", type: "input" },
    { key: "wheel_subtitle", label: "Sous-titre", type: "input" },
    { key: "wheel_info_title", label: "Titre section information", type: "input" },
    { key: "wheel_rules", label: "Règles (une par ligne)", type: "textarea" },
    { key: "wheel_win_message", label: "Message après gain", type: "input" },
    { key: "deposit_not_withdrawable", label: "Dépôt non retirable (true/false)", type: "input" },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Textes & Règles</h3>
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea value={getValue(f.key)} onChange={e => setVal(f.key, e.target.value)} rows={4}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary outline-none resize-none" />
            ) : (
              <input value={getValue(f.key)} onChange={e => setVal(f.key, e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-secondary focus:border-primary outline-none" />
            )}
          </div>
        ))}
      </div>
      {Object.keys(edits).length > 0 && (
        <button onClick={saveAll} className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          <Save size={16} /> Save
        </button>
      )}
    </div>
  );
};

// ========== VIP SPINS VALIDATION ==========
const VipSpinsSection = ({ spins, reload, showSuccess, showError, logAction, adminId }: any) => {
  const pendingVip = spins.filter((s: WheelSpin) => s.status === "pending_vip");
  const approvedVip = spins.filter((s: WheelSpin) => s.status === "vip_approved");
  const rejectedVip = spins.filter((s: WheelSpin) => s.status === "vip_rejected");
  const [filter, setFilter] = useState("pending_vip");
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    loadProfiles();
  }, [spins]);

  const loadProfiles = async () => {
    const userIds: string[] = [...new Set(spins.map((s: WheelSpin) => s.user_id))] as string[];
    if (userIds.length === 0) return;
    const data = await api.get(`/admin/profiles-by-ids?ids=${userIds.join(",")}`).catch(() => []);
    const map: Record<string, any> = {};
    (data || []).forEach((p: any) => { map[p.user_id] = p; });
    setProfiles(map);
  };

  const handleAction = async (spin: WheelSpin, action: "vip_approved" | "vip_rejected") => {
    await api.patch(`/admin/wheel-spins/${spin.id}`, { status: action, adminId }).catch(() => {});
    logAction(action === "vip_approved" ? "vip_wheel_approved" : "vip_wheel_rejected", "wheel_spin", spin.id, spin.prize_label);
    showSuccess(action === "vip_approved" ? "VIP activé ✅" : "VIP refusé", "");
    reload();
  };

  const filtered = spins.filter((s: WheelSpin) => s.status === filter);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "pending_vip", label: "En attente", count: pendingVip.length, color: "text-warning", border: "border-warning" },
          { key: "vip_approved", label: "Approuvés", count: approvedVip.length, color: "text-success", border: "border-success" },
          { key: "vip_rejected", label: "Refusés", count: rejectedVip.length, color: "text-destructive", border: "border-destructive" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 transition-colors ${filter === s.key ? s.border : "border-secondary"}`}>
            <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">No VIP prizes</p> :
        filtered.map((s: WheelSpin) => {
          const p = profiles[s.user_id];
          return (
            <div key={s.id} className="bg-card rounded-xl border border-secondary px-4 py-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{s.prize_label}</p>
                  <p className="text-xs text-muted-foreground">{p?.full_name || "Utilisateur"} • {p?.phone || ""}</p>
                  <p className="text-xs text-muted-foreground">VIP actuel : {p?.vip_level || 0} → VIP{s.vip_level}</p>
                </div>
                <span className="text-[10px] text-muted-foreground"><span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" })}</span></span>
              </div>
              {s.status === "pending_vip" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button onClick={() => handleAction(s, "vip_approved")}
                    className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10">
                    <CheckCircle2 size={16} /> Activer
                  </button>
                  <button onClick={() => handleAction(s, "vip_rejected")}
                    className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

// ========== IMAGES MANAGEMENT ==========
const ImagesSection = ({ settings, reload, showSuccess, showError }: any) => {
  const [uploading, setUploading] = useState<string | null>(null);

  const getValue = (key: string) => settings.find((s: SiteSetting) => s.key === key)?.value ?? "";

  const imageFields = [
    { key: "wheel_banner_url", label: "Bannière promotionnelle", folder: "wheel" },
    { key: "wheel_icon_url", label: "Icône flottante Roue", folder: "icons" },
    { key: "support_icon_url", label: "Icône flottante Support", folder: "icons" },
  ];

  const handleUpload = async (key: string, _folder: string, file: File) => {
    setUploading(key);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name, bucket: "site-assets" }),
      });
      const data = await res.json();
      if (!res.ok) { showError("Erreur upload", data.error || "Échec"); setUploading(null); return; }
      const publicUrl = `${data.url}?t=${Date.now()}`;
      await api.patch("/admin/site-settings", { key, value: publicUrl, category: "wheel" }).catch(() => {});
      showSuccess("Image uploadée ✅", "");
      reload();
    } catch (err: any) {
      showError("Erreur upload", err?.message || "Échec du téléchargement");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (key: string) => {
    await api.patch("/admin/site-settings", { key, value: "", category: "wheel" }).catch(() => {});
    showSuccess("Image supprimée", "");
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl border border-secondary p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Images & Bannières</h3>
        <p className="text-xs text-muted-foreground">Uploadez directement les images (PNG, JPG, SVG). Laissez vide pour les icônes par défaut.</p>
        {imageFields.map(f => {
          const currentUrl = getValue(f.key);
          return (
            <div key={f.key} className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              {currentUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-secondary overflow-hidden flex-shrink-0 bg-secondary/30">
                    <img src={currentUrl} alt={f.label} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <label className="flex-1 gradient-button text-primary-foreground font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <UploadIcon size={12} /> Remplacer
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(f.key, f.folder, e.target.files[0]); }} />
                    </label>
                    <button onClick={() => handleRemove(f.key)}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold border border-destructive text-destructive hover:bg-destructive/10">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full border-2 border-dashed border-secondary rounded-xl py-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 transition-colors">
                  <UploadIcon size={20} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cliquer pour uploader</span>
                  <span className="text-[10px] text-muted-foreground/60">PNG, JPG, SVG</span>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleUpload(f.key, f.folder, e.target.files[0]); }} />
                </label>
              )}
              {uploading === f.key && <p className="text-xs text-primary animate-pulse">Upload en cours...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWheelTab;
