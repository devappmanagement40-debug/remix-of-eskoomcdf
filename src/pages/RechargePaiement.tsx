import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import PremiumModal from "@/components/PremiumModal";
import { Copy, ExternalLink, CheckCircle } from "lucide-react";

type PaymentMethodInfo = {
  id: string; name: string; phone: string | null; holder_name: string | null;
  instructions: string | null; payment_type: string; external_url: string | null;
};

const RechargePaiement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showCopy } = useActionPopup();
  const { amount, phone, countryCode, method, isExternal } = (location.state as {
    amount: number; phone: string; countryCode: string;
    method: PaymentMethodInfo; isExternal?: boolean;
  }) || {};

  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRechargeSuccess, setShowRechargeSuccess] = useState(false);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (!amount || !method) {
      navigate("/recharge");
    }
  }, []);

  if (!amount || !method) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showCopy(`${label} copie`);
  };

  const handleExternalRedirect = () => {
    if (method.external_url) {
      window.open(method.external_url, "_blank");
      setRedirected(true);
    }
  };

  const handleValidate = async () => {
    if (!transactionRef.trim()) {
      showError("Erreur", "Veuillez entrer la reference de la transaction");
      return;
    }
    if (transactionRef.trim().length < 3) {
      showError("Erreur", "La reference doit contenir au moins 3 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Erreur", "Vous devez etre connecte");
        navigate("/connexion");
        return;
      }

      const { error } = await supabase.from("recharges").insert({
        user_id: user.id,
        phone,
        country_code: countryCode,
        amount,
        transaction_ref: transactionRef.trim(),
        payment_method: method.name,
      });

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          showError("Erreur", "Cette reference de transaction a deja ete utilisee");
        } else {
          showError("Erreur", "Erreur lors de la soumission");
        }
        return;
      }

      setShowRechargeSuccess(true);
    } catch {
      showError("Erreur", "Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Confirmation" showBack />

      <div className="px-4 pt-6 space-y-4">
        {/* Amount Card */}
        <div className="bg-card rounded-2xl border border-border/30 p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Montant a payer</p>
          <p className="text-3xl font-bold text-foreground">{amount.toLocaleString()}<span className="text-sm font-normal text-muted-foreground ml-1">FCFA</span></p>
          <p className="text-xs text-muted-foreground mt-2">via {method.name}</p>
        </div>

        {/* Manual payment info */}
        {method.payment_type !== "external" && (
          <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Informations de paiement</p>

            {method.holder_name && (
              <div className="bg-secondary/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Nom du beneficiaire</p>
                  <p className="text-sm font-semibold text-foreground">{method.holder_name}</p>
                </div>
                <button onClick={() => copyToClipboard(method.holder_name!, "Nom")} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                  <Copy size={14} className="text-primary" />
                </button>
              </div>
            )}

            {method.phone && (
              <div className="bg-secondary/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Numero</p>
                  <p className="text-sm font-semibold text-foreground">{method.phone}</p>
                </div>
                <button onClick={() => copyToClipboard(method.phone!, "Numero")} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                  <Copy size={14} className="text-primary" />
                </button>
              </div>
            )}

            <div className="bg-secondary/40 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Montant</p>
                <p className="text-sm font-semibold text-foreground">{amount.toLocaleString()} FCFA</p>
              </div>
              <button onClick={() => copyToClipboard(String(amount), "Montant")} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                <Copy size={14} className="text-primary" />
              </button>
            </div>

            {method.instructions && (
              <div className="bg-secondary/20 rounded-xl px-4 py-3">
                <p className="text-[10px] text-muted-foreground mb-1">Instructions</p>
                <p className="text-xs text-foreground whitespace-pre-line">{method.instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* External payment redirect */}
        {method.payment_type === "external" && (
          <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Paiement en ligne</p>
            <p className="text-xs text-muted-foreground">
              Vous allez etre redirige vers la plateforme de paiement. Apres le paiement, revenez ici pour confirmer.
            </p>
            <button
              onClick={handleExternalRedirect}
              className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Payer maintenant
            </button>
            {redirected && (
              <div className="flex items-center gap-2 bg-success/10 text-success rounded-xl px-4 py-2.5">
                <CheckCircle size={14} />
                <p className="text-xs font-medium">Paiement effectue ? Entrez la reference ci-dessous</p>
              </div>
            )}
          </div>
        )}

        {/* Transaction confirmation */}
        <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
          <p className="text-xs font-bold text-foreground">Confirmation de transaction</p>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">ID de transaction</label>
            <input
              type="text"
              placeholder="Entrez l'ID de la transaction"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Numero utilise</label>
            <div className="bg-secondary/40 rounded-xl px-4 py-3">
              <p className="text-sm text-foreground">{countryCode} {phone}</p>
            </div>
          </div>

          <button
            onClick={handleValidate}
            disabled={loading || !transactionRef.trim()}
            className="w-full bg-success text-success-foreground font-bold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Envoi en cours..." : "Confirmer le paiement"}
          </button>
        </div>
      </div>

      <PremiumModal
        triggerKey="recharge_success"
        open={showRechargeSuccess}
        onClose={() => { setShowRechargeSuccess(false); navigate("/portefeuille"); }}
      />
    </div>
  );
};

export default RechargePaiement;
