import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { AlertTriangle, Wallet, ArrowUpRight, Clock } from "lucide-react";
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
  const { showError, showSuccess: showSuccessPopup } = useActionPopup();
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
    try {
      const [walletsData, profileData, settingsData, withdrawalData] = await Promise.all([
        api.get("/wallets/my"),
        api.get("/profiles/me"),
        api.get("/site-settings"),
        api.get("/withdrawals/my"),
      ]);

      if (walletsData) setWallets(walletsData);

      const sArr: any[] = settingsData || [];
      const get = (k: string) => sArr.find((s: any) => s.key === k)?.value;

      let dnw = get("deposit_not_withdrawable") === "true";
      let wEnabled = get("withdrawal_enabled") !== "false";
      const wAmounts = get("withdrawal_amounts");
      const wMin = get("withdrawal_min");
      const wMax = get("withdrawal_max");
      const wFee = get("withdrawal_fee_percent");
      const wMaxPD = get("max_withdrawals_per_day");
      const wMaxEnabled = get("max_withdrawals_enabled") !== "false";
      const wDaysStr = get("withdrawal_days");
      const wHourStartStr = get("withdrawal_hour_start");
      const wHourEndStr = get("withdrawal_hour_end");
      const wRules = get("withdrawal_rules");

      if (wAmounts) setPresetAmounts(wAmounts.split(",").map(Number).filter(Boolean));
      if (wMin) setMinAmount(Number(wMin));
      if (wMax) setMaxAmount(Number(wMax));
      if (wFee) setFeePercent(Number(wFee));
      if (wMaxPD) setMaxWithdrawalsPerDay(Number(wMaxPD));
      setMaxWithdrawalsEnabled(wMaxEnabled);

      let wDays = wDaysStr ? wDaysStr.split(",").map(Number).filter(Boolean) : [1,2,3,4,5,6,7];
      let wHourStart = wHourStartStr ? Number(wHourStartStr) : 0;
      let wHourEnd = wHourEndStr ? Number(wHourEndStr) : 24;

      if (wRules) {
        const parsed = wRules
          .replace("{min}", String(Number(wMin || 800).toLocaleString()))
          .replace("{max}", String(Number(wMax || 500000).toLocaleString()))
          .replace("{fee}", wFee || "10");
        setRules(parsed.split("|"));
      }

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
        setScheduleMessage(`Withdrawals are available only on: ${wDays.map((d: number) => dayNames[d]).join(", ")}.`);
      } else if (currentHour < wHourStart || currentHour >= wHourEnd) {
        setIsWithinSchedule(false);
        setScheduleMessage(`Withdrawals are available only from ${wHourStart}:00 to ${wHourEnd}:00.`);
      } else {
        setIsWithinSchedule(true);
        setScheduleMessage("");
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayWithdrawalsArr = (withdrawalData || []).filter((w: any) => {
        const d = new Date(w.createdAt ?? w.created_at);
        return d >= todayStart;
      });
      setTodayWithdrawals(todayWithdrawalsArr.length);

      if (profileData) {
        const eb = profileData.earningsBalance ?? profileData.earnings_balance ?? 0;
        const rb = profileData.referralBalance ?? profileData.referral_balance ?? 0;
        setEarningsBalance(eb);
        setReferralBalance(rb);
        setWithdrawableBalance(dnw ? eb + rb : (profileData.balance || 0));
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

    setSubmitting(true);
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    try {
      await api.post("/withdrawals", {
        walletId: wallet.id, amount: numAmount,
        feeAmount, netAmount,
        phone: wallet.phone, countryCode: wallet.country_code, network: wallet.network,
      });
      setShowSuccess(true);
    } catch (err: any) {
      showError("Error", err?.message || "Withdrawal request failed");
    }
    setSubmitting(false);
  };

  const canSubmit = !submitting && wallets.length > 0 && numAmount >= minAmount && numAmount <= withdrawableBalance && isWithinSchedule;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Withdraw" showBack />

      <div className="px-4 pt-6 space-y-4">
        {/* Balance */}
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

        {/* Schedule info */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-primary" />
            <label className="text-xs font-semibold text-foreground">Withdrawal schedule</label>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Hours: <span className="font-semibold text-foreground">{withdrawalHourStart}:00 – {withdrawalHourEnd}:00</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Days: <span className="font-semibold text-foreground">
                {withdrawalDays.length === 7 ? "Monday to Sunday" : withdrawalDays.map(d => ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]).join(", ")}
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
                <span className="text-muted-foreground">Requested amount</span>
                <span className="text-foreground font-semibold">{numAmount.toLocaleString("en-US")} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fees ({feePercent}%)</span>
                <span className="text-destructive font-semibold">- {feeAmount.toLocaleString("en-US")} USDT</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-foreground font-bold">You will receive</span>
                <span className="text-success font-bold">{netAmount.toLocaleString("en-US")} USDT</span>
              </div>
            </div>
          )}
        </div>

        {/* Select wallet */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Withdrawal wallet</label>
          {wallets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-3">No wallet registered</p>
              <button onClick={() => navigate("/lier-carte")} className="gradient-button text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl">
                Add a wallet
              </button>
            </div>
          ) : (
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full bg-secondary/50 text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {formatWalletOption(w)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Rules */}
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
