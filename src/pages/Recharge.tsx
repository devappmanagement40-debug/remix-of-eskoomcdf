import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CountryPicker from "@/components/CountryPicker";
import { CreditCard, ChevronRight } from "lucide-react";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";

type PaymentMethod = {
  id: string; name: string; phone: string | null; holder_name: string | null;
  instructions: string | null; country_id: string | null; country: string;
  payment_type: string; external_url: string | null; logo_url: string | null;
  is_active: boolean;
};

const Recharge = () => {
  const navigate = useNavigate();
  const { validatePhone } = usePhoneValidation();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+226");
  const [presetAmounts, setPresetAmounts] = useState<number[]>([5000, 10000, 20000, 50000, 100000, 200000]);
  const [minAmount, setMinAmount] = useState(1000);
  const [maxAmount, setMaxAmount] = useState(1000000);
  const [rules, setRules] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [countriesList, setCountriesList] = useState<any[]>([]);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const [settingsRes, methodsRes, countriesRes] = await Promise.all([
      supabase.from("site_settings").select("key, value").in("key", ["deposit_amounts", "deposit_min", "deposit_max", "deposit_rules"]),
      supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("countries").select("*").eq("is_active", true).order("sort_order"),
    ]);
    if (settingsRes.data) {
      settingsRes.data.forEach(s => {
        if (s.key === "deposit_amounts" && s.value) setPresetAmounts(s.value.split(",").map(Number).filter(Boolean));
        if (s.key === "deposit_min" && s.value) setMinAmount(Number(s.value));
        if (s.key === "deposit_max" && s.value) setMaxAmount(Number(s.value));
        if (s.key === "deposit_rules" && s.value) {
          const parsed = s.value
            .replace("{min}", String(Number(settingsRes.data?.find(x => x.key === "deposit_min")?.value || 1000).toLocaleString()))
            .replace("{max}", String(Number(settingsRes.data?.find(x => x.key === "deposit_max")?.value || 1000000).toLocaleString()));
          setRules(parsed.split("|"));
        }
      });
    }
    if (methodsRes.data) setPaymentMethods(methodsRes.data as PaymentMethod[]);
    if (countriesRes.data) setCountriesList(countriesRes.data);
  };

  // Filter methods by selected country
  const selectedCountry = countriesList.find(c => c.country_code === countryCode);
  const filteredMethods = paymentMethods.filter(m =>
    !m.country_id || (selectedCountry && m.country_id === selectedCountry.id)
  );

  const handleConfirm = () => {
    const parsedAmount = parseFloat(amount);
    const phoneCheck = validatePhone(phone, countryCode);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }
    if (!parsedAmount || parsedAmount < minAmount) {
      toast.error(`Le montant minimum est de ${minAmount.toLocaleString()} FCFA`);
      return;
    }
    if (parsedAmount > maxAmount) {
      toast.error(`Le montant maximum est de ${maxAmount.toLocaleString()} FCFA`);
      return;
    }
    if (!selectedMethod) {
      toast.error("Veuillez selectionner un moyen de paiement");
      return;
    }

    // If external link payment, redirect
    if (selectedMethod.payment_type === "external" && selectedMethod.external_url) {
      // Store pending recharge info, then redirect
      navigate("/recharge/paiement", {
        state: {
          amount: parsedAmount,
          phone,
          countryCode,
          method: selectedMethod,
          isExternal: true,
        },
      });
      return;
    }

    navigate("/recharge/paiement", {
      state: { amount: parsedAmount, phone, countryCode, method: selectedMethod },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Depot" showBack />

      <div className="px-4 pt-5 space-y-5">
        {/* Amount input */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Montant (FCFA)</label>
          <div className="flex items-center bg-secondary/50 rounded-xl px-4 py-3">
            <input
              type="number"
              placeholder={`Min. ${minAmount.toLocaleString()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-foreground text-lg font-semibold w-full outline-none placeholder:text-muted-foreground"
            />
            <span className="text-muted-foreground font-semibold text-sm ml-3 whitespace-nowrap">FCFA</span>
          </div>

          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  amount === String(preset)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-foreground hover:bg-secondary"
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Phone */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Numero de telephone</label>
          <div className="flex items-center bg-secondary/50 rounded-xl px-3 py-3 gap-3">
            <CountryPicker value={countryCode} onChange={setCountryCode} />
            <span className="text-border">|</span>
            <input
              type="tel"
              placeholder="Numero de telephone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="bg-transparent text-foreground text-sm w-full outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-3 block">Moyen de paiement</label>
          {filteredMethods.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun moyen de paiement disponible pour ce pays</p>
          ) : (
            <div className="space-y-2">
              {filteredMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    selectedMethod?.id === m.id
                      ? "bg-primary/10 border border-primary/40"
                      : "bg-secondary/40 border border-transparent hover:border-border/30"
                  }`}
                >
                  {m.logo_url ? (
                    <img src={m.logo_url} alt={m.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <CreditCard size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.payment_type === "external" ? "Paiement en ligne" : "Paiement manuel"}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod?.id === m.id ? "border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedMethod?.id === m.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rules */}
        {rules.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/30 p-4">
            <label className="text-xs text-muted-foreground mb-2 block">Regles de depot</label>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5">{i + 1}.</span>
                  <p className="text-xs text-muted-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!amount || !phone || !selectedMethod}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Confirmer
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Recharge;
