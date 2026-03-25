import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import PremiumModal from "@/components/PremiumModal";
import { Copy, ExternalLink, CheckCircle, Zap, Loader2, Upload, Image as ImageIcon, X, CreditCard, Shield } from "lucide-react";
import { safeClipboardWrite } from "@/lib/clipboard";

type PaymentMethodInfo = {
  id: string; name: string; phone: string | null; holder_name: string | null;
  instructions: string | null; payment_type: string; external_url: string | null;
  api_config_id?: string | null;
};

const RechargePaiement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showCopy, showSuccess } = useActionPopup();
  const { amount, phone, countryCode, method, isExternal, isApi } = (location.state as {
    amount: number; phone: string; countryCode: string;
    method: PaymentMethodInfo; isExternal?: boolean; isApi?: boolean;
  }) || {};

  const [loading, setLoading] = useState(false);
  const [showRechargeSuccess, setShowRechargeSuccess] = useState(false);
  const [redirected, setRedirected] = useState(false);
  const [apiProcessing, setApiProcessing] = useState(false);
  const [apiStatus, setApiStatus] = useState<"idle" | "processing" | "success" | "pending" | "failed">("idle");
  const [otpCode, setOtpCode] = useState("");
  
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!amount || !method) {
      navigate("/recharge");
    }
  }, []);

  if (!amount || !method) return null;

  const copyToClipboard = async (text: string, label: string) => {
    await safeClipboardWrite(text);
    showCopy(`${label} copié`);
  };

  const handleExternalRedirect = () => {
    if (method.external_url) {
      window.open(method.external_url, "_blank");
      setRedirected(true);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Erreur", "Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Erreur", "L'image ne doit pas dépasser 5 Mo");
      return;
    }
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setProofImage(null);
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
      setProofPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApiPayment = async () => {
    setApiProcessing(true);
    setApiStatus("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Erreur", "Vous devez être connecté");
        navigate("/connexion");
        return;
      }
      const body: Record<string, unknown> = {
        amount, phone, country_code: countryCode,
        payment_method_id: method.id, api_config_id: method.api_config_id,
        payment_method_name: method.name,
      };
      if (otpCode.trim()) body.otp_code = otpCode.trim();
      const { data, error } = await supabase.functions.invoke("process-payment", { body });
      if (error) {
        setApiStatus("failed");
        showError("Erreur", "Le paiement a échoué. Réessayez ou utilisez le paiement manuel.");
        return;
      }
      if (data?.success) {
        if (data?.paymentUrl) {
          window.open(data.paymentUrl, "_blank");
          setApiStatus("pending");
        } else if (data?.pending) {
          setApiStatus("pending");
        } else {
          setApiStatus("success");
          setShowRechargeSuccess(true);
        }
      } else {
        setApiStatus("failed");
        showError("Erreur", data?.error || "Le paiement a échoué");
      }
    } catch {
      setApiStatus("failed");
      showError("Erreur", "Erreur de connexion au serveur");
    } finally {
      setApiProcessing(false);
    }
  };

  const handleValidate = async () => {
    if (!proofImage) {
      showError("Erreur", "Veuillez télécharger une preuve de paiement");
      return;
    }
    setLoading(true);
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Erreur", "Vous devez être connecté");
        navigate("/connexion");
        return;
      }
      const fileExt = proofImage.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `recharge-proofs/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, proofImage, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        showError("Erreur", "Erreur lors du téléchargement de l'image");
        return;
      }
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(filePath);
      const proofUrl = urlData?.publicUrl;
      const { error } = await supabase.from("recharges").insert({
        user_id: user.id, phone, country_code: countryCode,
        amount, payment_method: method.name, proof_image_url: proofUrl,
      });
      if (error) {
        showError("Erreur", "Erreur lors de la soumission");
        return;
      }
      setShowRechargeSuccess(true);
    } catch {
      showError("Erreur", "Erreur de connexion au serveur");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Paiement" showBack />

      <div className="px-4 pt-4 space-y-5">
        {/* Hero amount section */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
          <div className="relative px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
              <CreditCard size={26} className="text-primary-foreground" />
            </div>
            <p className="text-xs text-primary-foreground/70 mb-1">Montant à payer</p>
            <p className="text-4xl font-black text-primary-foreground tracking-tight">
              {amount.toLocaleString("fr-FR")}
              <span className="text-base font-medium ml-1.5 opacity-80">CDF</span>
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
              <Shield size={12} className="text-primary-foreground/80" />
              <span className="text-[11px] font-medium text-primary-foreground/90">{method.name}</span>
            </div>
          </div>
        </div>

        {/* API Payment Section */}
        {isApi && (
          <div className="space-y-4">
            {/* OTP for Orange Money */}
            {method.name?.toLowerCase().includes("orange") && apiStatus === "idle" && (
              <div className="bg-card rounded-2xl border border-secondary p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Zap size={16} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Code OTP requis</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {countryCode === "+225" || countryCode === "+223" ? (
                    <>Composez <span className="font-bold text-foreground">#144*82#</span> pour générer votre code OTP.</>
                  ) : (
                    <>Composez <span className="font-bold text-foreground">*144*4*6*{amount}#</span> pour recevoir votre code OTP par SMS.</>
                  )}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="w-full bg-secondary/50 rounded-xl px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground/40 border border-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 text-center tracking-[0.5em] font-bold"
                />
              </div>
            )}

            {apiStatus === "idle" && (
              <button
                onClick={handleApiPayment}
                disabled={apiProcessing || (method.name?.toLowerCase().includes("orange") && otpCode.length < 4)}
                className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Zap size={18} />
                Payer {amount.toLocaleString("fr-FR")} CDF
              </button>
            )}

            {apiStatus === "processing" && (
              <div className="bg-card rounded-2xl border border-secondary p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 size={32} className="text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">Traitement en cours</p>
                  <p className="text-xs text-muted-foreground mt-1">Ne fermez pas cette page...</p>
                </div>
              </div>
            )}

            {apiStatus === "pending" && (
              <div className="bg-card rounded-2xl border border-success/30 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Demande envoyée !</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Confirmez le paiement avec votre code PIN sur votre téléphone. Votre compte sera crédité automatiquement.
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate("/portefeuille")} className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm">
                  Retour au portefeuille
                </button>
              </div>
            )}

            {apiStatus === "failed" && (
              <div className="bg-card rounded-2xl border border-destructive/30 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X size={20} className="text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Paiement échoué</p>
                    <p className="text-xs text-muted-foreground mt-1">Réessayez ou utilisez le mode manuel ci-dessous.</p>
                  </div>
                </div>
                <button onClick={handleApiPayment} className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm">
                  Réessayer
                </button>
              </div>
            )}

            {apiStatus === "success" && (
              <div className="bg-card rounded-2xl border border-success/30 p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={20} className="text-success" />
                </div>
                <p className="text-sm font-bold text-foreground">Paiement confirmé avec succès !</p>
              </div>
            )}
          </div>
        )}

        {/* Manual payment details */}
        {method.payment_type === "manual" && (
          <div className="bg-card rounded-2xl border border-secondary overflow-hidden">
            <div className="px-5 py-3.5 border-b border-secondary bg-secondary/20">
              <p className="text-sm font-bold text-foreground">Détails du paiement</p>
            </div>
            <div className="p-4 space-y-3">
              {method.holder_name && (
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Bénéficiaire</p>
                    <p className="text-sm font-bold text-foreground mt-0.5 truncate">{method.holder_name}</p>
                  </div>
                  <button onClick={() => copyToClipboard(method.holder_name!, "Nom")} className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                    <Copy size={14} className="text-primary" />
                  </button>
                </div>
              )}

              {method.phone && (
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Numéro</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{method.phone}</p>
                  </div>
                  <button onClick={() => copyToClipboard(method.phone!, "Numéro")} className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                    <Copy size={14} className="text-primary" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Montant</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{amount.toLocaleString("fr-FR")} CDF</p>
                </div>
                <button onClick={() => copyToClipboard(String(amount), "Montant")} className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                  <Copy size={14} className="text-primary" />
                </button>
              </div>

              {method.instructions && (
                <div className="bg-primary/5 rounded-xl px-4 py-3.5 border border-primary/10">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Instructions</p>
                  <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{method.instructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* External payment */}
        {method.payment_type === "external" && (
          <div className="bg-card rounded-2xl border border-secondary p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ExternalLink size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Paiement en ligne</p>
                <p className="text-xs text-muted-foreground">Vous serez redirigé vers la plateforme</p>
              </div>
            </div>
            <button
              onClick={handleExternalRedirect}
              className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Payer maintenant
            </button>
            {redirected && (
              <div className="flex items-center gap-2 bg-success/10 rounded-xl px-4 py-3">
                <CheckCircle size={14} className="text-success" />
                <p className="text-xs font-medium text-success">Paiement effectué ? Envoyez la preuve ci-dessous</p>
              </div>
            )}
          </div>
        )}

        {/* Proof upload section */}
        {(method.payment_type !== "api" || apiStatus === "failed") && (
          <div className="bg-card rounded-2xl border border-secondary overflow-hidden">
            <div className="px-5 py-3.5 border-b border-secondary bg-secondary/20">
              <p className="text-sm font-bold text-foreground">
                {apiStatus === "failed" ? "Confirmation manuelle" : "Preuve de paiement"}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

              {!proofPreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-secondary hover:border-primary/40 rounded-2xl py-10 flex flex-col items-center justify-center gap-3 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">Ajouter une capture d'écran</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG — max 5 Mo</p>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-secondary">
                  <img src={proofPreview} alt="Preuve" className="w-full h-52 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button onClick={removeImage} className="p-2 bg-destructive text-destructive-foreground rounded-xl shadow-lg">
                      <X size={14} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-card/90 backdrop-blur-sm text-foreground rounded-xl shadow-lg border border-secondary">
                      <ImageIcon size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-secondary/30 rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Numéro utilisé</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{countryCode} {phone}</p>
              </div>

              <button
                onClick={handleValidate}
                disabled={loading || !proofImage}
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold py-4 rounded-xl text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uploading ? "Téléchargement..." : "Envoi..."}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
