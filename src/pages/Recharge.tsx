import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CountryPicker, { countries } from "@/components/CountryPicker";

const presetAmounts = [4000, 12000, 25000, 58000, 120000, 228000];

const Recharge = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+226");

  const selectedCountry = countries.find((c) => c.code === countryCode);

  const handleConfirm = () => {
    const parsedAmount = parseFloat(amount);
    if (!phone || phone.length < 8) {
      toast.error("Veuillez entrer un numéro de téléphone valide");
      return;
    }
    if (!parsedAmount || parsedAmount < 4000) {
      toast.error("Le montant minimum est de 4 000 CFA");
      return;
    }
    if (parsedAmount > 300000) {
      toast.error("Le montant maximum est de 300 000 CFA");
      return;
    }
    navigate("/recharge/paiement", {
      state: { amount: parsedAmount, phone, countryCode },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Portefeuille" showBack />

      {/* Banner */}
      <div className="bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 px-4 py-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Rechargement</p>
          <p className="text-2xl font-bold text-foreground">💰 Portefeuille</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Amount input */}
        <div className="input-glow rounded-xl bg-card p-4">
          <div className="flex items-center justify-between">
            <input
              type="number"
              placeholder="Veuillez entrer le montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-foreground text-base w-full outline-none placeholder:text-muted-foreground"
            />
            <span className="text-primary font-bold text-lg ml-3 whitespace-nowrap">CFA</span>
          </div>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-3 gap-3">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(String(preset))}
              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                amount === String(preset)
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-primary/20 text-primary hover:bg-primary/30"
              }`}
            >
              {preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Phone */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">📱 Numéro de téléphone</p>
          <div className="input-glow rounded-xl bg-card p-3 flex items-center gap-3">
            <CountryPicker value={countryCode} onChange={setCountryCode} />
            <span className="text-muted-foreground">|</span>
            <input
              type="tel"
              placeholder="Numéro de téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="bg-transparent text-foreground text-base w-full outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">💳 Moyens de paiement</p>
          <div className="input-glow rounded-xl bg-card p-3 flex items-center gap-3">
            <span className="text-primary font-semibold text-sm">Pay</span>
            <span className="ml-auto w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            </span>
          </div>
        </div>

        {/* Rules */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">📋 Description des règles</p>
          <div className="bg-card rounded-xl border border-secondary p-4 space-y-2">
            <p className="text-xs text-muted-foreground">1. Recharge minimale <span className="text-primary font-semibold">4000 CFA</span>.</p>
            <p className="text-xs text-muted-foreground">2. Recharge maximale <span className="text-primary font-semibold">300000 CFA</span>.</p>
            <p className="text-xs text-muted-foreground">3. Après le paiement, veuillez saisir l'identifiant de la transaction sur la page de paiement, sinon votre compte sera affecté.</p>
            <p className="text-xs text-muted-foreground">4. Si vous rencontrez des problèmes de paiement, veuillez contacter le service client.</p>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="w-full gradient-button text-foreground font-bold py-4 rounded-xl text-base transition-opacity hover:opacity-90"
        >
          Confirmer
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Recharge;
