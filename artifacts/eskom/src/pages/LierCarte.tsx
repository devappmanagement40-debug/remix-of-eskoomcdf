import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Wallet, Trash2, Plus, Copy, ShieldCheck } from "lucide-react";

type WalletRecord = {
  id: string;
  phone: string;
  country_code: string;
  network: string;
  label: string | null;
  holder_name?: string | null;
  created_at: string | null;
};

const USDT_BEP20 = {
  code: "usdtbsc",
  label: "USDT BEP20",
  network: "BNB Smart Chain (BEP20)",
  color: "#26A17B",
  symbol: "₮",
  bg: "rgba(38,161,123,0.15)",
  logo: "/crypto-logos/usdt.png",
};

function validateBEP20(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg, hsl(174 72% 42%), hsl(220 25% 14%) 70%)",
  "linear-gradient(135deg, hsl(270 60% 40%), hsl(220 25% 14%) 70%)",
  "linear-gradient(135deg, hsl(30 90% 45%), hsl(220 25% 14%) 70%)",
  "linear-gradient(135deg, hsl(210 80% 40%), hsl(220 25% 14%) 70%)",
];

const LierCarte = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [holderName, setHolderName] = useState("");

  useEffect(() => { loadWallets(); }, []);

  const loadWallets = async () => {
    const token = getAuthToken();
    if (!token) { navigate("/connexion"); return; }
    try {
      const res = await fetch("/api/user-wallets/my", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setWallets(await res.json());
    } catch (err) {
      console.error("Wallets load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!walletAddress.trim()) { showError("Erreur", "Veuillez saisir une adresse wallet"); return; }
    if (!validateBEP20(walletAddress)) { showError("Adresse invalide", "L'adresse BEP20 doit commencer par 0x et faire 42 caractères"); return; }

    const token = getAuthToken();
    if (!token) { navigate("/connexion"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/user-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phone: walletAddress.trim(),
          countryCode: USDT_BEP20.code,
          network: USDT_BEP20.label,
          label: USDT_BEP20.label,
          holderName: holderName.trim() || null,
        }),
      });
      if (res.ok) {
        showSuccess("Wallet ajouté", "Votre adresse USDT BEP20 a été sauvegardée ✅");
        setWalletAddress("");
        setHolderName("");
        setShowForm(false);
        loadWallets();
      } else {
        const data = await res.json();
        showError("Erreur", data.error || "Impossible d'enregistrer le wallet");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch(`/api/user-wallets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { showSuccess("Supprimé", "Wallet supprimé"); loadWallets(); }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Mes Wallets" showBack />
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/25 rounded-2xl p-4 mb-5">
          <ShieldCheck size={22} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Retraits USDT BEP20 uniquement</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Les retraits s'effectuent exclusivement via le réseau BNB Smart Chain (BEP20)</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : (
          <>
            {wallets.length === 0 && !showForm ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                  <Wallet size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-6">Aucun wallet enregistré</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {wallets.map((w, i) => {
                  const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                  return (
                    <div key={w.id} className="relative rounded-2xl overflow-hidden border border-primary/20" style={{ background: gradient, minHeight: "148px" }}>
                      <div className="absolute inset-0 opacity-10" style={{ background: "repeating-linear-gradient(120deg, transparent, transparent 40px, rgba(255,255,255,0.07) 40px, rgba(255,255,255,0.07) 42px)" }} />
                      <div className="relative p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 overflow-hidden" style={{ background: "rgba(38,161,123,0.25)", color: "#26A17B" }}>
                              <img src={USDT_BEP20.logo} alt="USDT" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{USDT_BEP20.label}</p>
                              <p className="text-[10px] text-white/60">{USDT_BEP20.network}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDelete(w.id)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                            <Trash2 size={14} className="text-white/70" />
                          </button>
                        </div>
                        <p className="text-sm font-mono text-white/85 tracking-wide mb-1">{truncateAddress(w.phone)}</p>
                        {w.holder_name && <p className="text-xs text-white/60">{w.holder_name}</p>}
                        <button onClick={() => navigator.clipboard.writeText(w.phone)} className="mt-2 flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white/80 transition-colors">
                          <Copy size={11} /> Copier l'adresse
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="bg-card rounded-2xl border border-secondary p-5 mb-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Ajouter un wallet USDT BEP20</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Réseau</label>
              <div className="w-full rounded-xl bg-secondary/60 border border-primary/30 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: USDT_BEP20.bg }}>
                  <img src={USDT_BEP20.logo} alt="USDT" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{USDT_BEP20.label}</p>
                  <p className="text-[10px] text-muted-foreground">{USDT_BEP20.network}</p>
                </div>
                <ShieldCheck size={15} className="text-primary flex-shrink-0" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Adresse wallet (BEP20)</label>
              <div className="input-glow rounded-xl bg-secondary p-3 flex items-center gap-2">
                <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value.trim())} placeholder="0x..." className="flex-1 bg-transparent text-foreground text-sm font-mono outline-none placeholder:text-muted-foreground" />
                {walletAddress && <button onClick={() => navigator.clipboard.writeText(walletAddress)} className="flex-shrink-0"><Copy size={14} className="text-muted-foreground" /></button>}
              </div>
              {walletAddress && !validateBEP20(walletAddress) && <p className="text-[10px] text-destructive mt-1.5 px-1">Doit commencer par 0x et faire exactement 42 caractères</p>}
              {walletAddress && validateBEP20(walletAddress) && <p className="text-[10px] text-success mt-1.5 px-1 flex items-center gap-1"><ShieldCheck size={11} /> Adresse valide</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Nom du titulaire (optionnel)</label>
              <div className="input-glow rounded-xl bg-secondary p-3">
                <input type="text" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nom du propriétaire du wallet" className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => { setShowForm(false); setWalletAddress(""); setHolderName(""); }} className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm">Annuler</button>
              <button onClick={handleSave} disabled={saving || !walletAddress || !validateBEP20(walletAddress)} className="gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-50">{saving ? "Enregistrement…" : "Sauvegarder"}</button>
            </div>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
            <Plus size={18} /> Ajouter un wallet USDT BEP20
          </button>
        )}
      </div>
    </div>
  );
};

export default LierCarte;
