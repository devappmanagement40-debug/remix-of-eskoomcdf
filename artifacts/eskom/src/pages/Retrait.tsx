import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, ArrowUpRight, Clock } from "lucide-react";
import PremiumModal from "@/components/PremiumModal";

type WalletItem = {
  id: string; phone: string; country_code: string; network: string; label: string | null;
};

function isCryptoWallet(w: WalletItem): boolean {
  return !!w.country_code && !/^\+?\d+$/.test(w.country_code);
}

function formatWalletOption(w: WalletItem): string {
  if (isCryptoWallet(w)) {
    const addr = w.phone;
    const truncated = addr.length > 14 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr;
    return `${w.network} — ${truncated}`;
  }
  return `${w.network} — ${w.country_code} ****${w.phone.slice(-4)}`;
}

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
    const token = getAuthToken();
    if (!token) { navigate("/connexion"); return; }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [walletsRes, profileRes, settingsRes, todayRes] = await Promise.all([
        fetch("/api/user-wallets/my", { headers }).then(r => r.ok ? r.json() : []),
        fetch("/api/profiles/me", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/site-settings").then(r => r.ok ? r.json() : []),
        fetch("/api/payments/withdrawals/my?since=today", { headers }).then(r => r.ok ? r.json() : []),
      ]);

      if (Array.isArray(walletsRes)) setWallets(walletsRes.map((w: any) => ({
        id: w.id, phone: w.phone, country_code: w.countryCode ?? w.country_code, network: w.network, label: w.label,
      })));

      const settingsArr: any[] = Array.isArray(settingsRes) ? settingsRes : [];
      let dnw = true;
      let wEnabled = true;
      let wDays = [1,2,3,4,5,6,7];
      let wHourStart = 0;
      let wHourEnd = 24;
      let wMin = 800, wMax = 500000, wFee = 10;

      settingsArr.forEach((s: any) => {
        const key = s.key;
        const value = s.value;
        if (key === "deposit_not_withdrawable") dnw = value === "true";
        if (key === "withdrawal_amounts" && value) setPresetAmounts(value.split(",").map(Number).filter(Boolean));
        if (key === "withdrawal_min" && value) { wMin = Number(value); setMinAmount(Number(value)); }
        if (key === "withdrawal_max" && value) { wMax = Number(value); setMaxAmount(Number(value)); }
        if (key === "withdrawal_fee_percent" && value) { wFee = Number(value); setFeePercent(Number(value)); }
        if (key === "max_withdrawals_per_day" && value) setMaxWithdrawalsPerDay(Number(value));
        if (key === "max_withdrawals_enabled") setMaxWithdrawalsEnabled(value !== "false");
        if (key === "withdrawal_enabled") wEnabled = value !== "false";
        if (key === "withdrawal_days" && value) wDays = value.split(",").map(Number).filter(Boolean);
        if (key === "withdrawal_hour_start" && value) wHourStart = Number(value);
        if (key === "withdrawal_hour_end" && value) wHourEnd = Number(value);
        if (key === "withdrawal_rules" && value) {
          const parsed = value
            .replace("{min}", String(wMin.toLocaleString()))
            .replace("{max}", String(wMax.toLocaleString()))
            .replace("{fee}", String(wFee));
          setRules(parsed.split("|"));
        }
      });

      setDepositNotWithdrawable(dnw);
      setWithdrawalEnabled(wEnabled);
      setWithdrawalDays(wDays);
      setWithdrawalHourStart(wHourStart);
      setWithdrawalHourEnd(wHourEnd);

      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const currentHour = now.getHours();
      const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

      if (!wEnabled) {
        setIsWithinSchedule(false);
        setScheduleMessage("Withdrawals are temporarily disabled.");
      } else if (!wDays.includes(dayOfWeek)) {
        setIsWithinSchedule(false);
        setScheduleMessage(`Withdrawals are available only on: ${wDays.map(d => dayNames[d]).join(", ")}.`);
      } else if (currentHour < wHourStart || currentHour >= wHourEnd) {
        setIsWithinSchedule(false);
        setScheduleMessage(`Withdrawals are available only from ${wHourStart}:00 to ${wHourEnd}:00.`);
      } else {
        setIsWithinSchedule(true);
        setScheduleMessage("");
      }

      if (Array.isArray(todayRes)) setTodayWithdrawals(todayRes.length);

      if (profileRes) {
        const eb = profileRes.earningsBalance ?? profileRes.earnings_balance ?? 0;
        const rb = profileRes.referralBalance ?? profileRes.referral_balance ?? 0;
        const bal = profileRes.balance ?? 0;
        setEarningsBalance(eb);
        setReferralBalance(rb);
        setWithdrawableBalance(dnw ? eb + rb : bal);
      }
    } catch (err) {
      console.error("Load error:", err);
      showError("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = Number(amount) || 0;
  const feeAmount = Math.round(numAmount * feePercent / 100);
  const netAmount = numAmount - feeAmount;

  const handleSubmit = async () => {
    if (!isWithinSchedule) { showError("Withdrawals closed", scheduleMessage); return; }
    if (!selectedWallet) { showError("Error", "Select a wallet"); return; }
    if (maxWithdrawalsEnabled && todayWithdrawals >= maxWithdrawalsPerDay) {
      showError("Limit reached", "You have reached the maximum number of withdrawals allowed today.");
      return;
    }
    if (numAmount < minAmount) { showError("Error", `Minimum amount: ${minAmount} USDT`); return; }
    if (numAmount > maxAmount) { showError("Error", `Maximum amount: ${maxAmount.toLocaleString()} USDT`); return; }
    if (numAmount > withdrawableBalance) { showError("Error", "Insufficient withdrawable balance"); return; }

    const token = getAuthToken();
    if (!token) return;

    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          walletId: wallet.id,
          amount: numAmount,
          feeAmount,
          netAmount,
          phone: wallet.phone,
          countryCode: wallet.country_code,
          network: wallet.network,
        }),
      });

      if (res.ok) {
        setShowSuccess(true);
      } else {
        const data = await res.json();
        showError("Error", data.error || "Withdrawal request failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && wallets.length > 0 && numAmount >= minAmount && numAmount <= withdrawableBalance && isWithinSchedule;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Withdraw" showBack />
      <div className="px-4 pt-6 space-y-4">
        <div className="bg-card rounded-2xl border border-border/30 p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Withdrawable balance</p>
          <p className="text-3xl font-bold text-foreground">{withdrawableBalance.toLocaleString("en-US")} <span className="text-sm font-normal text-muted-foreground">USDT</span></p>
          {depositNotWithdrawable && (
            <div className="flex justify-center gap-3 mt-3">
              <span className="text-[10px] bg-success/10 text-success px-2.5 py-1 rounded-full">Earnings: {earningsBalance.toLocaleString("en-US")} USDT</span>
              <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">Referral: {referralBalance.toLocaleString("en-US")} USDT</span>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-primary" />
            <label className="text-xs font-semibold text-foreground">Withdrawal schedule</label>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Hours: <span className="font-semibold text-foreground">{withdrawalHourStart}:00 – {withdrawalHourEnd}:00</span></p>
            <p className="text-xs text-muted-foreground">Days: <span className="font-semibold text-foreground">{withdrawalDays.length === 7 ? "Monday to Sunday" : withdrawalDays.map(d => ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]).join(", ")}</span></p>
          </div>
          {!isWithinSchedule && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 mt-3">
              <AlertTriangle size={14} />
              <p className="text-xs font-medium">{scheduleMessage}</p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Withdrawal amount (USDT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${minAmount.toLocaleString()}`}
            className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {presetAmounts.map((preset) => (
              <button key={preset} onClick={() => setAmount(String(preset))} className={`py-2 rounded-xl text-xs font-bold transition-all ${amount === String(preset) ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}>
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
          {numAmount > 0 && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-border/20">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Requested amount</span><span className="text-foreground font-semibold">{numAmount.toLocaleString("en-US")} USDT</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fees ({feePercent}%)</span><span className="text-destructive font-semibold">- {feeAmount.toLocaleString("en-US")} USDT</span></div>
              <div className="flex justify-between text-sm pt-1"><span className="text-foreground font-bold">You will receive</span><span className="text-success font-bold">{netAmount.toLocaleString("en-US")} USDT</span></div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Withdrawal wallet</label>
          {wallets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-3">No wallet registered</p>
              <button onClick={() => navigate("/lier-carte")} className="gradient-button text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl">Add a wallet</button>
            </div>
          ) : (
            <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)} className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary">
              <option value="">-- Choose --</option>
              {wallets.map((w) => <option key={w.id} value={w.id}>{formatWalletOption(w)}</option>)}
            </select>
          )}
        </div>

        {rules.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/30 p-4">
            <label className="text-xs text-muted-foreground mb-2 block">Withdrawal rules</label>
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
            <p className="text-xs font-medium">Insufficient withdrawable balance</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ArrowUpRight size={16} />
          {submitting ? "Sending..." : !isWithinSchedule ? "Withdrawals closed" : "Submit withdrawal"}
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
