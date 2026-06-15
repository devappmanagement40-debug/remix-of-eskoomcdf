import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import PremiumModal from "@/components/PremiumModal";
import { Copy, CheckCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { safeClipboardWrite } from "@/lib/clipboard";
import type { CryptoCurrency } from "./Recharge";

type LocationState = {
  amount: number;
  currency: CryptoCurrency;
};

type PaymentInfo = {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expirationDate?: string;
};

// All official NowPayments payment statuses
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting:       { label: "Waiting for payment",       color: "text-warning" },
  confirming:    { label: "Confirming on blockchain",  color: "text-primary" },
  confirmed:     { label: "Confirmed!",                color: "text-success" },
  sending:       { label: "Processing…",               color: "text-primary" },
  partially_paid:{ label: "Partially paid — send rest",color: "text-warning" },
  finished:      { label: "Payment complete!",         color: "text-success" },
  failed:        { label: "Payment failed",            color: "text-destructive" },
  refunded:      { label: "Payment refunded",          color: "text-muted-foreground" },
  expired:       { label: "Payment expired",           color: "text-destructive" },
};

const POLL_INTERVAL = 30_000;

const RechargePaiement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showCopy } = useActionPopup();
  const state = location.state as LocationState | null;

  const [creating, setCreating] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("waiting");
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!state?.amount || !state?.currency) {
      navigate("/recharge");
      return;
    }
    createPayment();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const createPayment = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { navigate("/connexion"); return; }

      const { amount, currency } = state!;

      const rechargeData = await api.post("/payments/recharges", {
        amount,
        paymentMethod: currency.label,
        phone: "",
        countryCode: "",
      });

      if (!rechargeData?.id) {
        setCreateError("Failed to create deposit record. Please try again.");
        return;
      }

      const res = await fetch("/api/nowpayments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          amount,
          currency: currency.code,
          rechargeId: rechargeData.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || "Payment gateway unavailable. Please try again later.");
        return;
      }

      const data = await res.json();
      setPaymentInfo(data);

      if (data.expirationDate) {
        const expiry = new Date(data.expirationDate).getTime();
        timerRef.current = setInterval(() => {
          const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
      }

      // Poll immediately after creation, then every 30s
      setTimeout(() => pollStatus(data.paymentId), 5_000);
      pollRef.current = setInterval(() => {
        pollStatus(data.paymentId);
      }, POLL_INTERVAL);

    } catch {
      setCreateError("Network error. Please check your connection.");
    } finally {
      setCreating(false);
    }
  };

  const pollStatus = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/nowpayments/status/${paymentId}`);
      if (!res.ok) return;
      const { status } = await res.json();
      setPaymentStatus(status);
      if (status === "finished" || status === "confirmed") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setShowSuccess(true);
      }
      if (status === "failed" || status === "expired") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {}
  };

  const copyAddress = async () => {
    if (!paymentInfo?.payAddress) return;
    await safeClipboardWrite(paymentInfo.payAddress);
    showCopy("Address copied");
  };

  const copyAmount = async () => {
    if (!paymentInfo?.payAmount) return;
    await safeClipboardWrite(String(paymentInfo.payAmount));
    showCopy("Amount copied");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!state?.amount || !state?.currency) return null;

  const { amount, currency } = state;
  const statusInfo = STATUS_LABELS[paymentStatus] ?? STATUS_LABELS.waiting;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Crypto Deposit" showBack />

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(174 60% 38%))" }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative px-6 py-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden"
              style={{ background: currency.bg, border: "2px solid rgba(255,255,255,0.25)" }}
            >
              {currency.logoUrl ? (
                <img
                  src={currency.logoUrl}
                  alt={currency.label}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-2xl font-black" style={{ color: currency.color }}>
                  {currency.symbol}
                </span>
              )}
            </div>
            <p className="text-xs text-primary-foreground/70 mb-1">You are depositing</p>
            <p className="text-4xl font-black text-primary-foreground">
              {amount.toLocaleString("en-US")}
              <span className="text-base font-medium ml-1.5 opacity-80">USDT</span>
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
              <span className="text-[11px] font-semibold text-primary-foreground/90">{currency.label}</span>
              <span className="text-[10px] text-primary-foreground/60">• {currency.network}</span>
            </div>
          </div>
        </div>

        {/* Creating payment */}
        {creating && (
          <div className="bg-card rounded-2xl border border-secondary p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 size={32} className="text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Generating payment address…</p>
              <p className="text-xs text-muted-foreground mt-1">This takes a few seconds</p>
            </div>
          </div>
        )}

        {/* Error creating */}
        {!creating && createError && (
          <div className="bg-card rounded-2xl border border-destructive/30 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Unable to create payment</p>
                <p className="text-xs text-muted-foreground mt-1">{createError}</p>
              </div>
            </div>
            <button onClick={createPayment} className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {/* Payment details */}
        {!creating && paymentInfo && (
          <>
            {/* Status pill */}
            <div className="flex items-center justify-between bg-card rounded-2xl border border-secondary px-5 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Payment status</p>
                <p className={`text-sm font-bold mt-0.5 ${statusInfo.color}`}>{statusInfo.label}</p>
              </div>
              {timeLeft !== null && timeLeft > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Expires in</p>
                  <p className={`text-base font-black font-mono ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-card rounded-2xl border border-secondary p-5">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-2xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentInfo.payAddress)}&bgcolor=ffffff&color=000000&qzone=1`}
                    alt="QR Code"
                    className="w-44 h-44 rounded-lg"
                  />
                </div>
              </div>

              {/* Send exact amount */}
              <div className="bg-primary/8 rounded-xl border border-primary/20 px-4 py-3.5 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">Envoyer exactement</p>
                    <p className="text-xl font-black text-primary mt-0.5">
                      {paymentInfo.payAmount} <span className="text-sm font-medium">{paymentInfo.payCurrency.toUpperCase()}</span>
                    </p>
                    <p className="text-[10px] text-success mt-1 font-semibold">✓ Zéro frais ajoutés — vous payez uniquement ce montant</p>
                  </div>
                  <button onClick={copyAmount} className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                    <Copy size={16} className="text-primary" />
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="bg-secondary/50 rounded-xl px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Deposit address</p>
                    <p className="text-xs font-mono text-foreground break-all leading-relaxed">{paymentInfo.payAddress}</p>
                  </div>
                  <button onClick={copyAddress} className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0 mt-4">
                    <Copy size={16} className="text-primary" />
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-2.5">
              <p className="text-xs font-bold text-foreground">How to deposit</p>
              {[
                `Send exactly ${paymentInfo.payAmount} ${paymentInfo.payCurrency.toUpperCase()} to the address above`,
                `Make sure to use the ${currency.network} network`,
                "Your account will be credited automatically after confirmation",
                "Do not close this page — status updates automatically every 30s",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => pollStatus(paymentInfo.paymentId)}
              className="w-full bg-secondary border border-border/30 text-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Check payment status
            </button>
          </>
        )}
      </div>

      <PremiumModal
        triggerKey="recharge_success"
        open={showSuccess}
        onClose={() => { setShowSuccess(false); navigate("/portefeuille"); }}
      />
    </div>
  );
};

export default RechargePaiement;
