import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type CryptoCurrency = {
  code: string;
  label: string;
  network: string;
  color: string;
  symbol: string;
  bg: string;
  logoUrl?: string;
};


// Uniquement ces 4 devises autorisées
const ALLOWED_CURRENCIES: CryptoCurrency[] = [
  { code: "usdtbsc",   label: "BEP20-USDT", network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)", logoUrl: "/crypto-logos/usdt.png" },
  { code: "usdttrc20", label: "TRC20-USDT", network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.18)",    logoUrl: "/crypto-logos/usdt.png" },
  { code: "trx",       label: "TRX",        network: "TRON",                    color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.18)",    logoUrl: "/crypto-logos/trx.png"  },
  { code: "bnbbsc",    label: "BNB",        network: "BNB Smart Chain (BEP20)", color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.18)", logoUrl: "/crypto-logos/bnb.png"  },
];

export const CRYPTO_CURRENCIES = ALLOWED_CURRENCIES;

const Recharge = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [presetAmounts, setPresetAmounts] = useState<number[]>([10, 20, 50, 100, 200, 500]);
  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(100000);
  const currencies = ALLOWED_CURRENCIES;

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["deposit_amounts", "deposit_min", "deposit_max"])
      .then(({ data }) => {
        if (!data) return;
        data.forEach((s) => {
          if (s.key === "deposit_amounts" && s.value)
            setPresetAmounts(s.value.split(",").map(Number).filter(Boolean));
          if (s.key === "deposit_min" && s.value) setMinAmount(Number(s.value));
          if (s.key === "deposit_max" && s.value) setMaxAmount(Number(s.value));
        });
      });

  }, []);

  const handleSelectCurrency = (currency: CryptoCurrency) => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < minAmount || parsed > maxAmount) return;
    navigate("/recharge/paiement", { state: { amount: parsed, currency } });
  };

  const parsedAmount = parseFloat(amount);
  const amountValid = parsedAmount >= minAmount && parsedAmount <= maxAmount;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={t.recharge.title} showBack />

      <div className="px-4 pt-5 space-y-5">
        {/* Banner */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(174 60% 38%))" }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap size={20} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-foreground">{t.recharge.autoCryptoTitle}</p>
              <p className="text-[11px] text-primary-foreground/75">
                {t.recharge.autoCryptoSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">{t.recharge.amountLabel}</label>
          <div className="flex items-center bg-secondary/50 rounded-xl px-4 py-3">
            <input
              type="number"
              placeholder={`Min. ${minAmount.toLocaleString("en-US")}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-foreground text-lg font-semibold w-full outline-none placeholder:text-muted-foreground"
            />
            <span className="text-primary font-bold text-sm ml-2 whitespace-nowrap">USDT</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {presetAmounts.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  amount === String(p)
                    ? "gradient-button text-primary-foreground"
                    : "bg-secondary/60 text-foreground hover:bg-secondary"
                }`}
              >
                {p.toLocaleString("en-US")} USDT
              </button>
            ))}
          </div>

          {amount && !amountValid && (
            <p className="text-xs text-destructive mt-2">
              {t.recharge.amountBetween} {minAmount.toLocaleString("en-US")} {t.recharge.and}{" "}
              {maxAmount.toLocaleString("en-US")} USDT
            </p>
          )}
        </div>

        {/* Currency list */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t.recharge.selectNetwork}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
            {currencies.map((c, idx) => (
              <button
                key={c.code}
                onClick={() => handleSelectCurrency(c)}
                disabled={!amountValid}
                className={`w-full flex items-center gap-4 px-4 py-3.5 transition-all disabled:opacity-40 ${
                  idx < currencies.length - 1 ? "border-b border-border/20" : ""
                } hover:bg-secondary/30 active:bg-secondary/50`}
              >
                {/* Logo or symbol fallback */}
                {c.logoUrl ? (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: c.bg }}
                  >
                    <img
                      src={c.logoUrl}
                      alt={c.code}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-base font-black"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {c.symbol}
                  </div>
                )}

                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.network}</p>
                </div>

                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>

          {!amountValid && amount && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              {t.recharge.enterValidAmount}
            </p>
          )}
          {!amount && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              {t.recharge.enterAmountFirst}
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Recharge;
