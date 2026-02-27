import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { CreditCard, Trash2, Plus, Smartphone } from "lucide-react";

const countries = [
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "+243", flag: "🇨🇩", name: "RD Congo" },
];

const networks = ["Orange Money", "Moov Money", "Wave", "MTN Money", "Free Money", "Airtel Money"];

type Wallet = {
  id: string;
  phone: string;
  country_code: string;
  network: string;
  label: string | null;
  created_at: string | null;
};

const LierCarte = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [countryCode, setCountryCode] = useState("+226");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("Orange Money");

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const { data } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setWallets(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!phone || phone.length < 8) {
      toast.error("Numéro de téléphone invalide");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const country = countries.find(c => c.code === countryCode);
    const { error } = await supabase.from("user_wallets").insert({
      user_id: user.id,
      phone,
      country_code: countryCode,
      network,
      label: `${country?.flag || ""} ${network}`,
    });

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
    } else {
      toast.success("Portefeuille ajouté ✅");
      setPhone("");
      setShowForm(false);
      loadWallets();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_wallets").delete().eq("id", id);
    if (!error) {
      toast.success("Portefeuille supprimé");
      loadWallets();
    }
  };

  const selectedCountry = countries.find(c => c.code === countryCode);

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Mon Compte" showBack />

      <div className="px-4 pt-6">
        {/* Existing wallets as cards */}
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Chargement...</p>
        ) : wallets.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
              <CreditCard size={32} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-6">Aucun portefeuille enregistré</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {wallets.map((w) => {
              const country = countries.find(c => c.code === w.country_code);
              return (
                <div
                  key={w.id}
                  className="relative rounded-2xl overflow-hidden border border-primary/30"
                  style={{
                    background: "linear-gradient(135deg, hsl(85 70% 55%), hsl(75 80% 50%), hsl(65 85% 45%))",
                    minHeight: "160px",
                  }}
                >
                  {/* Decorative lines */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-full h-full" style={{
                      background: "repeating-linear-gradient(120deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 42px)"
                    }} />
                  </div>

                  <div className="relative p-5">
                    {/* Network icon */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 rounded-lg bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <Smartphone size={20} className="text-white" />
                      </div>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>

                    {/* Phone number masked */}
                    <p className="text-lg font-bold text-black/80 tracking-[0.2em] mb-1">
                      {w.country_code} **** {w.phone.slice(-4)}
                    </p>
                    <p className="text-sm text-black/60 font-medium">
                      {country?.flag} {w.network}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-secondary p-5 mb-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Ajouter un portefeuille</h3>

            {/* Country */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pays</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Network */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Réseau</label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none"
              >
                {networks.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Numéro de téléphone</label>
              <div className="flex gap-2">
                <span className="bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary">
                  {selectedCountry?.flag} {countryCode}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="XX XX XX XX"
                  maxLength={15}
                  className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Ajouter Compte
        </button>
      </div>
    </div>
  );
};

export default LierCarte;
