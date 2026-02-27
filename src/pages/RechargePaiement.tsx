import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PremiumModal from "@/components/PremiumModal";

const DESTINATAIRE_NOM = "SONGBO JIANGPAPIZ";
const DESTINATAIRE_COMPTE = "66610774";

const RechargePaiement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount, phone, countryCode } = (location.state as { amount: number; phone: string; countryCode: string }) || {};
  const [step, setStep] = useState<"info" | "ref">("info");
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showRechargeSuccess, setShowRechargeSuccess] = useState(false);

  if (!amount) {
    navigate("/recharge");
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const handleValidate = async () => {
    if (!transactionRef.trim()) {
      toast.error("Veuillez entrer la référence de la transaction");
      return;
    }
    if (transactionRef.trim().length < 5) {
      toast.error("La référence doit contenir au moins 5 caractères");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour effectuer une recharge");
        navigate("/connexion");
        return;
      }

      const { error } = await supabase.from("recharges").insert({
        user_id: user.id,
        phone,
        country_code: countryCode,
        amount,
        transaction_ref: transactionRef.trim(),
        payment_method: "Orange Money",
      });

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          toast.error("Cette référence de transaction a déjà été utilisée");
        } else {
          toast.error("Erreur lors de la soumission");
        }
        return;
      }

      setShowRechargeSuccess(true);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (showAdvice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-card rounded-2xl border border-secondary p-8 max-w-sm w-full text-center">
          <h3 className="text-primary font-bold text-lg mb-4">Conseils</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Cher client, si vous avez déjà effectué le paiement mais qu'il n'a pas été reçu, veuillez attendre 5-10 minutes avant de cliquer à nouveau. Si vous n'avez pas encore effectué le paiement, veuillez compléter le paiement d'abord, puis cliquer à nouveau.
          </p>
          <p className="text-sm text-foreground font-medium mb-6">
            Merci pour votre compréhension et votre coopération!
          </p>
          <button
            onClick={() => navigate("/portefeuille")}
            className="w-full border border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary/10 transition-colors"
          >
            Je l'ai !
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Green header */}
      <div className="bg-gradient-to-br from-success via-success/90 to-primary/70 pt-4 pb-16 px-4">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-success-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-lg font-bold text-success-foreground mx-auto pr-6">
            {step === "info" ? "Paiement" : "Orange Money"}
          </h1>
        </div>
      </div>

      {/* Content card overlapping header */}
      <div className="px-4 -mt-10">
        <div className="bg-card rounded-2xl border border-secondary p-5 space-y-5">
          {step === "info" ? (
            <>
              {/* Amount display */}
              <div className="text-center py-4 bg-secondary/50 rounded-xl">
                <span className="text-primary font-semibold text-sm mr-2">XOF</span>
                <span className="text-3xl font-bold text-foreground">{amount.toLocaleString()}.00</span>
              </div>

              {/* Phone */}
              <div>
                <p className="text-sm text-foreground font-medium mb-2">Entrez votre numéro de téléphone</p>
                <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-primary font-semibold">{countryCode}</span>
                  <span className="text-foreground font-medium">{phone}</span>
                </div>
              </div>

              {/* Payment mode */}
              <div>
                <p className="text-sm text-foreground font-medium mb-2">Choisissez le mode de paiement</p>
                <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="bg-warning text-warning-foreground text-xs font-bold px-2 py-1 rounded">Max<span className="text-destructive">it</span></span>
                  <span className="text-foreground font-medium">Orange Money</span>
                </div>
              </div>

              <button
                onClick={() => setStep("ref")}
                className="w-full bg-success text-success-foreground font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity"
              >
                Confirmer
              </button>
            </>
          ) : (
            <>
              {/* Payment details with copy buttons */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">MONTANT</p>
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-foreground font-medium">{amount.toLocaleString()}.00</span>
                    <button onClick={() => copyToClipboard(String(amount))} className="text-primary font-semibold text-sm">Copier</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">NOM DU DESTINATAIRE</p>
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-foreground font-medium">{DESTINATAIRE_NOM}</span>
                    <button onClick={() => copyToClipboard(DESTINATAIRE_NOM)} className="text-primary font-semibold text-sm">Copier</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">COMPTE DU DESTINATAIRE</p>
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-foreground font-medium">{DESTINATAIRE_COMPTE}</span>
                    <button onClick={() => copyToClipboard(DESTINATAIRE_COMPTE)} className="text-primary font-semibold text-sm">Copier</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">COMPTE DE L'EXPÉDITEUR</p>
                  <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-foreground font-medium">{phone}</span>
                    <span className="text-primary font-semibold text-sm">Modifier</span>
                  </div>
                </div>
              </div>

              {/* Pay now button */}
              <a
                href={`tel:*144*${DESTINATAIRE_COMPTE}*${amount}#`}
                className="w-full bg-success text-success-foreground font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2"
              >
                📞 Payez Maintenant
              </a>

              {/* Transaction ref input */}
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">RÉFÉRENCE DE LA TRANSACTION</p>
                <input
                  type="text"
                  placeholder="Entrez l'ID de transaction"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>

              <button
                onClick={handleValidate}
                disabled={loading}
                className="w-full bg-success/80 text-success-foreground font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "Vérifier effectuer le paiement"}
              </button>
            </>
          )}
        </div>
      </div>

      <PremiumModal
        triggerKey="recharge_success"
        open={showRechargeSuccess}
        onClose={() => { setShowRechargeSuccess(false); setShowAdvice(true); }}
      />
    </div>
  );
};

export default RechargePaiement;
