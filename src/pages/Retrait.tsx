import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, Wallet, ArrowUpRight, Clock, X, ShieldCheck, Upload, CheckCircle2, Image, Lock, Loader2 } from "lucide-react";
import PremiumModal from "@/components/PremiumModal";

type WalletItem = {
  id: string; phone: string; country_code: string; network: string; label: string | null;
};

type FeePayment = {
  id: string;
  fee_amount: number;
  capital_amount: number;
  proof_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

/** Mandatory processing-fee popup shown once per visit */
const ProcessingFeePopup = ({ open, onAccept, percent }: { open: boolean; onAccept: () => void; percent: number }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-all duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}>
        <div className="px-6 py-4" style={{ background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%), hsl(210 70% 50%))" }}>
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-white" />
            <h3 className="text-white font-bold text-lg">⚠️ OBLIGATOIRE</h3>
          </div>
        </div>
        <div className="bg-white px-6 py-5">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle size={32} className="text-destructive" />
            </div>
          </div>
          <h4 className="text-center text-gray-900 font-bold text-base mb-3">Paiement des frais AVANT retrait</h4>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-xs text-red-800 font-bold">
                🚫 AUCUN RETRAIT ne sera possible sans le paiement préalable des frais de traitement de {percent}%.
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-800 font-medium">📋 Étapes obligatoires :</p>
              <ol className="text-xs text-blue-700 mt-2 space-y-1.5 list-decimal list-inside">
                <li>Payez les frais de traitement ({percent}% de votre capital)</li>
                <li>Téléchargez la preuve de paiement</li>
                <li><span className="font-bold">Attendez la confirmation de l'administration</span></li>
                <li>Une fois confirmé, le formulaire de retrait se débloque</li>
              </ol>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-amber-800">
                ⚠️ Sans confirmation admin, le formulaire de retrait restera <span className="font-bold">verrouillé</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onAccept}
            className="w-full mt-5 py-3.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))" }}
          >
            J'ai compris, continuer
          </button>
        </div>
      </div>
    </div>
  );
};

const Retrait = () => {
  const navigate = useNavigate();
  const { showError, showSuccess: showSuccessPopup } = useActionPopup();
  const [showFeePopup, setShowFeePopup] = useState(true);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [depositNotWithdrawable, setDepositNotWithdrawable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [presetAmounts, setPresetAmounts] = useState<number[]>([1000, 5000, 10000, 20000, 50000]);
  const [minAmount, setMinAmount] = useState(800);
  const [maxAmount, setMaxAmount] = useState(500000);
  const [processingFeePercent, setProcessingFeePercent] = useState(35);
  const [feePercent, setFeePercent] = useState(10);
  const [rules, setRules] = useState<string[]>([]);
  const [maxWithdrawalsPerDay, setMaxWithdrawalsPerDay] = useState(1);
  const [maxWithdrawalsEnabled, setMaxWithdrawalsEnabled] = useState(true);
  const [todayWithdrawals, setTodayWithdrawals] = useState(0);
  const [withdrawalEnabled, setWithdrawalEnabled] = useState(true);
  const [withdrawalDays, setWithdrawalDays] = useState<number[]>([1,2,3,4,5,6,7]);
  const [withdrawalHourStart, setWithdrawalHourStart] = useState(0);
  const [withdrawalHourEnd, setWithdrawalHourEnd] = useState(24);
  const [isWithinSchedule, setIsWithinSchedule] = useState(true);
  const [scheduleMessage, setScheduleMessage] = useState("");

  // Fee payment state
  const [feePayment, setFeePayment] = useState<FeePayment | null>(null);
  const [feeUnlocked, setFeeUnlocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feeProofUrl, setFeeProofUrl] = useState<string | null>(null);
  const [submittingFee, setSubmittingFee] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [walletsRes, profileRes, settingsRes, todayRes, feeRes] = await Promise.all([
        supabase.from("user_wallets").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("balance, deposit_balance, earnings_balance, referral_balance").eq("user_id", user.id).single(),
        supabase.from("site_settings").select("key, value").in("key", [
          "deposit_not_withdrawable", "withdrawal_amounts", "withdrawal_min",
          "withdrawal_max", "withdrawal_fee_percent", "withdrawal_rules",
          "max_withdrawals_per_day", "max_withdrawals_enabled",
          "withdrawal_enabled", "withdrawal_days", "withdrawal_hour_start", "withdrawal_hour_end",
          "withdrawal_processing_fee_percent"
        ]),
        supabase.from("withdrawals").select("id").eq("user_id", user.id).gte("created_at", todayStart.toISOString()),
        // Check for existing fee payment (latest one)
        supabase.from("withdrawal_fee_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);

      // Check fee payment status
      if (feeRes.data && feeRes.data.length > 0) {
        const latest = feeRes.data[0] as any;
        setFeePayment(latest);
        setFeeUnlocked(latest.status === "approved");
      } else {
        setFeePayment(null);
        setFeeUnlocked(false);
      }

      let dnw = true;
      let wEnabled = true;
      let wDays = [1,2,3,4,5,6,7];
      let wHourStart = 0;
      let wHourEnd = 24;
      if (settingsRes.data) {
        settingsRes.data.forEach(s => {
          if (s.key === "deposit_not_withdrawable") dnw = s.value === "true";
          if (s.key === "withdrawal_amounts" && s.value) setPresetAmounts(s.value.split(",").map(Number).filter(Boolean));
          if (s.key === "withdrawal_min" && s.value) setMinAmount(Number(s.value));
          if (s.key === "withdrawal_max" && s.value) setMaxAmount(Number(s.value));
          if (s.key === "withdrawal_fee_percent" && s.value) setFeePercent(Number(s.value));
          if (s.key === "max_withdrawals_per_day" && s.value) setMaxWithdrawalsPerDay(Number(s.value));
          if (s.key === "max_withdrawals_enabled") setMaxWithdrawalsEnabled(s.value !== "false");
          if (s.key === "withdrawal_enabled") wEnabled = s.value !== "false";
          if (s.key === "withdrawal_days" && s.value) wDays = s.value.split(",").map(Number).filter(Boolean);
          if (s.key === "withdrawal_hour_start" && s.value) wHourStart = Number(s.value);
          if (s.key === "withdrawal_hour_end" && s.value) wHourEnd = Number(s.value);
          if (s.key === "withdrawal_processing_fee_percent" && s.value) setProcessingFeePercent(Number(s.value));
          if (s.key === "withdrawal_rules" && s.value) {
            const parsed = s.value
              .replace("{min}", String(Number(settingsRes.data?.find(x => x.key === "withdrawal_min")?.value || 800).toLocaleString()))
              .replace("{max}", String(Number(settingsRes.data?.find(x => x.key === "withdrawal_max")?.value || 500000).toLocaleString()))
              .replace("{fee}", settingsRes.data?.find(x => x.key === "withdrawal_fee_percent")?.value || "10");
            setRules(parsed.split("|"));
          }
        });
      }
      setDepositNotWithdrawable(dnw);
      setWithdrawalEnabled(wEnabled);
      setWithdrawalDays(wDays);
      setWithdrawalHourStart(wHourStart);
      setWithdrawalHourEnd(wHourEnd);

      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const currentHour = now.getHours();
      const dayNames = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

      if (!wEnabled) {
        setIsWithinSchedule(false);
        setScheduleMessage("Les retraits sont temporairement désactivés.");
      } else if (!wDays.includes(dayOfWeek)) {
        setIsWithinSchedule(false);
        const allowedDayNames = wDays.map(d => dayNames[d]).join(", ");
        setScheduleMessage(`Les retraits sont disponibles uniquement les jours suivants : ${allowedDayNames}.`);
      } else if (currentHour < wHourStart || currentHour >= wHourEnd) {
        setIsWithinSchedule(false);
        setScheduleMessage(`Les retraits sont disponibles uniquement de ${wHourStart}h00 à ${wHourEnd}h00.`);
      } else {
        setIsWithinSchedule(true);
        setScheduleMessage("");
      }

      if (todayRes.data) setTodayWithdrawals(todayRes.data.length);

      if (profileRes.data) {
        const eb = profileRes.data.earnings_balance || 0;
        const rb = profileRes.data.referral_balance || 0;
        setEarningsBalance(eb);
        setReferralBalance(rb);
        setWithdrawableBalance(dnw ? eb + rb : profileRes.data.balance || 0);
      }
    } catch (err) {
      console.error("Load error:", err);
      showError("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = Number(amount) || 0;
  const feeAmount = Math.round(numAmount * feePercent / 100);
  const netAmount = numAmount - feeAmount;
  const processingFee = Math.round(withdrawableBalance * processingFeePercent / 100);

  // Upload fee proof
  const handleFeeProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop();
      const path = `withdrawal-fee-proofs/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      setFeeProofUrl(urlData.publicUrl);
    } catch {
      showError("Erreur", "Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  // Submit fee payment
  const handleSubmitFee = async () => {
    if (!feeProofUrl) { showError("Erreur", "Téléchargez la preuve de paiement"); return; }
    setSubmittingFee(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("withdrawal_fee_payments").insert({
        user_id: user.id,
        fee_amount: processingFee,
        capital_amount: withdrawableBalance,
        proof_url: feeProofUrl,
        status: "pending",
      });
      if (error) throw error;
      showSuccessPopup("Preuve envoyée", "Votre preuve de paiement a été soumise. Attendez la confirmation de l'administration.");
      setFeeProofUrl(null);
      loadData();
    } catch {
      showError("Erreur", "Impossible de soumettre le paiement");
    } finally {
      setSubmittingFee(false);
    }
  };

  const handleSubmit = async () => {
    if (!feeUnlocked) { showError("Frais non confirmés", "L'administration n'a pas encore confirmé votre paiement des frais de traitement."); return; }
    if (!isWithinSchedule) { showError("Retraits fermés", scheduleMessage); return; }
    if (!selectedWallet) { showError("Erreur", "Selectionnez un portefeuille"); return; }
    if (maxWithdrawalsEnabled && todayWithdrawals >= maxWithdrawalsPerDay) {
      showError("Limite atteinte", "Vous avez atteint le nombre maximum de retraits autorises aujourd'hui.");
      return;
    }
    if (numAmount < minAmount) { showError("Erreur", `Montant minimum : ${minAmount} FCFA`); return; }
    if (numAmount > maxAmount) { showError("Erreur", `Montant maximum : ${maxAmount.toLocaleString()} FCFA`); return; }
    if (numAmount > withdrawableBalance) { showError("Erreur", "Solde retirable insuffisant"); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id, wallet_id: wallet.id, amount: numAmount,
      fee_amount: feeAmount, net_amount: netAmount,
      phone: wallet.phone, country_code: wallet.country_code, network: wallet.network,
      processing_fee_amount: processingFee,
      processing_fee_paid: true,
      processing_fee_proof_url: feePayment?.proof_url || null,
    });

    if (error) {
      showError("Erreur", "Erreur lors de la demande de retrait");
    } else {
      const { data: pointSetting } = await supabase.from("site_settings")
        .select("value").eq("key", "points_per_withdrawal").single();
      const withdrawalPoints = Number(pointSetting?.value) || 0;
      if (withdrawalPoints > 0) {
        const { data: freshProfile } = await supabase.from("profiles")
          .select("gift_points").eq("user_id", user.id).single();
        if (freshProfile) {
          await supabase.from("profiles").update({
            gift_points: ((freshProfile as any).gift_points || 0) + withdrawalPoints,
          }).eq("user_id", user.id);
        }
      }
      setShowSuccess(true);
    }
    setSubmitting(false);
  };

  const canSubmit = !submitting && feeUnlocked && wallets.length > 0 && numAmount >= minAmount && numAmount <= withdrawableBalance && isWithinSchedule;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Determine current step
  const hasPendingFee = feePayment && feePayment.status === "pending";
  const hasRejectedFee = feePayment && feePayment.status === "rejected";
  const showFeeForm = !feeUnlocked; // Show fee form if not unlocked

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Retrait" showBack />

      <ProcessingFeePopup
        open={showFeePopup}
        onAccept={() => setShowFeePopup(false)}
        percent={processingFeePercent}
      />

      <div className="px-4 pt-6 space-y-4">
        {/* Balance */}
        <div className="bg-card rounded-2xl border border-border/30 p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Solde retirable</p>
          <p className="text-3xl font-bold text-foreground">{withdrawableBalance.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
          {depositNotWithdrawable && (
            <div className="flex justify-center gap-3 mt-3">
              <span className="text-[10px] bg-success/10 text-success px-2.5 py-1 rounded-full">Gains: {earningsBalance.toLocaleString("fr-FR")} F</span>
              <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">Parrainage: {referralBalance.toLocaleString("fr-FR")} F</span>
            </div>
          )}
        </div>

        {/* ========== STEP 1: FEE PAYMENT (if not unlocked) ========== */}
        {showFeeForm && (
          <>
            {/* Pending fee - waiting for admin */}
            {hasPendingFee && (
              <div className="bg-card rounded-2xl border-2 border-warning/50 p-5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center">
                    <Loader2 size={32} className="text-warning animate-spin" />
                  </div>
                </div>
                <h3 className="text-center text-foreground font-bold text-base mb-2">⏳ En attente de confirmation</h3>
                <p className="text-center text-xs text-muted-foreground mb-3">
                  Votre preuve de paiement des frais de traitement a été envoyée. L'administration va vérifier et confirmer votre paiement.
                </p>
                <div className="bg-warning/10 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-warning">{feePayment!.fee_amount.toLocaleString("fr-FR")} FCFA</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Frais soumis le {new Date(feePayment!.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                {feePayment!.proof_url && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border/30">
                    <img src={feePayment!.proof_url} alt="Preuve" className="w-full h-32 object-cover" />
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-3">
                  <Lock size={14} className="text-primary" />
                  <p className="text-xs text-primary font-semibold">Le formulaire de retrait sera débloqué après confirmation</p>
                </div>
              </div>
            )}

            {/* Rejected fee */}
            {hasRejectedFee && (
              <div className="bg-card rounded-2xl border-2 border-destructive/50 p-5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                    <X size={32} className="text-destructive" />
                  </div>
                </div>
                <h3 className="text-center text-foreground font-bold text-base mb-2">❌ Paiement refusé</h3>
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Votre preuve de paiement a été refusée par l'administration.
                </p>
                {feePayment!.admin_note && (
                  <div className="bg-destructive/10 rounded-xl p-3 mb-3">
                    <p className="text-xs text-destructive font-medium">Raison : {feePayment!.admin_note}</p>
                  </div>
                )}
                <p className="text-center text-xs text-muted-foreground">Veuillez soumettre une nouvelle preuve ci-dessous.</p>
              </div>
            )}

            {/* Fee upload form (show if no pending payment or if rejected) */}
            {(!hasPendingFee) && (
              <div className="bg-card rounded-2xl border-2 border-warning/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={18} className="text-warning" />
                  <h3 className="text-foreground font-bold text-sm">⚠️ ÉTAPE 1 : Paiement des frais de traitement</h3>
                </div>

                <div className="bg-warning/10 rounded-xl p-4 mb-4 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Frais de traitement ({processingFeePercent}% de votre capital)</p>
                  <p className="text-2xl font-bold text-warning">{processingFee.toLocaleString("fr-FR")} FCFA</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Capital : {withdrawableBalance.toLocaleString("fr-FR")} FCFA × {processingFeePercent}%
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Payez <span className="font-bold text-warning">{processingFee.toLocaleString("fr-FR")} FCFA</span> via Mobile Money, puis téléchargez la capture d'écran de votre paiement. <span className="font-bold text-destructive">L'administration confirmera votre paiement avant de débloquer le retrait.</span>
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFeeProofUpload}
                  className="hidden"
                />

                {feeProofUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-success/10 text-success rounded-xl px-3 py-2.5">
                      <CheckCircle2 size={16} />
                      <p className="text-xs font-bold">Preuve téléchargée ✓</p>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-border/30">
                      <img src={feeProofUrl} alt="Preuve" className="w-full h-32 object-cover" />
                      <button
                        onClick={() => { setFeeProofUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <button
                      onClick={handleSubmitFee}
                      disabled={submittingFee}
                      className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingFee ? (
                        <><Loader2 size={16} className="animate-spin" />Envoi en cours...</>
                      ) : (
                        <><Upload size={16} />Soumettre la preuve de paiement</>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 text-warning font-bold text-xs flex items-center justify-center gap-2 hover:bg-warning/10 transition-all"
                  >
                    {uploading ? (
                      <><Loader2 size={16} className="animate-spin" />Téléchargement...</>
                    ) : (
                      <><Upload size={18} />Télécharger la preuve de paiement</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Locked withdrawal form message */}
            <div className="bg-card rounded-2xl border border-border/30 p-5 opacity-50">
              <div className="flex items-center justify-center gap-3 py-6">
                <Lock size={24} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Formulaire de retrait verrouillé</p>
                  <p className="text-[10px] text-muted-foreground">Payez les frais et attendez la confirmation pour débloquer</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========== STEP 2: WITHDRAWAL FORM (only if fee is approved) ========== */}
        {feeUnlocked && (
          <>
            {/* Fee confirmed banner */}
            <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-success">✅ Frais de traitement confirmés</p>
                <p className="text-[10px] text-muted-foreground">Vous pouvez maintenant effectuer votre retrait</p>
              </div>
            </div>

            {/* Schedule info */}
            <div className="bg-card rounded-2xl border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-primary" />
                <label className="text-xs font-semibold text-foreground">Horaires de retrait</label>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Heures : <span className="font-semibold text-foreground">{withdrawalHourStart}h00 – {withdrawalHourEnd}h00</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Jours : <span className="font-semibold text-foreground">
                    {withdrawalDays.length === 7 ? "Lundi à Dimanche" : withdrawalDays.map(d => ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][d]).join(", ")}
                  </span>
                </p>
              </div>
              {!isWithinSchedule && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 mt-3">
                  <AlertTriangle size={14} />
                  <p className="text-xs font-medium">{scheduleMessage}</p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="bg-card rounded-2xl border border-border/30 p-4">
              <label className="text-xs text-muted-foreground mb-2 block">Montant du retrait (FCFA)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min. ${minAmount.toLocaleString()}`}
                className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
              />

              <div className="grid grid-cols-3 gap-2 mt-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(String(preset))}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      amount === String(preset)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/60 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>

              {numAmount > 0 && (
                <div className="mt-3 space-y-1.5 pt-3 border-t border-border/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Montant demandé</span>
                    <span className="text-foreground font-semibold">{numAmount.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Frais ({feePercent}%)</span>
                    <span className="text-destructive font-semibold">- {feeAmount.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-foreground font-bold">Vous recevrez</span>
                    <span className="text-success font-bold">{netAmount.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Select wallet */}
            <div className="bg-card rounded-2xl border border-border/30 p-4">
              <label className="text-xs text-muted-foreground mb-2 block">Portefeuille de retrait</label>
              {wallets.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground mb-3">Aucun portefeuille enregistré</p>
                  <button onClick={() => navigate("/lier-carte")} className="gradient-button text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl">
                    Ajouter un portefeuille
                  </button>
                </div>
              ) : (
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
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

            {/* Rules */}
            {rules.length > 0 && (
              <div className="bg-card rounded-2xl border border-border/30 p-4">
                <label className="text-xs text-muted-foreground mb-2 block">Règles de retrait</label>
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

            {numAmount > withdrawableBalance && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3">
                <AlertTriangle size={16} />
                <p className="text-xs font-medium">Solde retirable insuffisant</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowUpRight size={16} />
              {submitting ? "Envoi en cours..." : !isWithinSchedule ? "Retraits fermés" : "Lancer le retrait"}
            </button>
          </>
        )}

        <PremiumModal
          triggerKey="withdrawal_sent"
          open={showSuccess}
          onClose={() => { setShowSuccess(false); navigate("/portefeuille"); }}
        />
      </div>
    </div>
  );
};

export default Retrait;
