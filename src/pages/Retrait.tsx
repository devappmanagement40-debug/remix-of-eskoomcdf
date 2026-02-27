import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, Clock, Wallet, Info } from "lucide-react";

type WalletItem = {
  id: string;
  phone: string;
  country_code: string;
  network: string;
  label: string | null;
};

const FEE_PERCENT = 10;
const MIN_AMOUNT = 800;

const Retrait = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const [walletsRes, profileRes] = await Promise.all([
      supabase.from("user_wallets").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("balance").eq("user_id", user.id).single(),
    ]);

    if (walletsRes.data) setWallets(walletsRes.data);
    if (profileRes.data) setBalance(profileRes.data.balance || 0);
    setLoading(false);
  };

  const numAmount = Number(amount) || 0;
  const feeAmount = Math.round(numAmount * FEE_PERCENT / 100);
  const netAmount = numAmount - feeAmount;

  const handleSubmit = async () => {
    if (!selectedWallet) { toast.error("Sélectionnez un portefeuille"); return; }
    if (numAmount < MIN_AMOUNT) { toast.error(`Montant minimum : ${MIN_AMOUNT} FCFA`); return; }
    if (numAmount > balance) { toast.error("Solde insuffisant"); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      wallet_id: wallet.id,
      amount: numAmount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      phone: wallet.phone,
      country_code: wallet.country_code,
      network: wallet.network,
    });

    if (error) {
      toast.error("Erreur lors de la demande");
    } else {
      toast.success("Demande de retrait envoyée ✅");
      navigate("/portefeuille");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Retrait" showBack />

      <div className="px-4 pt-6 space-y-4">
        {/* Balance */}
        <div className="bg-card rounded-xl border border-secondary p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-2xl font-bold text-primary">{balance.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
        </div>

        {/* Info card */}
        <div className="bg-card rounded-xl border border-secondary p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-primary" />
            <span className="text-sm font-bold text-foreground">Instructions de retrait</span>
          </div>
          <div className="space-y-2">
            {[
              { icon: "💰", text: `Montant minimum de retrait : ${MIN_AMOUNT} FCFA` },
              { icon: "📊", text: `Frais de retrait : ${FEE_PERCENT}%` },
              { icon: "⏱️", text: "Délai de traitement : 1 à 24 heures" },
              { icon: "📱", text: "Le retrait est envoyé sur votre portefeuille mobile" },
              { icon: "🔒", text: "Les retraits sont vérifiés par l'administration" },
            ].map((info, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm">{info.icon}</span>
                <p className="text-xs text-muted-foreground">{info.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Select wallet */}
        <div className="bg-card rounded-xl border border-secondary p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Sélectionner le portefeuille</label>
          {wallets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-3">Aucun portefeuille enregistré</p>
              <button
                onClick={() => navigate("/lier-carte")}
                className="gradient-button text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Ajouter un portefeuille
              </button>
            </div>
          ) : (
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none"
            >
              <option value="">-- Choisir --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.network} — {w.country_code} ****{w.phone.slice(-4)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Amount */}
        <div className="bg-card rounded-xl border border-secondary p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Montant du retrait (FCFA)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${MIN_AMOUNT}`}
            min={MIN_AMOUNT}
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary focus:border-primary outline-none"
          />

          {numAmount > 0 && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-secondary">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Montant demandé</span>
                <span className="text-foreground font-semibold">{numAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Frais ({FEE_PERCENT}%)</span>
                <span className="text-destructive font-semibold">- {feeAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-foreground font-bold">Vous recevrez</span>
                <span className="text-primary font-bold">{netAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          )}
        </div>

        {/* Warning */}
        {numAmount > balance && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3">
            <AlertTriangle size={16} />
            <p className="text-xs font-medium">Solde insuffisant pour ce retrait</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || wallets.length === 0 || numAmount < MIN_AMOUNT || numAmount > balance}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Wallet size={18} />
          {submitting ? "Envoi en cours..." : "Lancer le retrait"}
        </button>
      </div>
    </div>
  );
};

export default Retrait;
