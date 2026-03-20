import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, Wallet, ArrowUpRight, Clock } from "lucide-react";
import PremiumModal from "@/components/PremiumModal";

type WalletItem = {
  id: string; phone: string; country_code: string; network: string; label: string | null;
};

const Retrait = () => {
  const navigate = useNavigate();
  const { showError } = useActionPopup();
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

      // Check schedule
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

  const handleSubmit = async () => {
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

    // Insert withdrawal - trigger auto-debits balance
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id, wallet_id: wallet.id, amount: numAmount,
      fee_amount: feeAmount, net_amount: netAmount,
      phone: wallet.phone, country_code: wallet.country_code, network: wallet.network,
    });

    if (error) {
      showError("Erreur", "Erreur lors de la demande de retrait");
    } else {
      // Grant points for withdrawal
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
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${minAmount.toLocaleString()}`}
            className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />

          {/* Preset amounts */}
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
                <span className="text-muted-foreground">Montant demande</span>
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
              <p className="text-xs text-muted-foreground mb-3">Aucun portefeuille enregistre</p>
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
            <label className="text-xs text-muted-foreground mb-2 block">Regles de retrait</label>
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
          disabled={submitting || wallets.length === 0 || numAmount < minAmount || numAmount > withdrawableBalance || !isWithinSchedule}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ArrowUpRight size={16} />
          {submitting ? "Envoi en cours..." : !isWithinSchedule ? "Retraits fermés" : "Lancer le retrait"}
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
