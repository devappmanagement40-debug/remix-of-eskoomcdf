import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Zap, Loader2 } from "lucide-react";

export type CryptoCurrency = {
  code: string;
  label: string;
  network: string;
  color: string;
  symbol: string;
  bg: string;
  logoUrl?: string;
};

type CurrencyMeta = { label: string; network: string; color: string; symbol: string; bg: string; logo: string };

// Local metadata: official logos from /crypto-logos/ (downloaded from official sources)
const CURRENCY_META: Record<string, CurrencyMeta> = {
  usdtbsc:    { label: "USDT",  network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdtmatic:  { label: "USDT",  network: "Polygon (MATIC)",         color: "#8247E5", symbol: "₮", bg: "rgba(130,71,229,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdterc20:  { label: "USDT",  network: "Ethereum (ERC20)",        color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdttrc20:  { label: "USDT",  network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.15)",    logo: "/crypto-logos/usdt.png" },
  trx:        { label: "TRX",   network: "TRON",                    color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.15)",    logo: "/crypto-logos/trx.png"  },
  bnbbsc:     { label: "BNB",   network: "BNB Smart Chain (BEP20)", color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.15)",  logo: "/crypto-logos/bnb.png"  },
  eth:        { label: "ETH",   network: "Ethereum",                color: "#627EEA", symbol: "Ξ", bg: "rgba(98,126,234,0.15)",  logo: "/crypto-logos/eth.png"  },
  btc:        { label: "BTC",   network: "Bitcoin",                 color: "#F7931A", symbol: "₿", bg: "rgba(247,147,26,0.15)",  logo: "/crypto-logos/btc.png"  },
  sol:        { label: "SOL",   network: "Solana",                  color: "#9945FF", symbol: "◎", bg: "rgba(153,69,255,0.15)",  logo: "/crypto-logos/sol.png"  },
  ltc:        { label: "LTC",   network: "Litecoin",                color: "#BFBBBB", symbol: "Ł", bg: "rgba(191,187,187,0.15)", logo: "/crypto-logos/ltc.png"  },
  doge:       { label: "DOGE",  network: "Dogecoin",                color: "#C2A633", symbol: "Ð", bg: "rgba(194,166,51,0.15)",  logo: "/crypto-logos/doge.png" },
  xrp:        { label: "XRP",   network: "Ripple",                  color: "#00AAE4", symbol: "✕", bg: "rgba(0,170,228,0.15)",   logo: "/crypto-logos/xrp.png"  },
  ada:        { label: "ADA",   network: "Cardano",                 color: "#0033AD", symbol: "₳", bg: "rgba(0,51,173,0.15)",    logo: "/crypto-logos/ada.png"  },
  matic:      { label: "MATIC", network: "Polygon",                 color: "#8247E5", symbol: "⬡", bg: "rgba(130,71,229,0.15)",  logo: "/crypto-logos/matic.png"},
  avax:       { label: "AVAX",  network: "Avalanche",               color: "#E84142", symbol: "▲", bg: "rgba(232,65,66,0.15)",   logo: "/crypto-logos/avax.png" },
  usdteosio:  { label: "USDT",  network: "EOS",                     color: "#14191E", symbol: "₮", bg: "rgba(20,25,30,0.25)",    logo: "/crypto-logos/usdt.png" },
};

const DEFAULT_META: CurrencyMeta = { label: "", network: "", color: "#aaaaaa", symbol: "◉", bg: "rgba(170,170,170,0.18)", logo: "" };

// Hardcoded fallback if backend unavailable
const FALLBACK_CURRENCIES: CryptoCurrency[] = [
  { code: "usdtbsc",   label: "USDT BEP20", network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)" },
  { code: "usdtmatic", label: "USDT",       network: "Polygon (MATIC)",         color: "#8247E5", symbol: "₮", bg: "rgba(130,71,229,0.18)" },
  { code: "usdterc20", label: "USDT ERC20", network: "Ethereum (ERC20)",        color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)" },
  { code: "usdttrc20", label: "USDT TRC20", network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.18)" },
  { code: "trx",       label: "TRX",        network: "TRON",                    color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.18)" },
  { code: "bnbbsc",    label: "BNB",        network: "BNB Smart Chain",         color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.18)" },
  { code: "eth",       label: "ETH",        network: "Ethereum",                color: "#627EEA", symbol: "Ξ", bg: "rgba(98,126,234,0.18)" },
];

// Priority codes shown first
const PRIORITY_CODES = ["usdtbsc", "usdttrc20", "usdterc20", "usdtmatic", "trx", "bnbbsc", "eth", "btc", "sol"];

export const CRYPTO_CURRENCIES = FALLBACK_CURRENCIES;

const Recharge = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [presetAmounts, setPresetAmounts] = useState<number[]>([10, 20, 50, 100, 200, 500]);
  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(100000);
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>(FALLBACK_CURRENCIES);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

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

    // Load available currencies from NowPayments via our backend
    fetch("/api/nowpayments/currencies")
      .then((r) => r.json())
      .then((data: { currencies?: { code: string; name: string; logo: string }[] }) => {
        if (data.currencies && data.currencies.length > 0) {
          const mapped: CryptoCurrency[] = data.currencies.map((c) => {
            const meta = CURRENCY_META[c.code.toLowerCase()] ?? DEFAULT_META;
            const displayLabel = meta.label || c.name;
            return {
              code: c.code.toLowerCase(),
              label: displayLabel,
              network: meta.network || c.name,
              color: meta.color,
              symbol: meta.symbol,
              bg: meta.bg,
              logoUrl: meta.logo || c.logo || undefined,
            };
          });

          // Sort: priority codes first, then alphabetical
          mapped.sort((a, b) => {
            const ia = PRIORITY_CODES.indexOf(a.code);
            const ib = PRIORITY_CODES.indexOf(b.code);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.code.localeCompare(b.code);
          });

          setCurrencies(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCurrencies(false));
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
      <PageHeader title="Deposit" showBack />

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
              <p className="text-sm font-bold text-primary-foreground">Automatic Crypto Deposit</p>
              <p className="text-[11px] text-primary-foreground/75">
                Instant on-chain confirmation via NowPayments
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <label className="text-xs text-muted-foreground mb-2 block">Amount (USDT)</label>
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
              Amount must be between {minAmount.toLocaleString("en-US")} and{" "}
              {maxAmount.toLocaleString("en-US")} USDT
            </p>
          )}
        </div>

        {/* Currency list */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Select deposit network
            </p>
            {loadingCurrencies && (
              <Loader2 size={14} className="text-muted-foreground animate-spin" />
            )}
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
              Enter a valid amount to select a network
            </p>
          )}
          {!amount && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Enter an amount above to enable selection
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Recharge;
