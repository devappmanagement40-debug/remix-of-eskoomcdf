import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, Wallet, ArrowUpRight, Clock, X, ShieldCheck, Upload, CheckCircle2, Image } from "lucide-react";
import PremiumModal from "@/components/PremiumModal";

type WalletItem = {
  id: string; phone: string; country_code: string; network: string; label: string | null;
};

/** Mandatory processing‑fee popup shown once per visit */
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
                🚫 AUCUN RETRAIT ne sera traité sans le paiement préalable des frais de traitement de {percent}%.
              </p>
            </div>
            <p>
              Vous devez <span className="font-bold text-destructive">payer les frais de traitement ({percent}%)</span> et <span className="font-bold">télécharger la preuve de paiement</span> avant de pouvoir soumettre votre demande de retrait.
            </p>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-800 font-medium">📋 Étapes obligatoires :</p>
              <ol className="text-xs text-blue-700 mt-2 space-y-1.5 list-decimal list-inside">
                <li>Entrez le montant de retrait souhaité</li>
                <li>Le système calcule les frais ({percent}%)</li>
                <li><span className="font-bold">Payez les frais et téléchargez la preuve</span></li>
                <li>Le bouton de retrait se débloque</li>
              </ol>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-amber-800">
                ⚠️ Sans preuve de paiement, le bouton « Lancer le retrait » restera <span className="font-bold">bloqué</span>.
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
  const { showError } = useActionPopup();
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

  // Proof upload state
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [walletsRes, profileRes, settingsRes, todayRes] = await Promise.all([
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
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);

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
  const processingFee = Math.round(numAmount * processingFeePercent / 100);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop();
      const path = `withdrawal-proofs/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setProofUrl(urlData.publicUrl);
    } catch {
      showError("Erreur", "Échec du téléchargement de la preuve");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isWithinSchedule) { showError("Retraits fermés", scheduleMessage); return; }
    if (!selectedWallet) { showError("Erreur", "Selectionnez un portefeuille"); return; }
    if (!proofUrl) { showError("Paiement requis", "Vous devez payer les frais de traitement et télécharger la preuve avant de pouvoir retirer."); return; }
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
      processing_fee_proof_url: proofUrl,
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

  const proofRequired = numAmount >= minAmount;
  const canSubmit = !submitting && wallets.length > 0 && numAmount >= minAmount && numAmount <= withdrawableBalance && isWithinSchedule && !!proofUrl;

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
            onChange={(e) => { setAmount(e.target.value); setProofUrl(null); }}
            placeholder={`Min. ${minAmount.toLocaleString()}`}
            className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />

          <div className="grid grid-cols-3 gap-2 mt-3">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => { setAmount(String(preset)); setProofUrl(null); }}
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

        {/* MANDATORY: Processing fee payment + proof upload */}
        {proofRequired && (
          <div className="bg-card rounded-2xl border-2 border-warning/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-warning" />
              <label className="text-xs font-bold text-warning">⚠️ FRAIS DE TRAITEMENT OBLIGATOIRES</label>
            </div>

            <div className="bg-warning/10 rounded-xl p-3 mb-3">
              <p className="text-sm text-foreground font-bold text-center">
                {processingFee.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                ({processingFeePercent}% de {numAmount.toLocaleString("fr-FR")} FCFA)
              </p>
            </div>

            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Payez <span className="font-bold text-warning">{processingFee.toLocaleString("fr-FR")} FCFA</span> via Mobile Money puis téléchargez la capture d'écran de votre paiement ci-dessous. <span className="font-bold text-destructive">Sans cette preuve, votre retrait ne pourra pas être soumis.</span>
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProofUpload}
              className="hidden"
            />

            {proofUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-success/10 text-success rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={16} />
                  <p className="text-xs font-bold">Preuve téléchargée ✓</p>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-border/30">
                  <img src={proofUrl} alt="Preuve" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => { setProofUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 text-warning font-bold text-xs flex items-center justify-center gap-2 hover:bg-warning/10 transition-all"
              >
                {uploading ? (
                  "Téléchargement..."
                ) : (
                  <>
                    <Upload size={16} />
                    Télécharger la preuve de paiement
                  </>
                )}
              </button>
            )}
          </div>
        )}

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

        {/* Blocked message when no proof */}
        {proofRequired && !proofUrl && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3">
            <ShieldCheck size={16} />
            <p className="text-xs font-bold">🔒 Téléchargez la preuve de paiement des frais pour débloquer le retrait</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ArrowUpRight size={16} />
          {submitting ? "Envoi en cours..." : !isWithinSchedule ? "Retraits fermés" : !proofUrl && proofRequired ? "🔒 Paiement des frais requis" : "Lancer le retrait"}
        </button>

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
