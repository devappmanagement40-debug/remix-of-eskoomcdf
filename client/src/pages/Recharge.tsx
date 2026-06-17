import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Zap, Loader2 } from "lucide-react";
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

// Correspondance nom/réseau → code NowPayments
function resolveNowPaymentsCode(name: string, network?: string): string | null {
  const n = (name + " " + (network ?? "")).toUpperCase();
  if ((n.includes("USDT") || n.includes("TETHER")) && (n.includes("BEP20") || n.includes("BSC") || n.includes("BNB SMART"))) return "usdtbsc";
  if ((n.includes("USDT") || n.includes("TETHER")) && (n.includes("TRC20") || n.includes("TRON"))) return "usdttrc20";
  if ((n.includes("USDT") || n.includes("TETHER")) && n.includes("ERC20")) return "usdterc20";
  if ((n.includes("USDT") || n.includes("TETHER")) && (n.includes("POLYGON") || n.includes("MATIC"))) return "usdtmatic";
  if (n.includes("TRX") || (n.includes("TRON") && !n.includes("USDT"))) return "trx";
  if (n.includes("BNB") && !n.includes("USDT")) return "bnbbsc";
  if (n.includes("ETH") || n.includes("ETHEREUM")) return "eth";
  if (n.includes("BTC") || n.includes("BITCOIN")) return "btc";
  if (n.includes("SOL") || n.includes("SOLANA")) return "sol";
  if (n.includes("LTC") || n.includes("LITECOIN")) return "ltc";
  return null;
}

const CRYPTO_META: Record<string, Partial<CryptoCurrency>> = {
  usdtbsc:   { network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.18)", logoUrl: "/crypto-logos/usdt.svg" },
  usdttrc20: { network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.18)",  logoUrl: "/crypto-logos/usdt.svg" },
  usdterc20: { network: "Ethereum (ERC20)",         color: "#627EEA", symbol: "₮", bg: "rgba(98,126,234,0.18)", logoUrl: "/crypto-logos/usdt.svg" },
  usdtmatic: { network: "Polygon (MATIC)",          color: "#8247E5", symbol: "₮", bg: "rgba(130,71,229,0.18)", logoUrl: "/crypto-logos/usdt.svg" },
  trx:       { network: "TRON",                     color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.18)",  logoUrl: "/crypto-logos/trx.svg" },
  bnbbsc:    { network: "BNB Smart Chain (BEP20)",  color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.18)", logoUrl: "/crypto-logos/bnb.svg" },
  eth:       { network: "Ethereum",                 color: "#627EEA", symbol: "Ξ", bg: "rgba(98,126,234,0.18)", logoUrl: "/crypto-logos/eth.svg" },
  btc:       { network: "Bitcoin",                  color: "#F7931A", symbol: "₿", bg: "rgba(247,147,26,0.18)", logoUrl: "/crypto-logos/btc.svg" },
  sol:       { network: "Solana",                   color: "#9945FF", symbol: "◎", bg: "rgba(153,69,255,0.18)", logoUrl: "/crypto-logos/sol.svg" },
  ltc:       { network: "Litecoin",                 color: "#BFBBBB", symbol: "Ł", bg: "rgba(191,187,187,0.18)", logoUrl: "/crypto-logos/ltc.svg" },
};

const FALLBACK_CURRENCIES: CryptoCurrency[] = [
  { code: "usdtbsc",   label: "BEP20-USDT", ...CRYPTO_META.usdtbsc   } as CryptoCurrency,
  { code: "usdttrc20", label: "TRC20-USDT", ...CRYPTO_META.usdttrc20 } as CryptoCurrency,
  { code: "trx",       label: "TRX",        ...CRYPTO_META.trx       } as CryptoCurrency,
  { code: "usdtmatic", label: "USDT Polygon", ...CRYPTO_META.usdtmatic } as CryptoCurrency,
];

export const CRYPTO_CURRENCIES = FALLBACK_CURRENCIES;

const Recharge = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [presetAmounts, setPresetAmounts] = useState<number[]>([10, 20, 50, 100, 200, 500]);
  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(100000);
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>(FALLBACK_CURRENCIES);
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const estimateDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Charger les paramètres du site (montants, limites)
    fetch("/api/site-settings")
      .then(r => r.ok ? r.json() : [])
      .then((data: { key: string; value: string }[]) => {
        if (!data) return;
        data.forEach((s) => {
          if (s.key === "deposit_amounts" && s.value)
            setPresetAmounts(s.value.split(",").map(Number).filter(Boolean));
          if (s.key === "deposit_min" && s.value) setMinAmount(Number(s.value));
          if (s.key === "deposit_max" && s.value) setMaxAmount(Number(s.value));
        });
      })
      .catch(() => {});

    // Charger les méthodes de dépôt depuis l'admin
    fetch("/api/payment-methods")
      .then(r => r.ok ? r.json() : [])
      .then((methods: { id: string; name: string; payment_type: string; logo_url?: string; instructions?: string }[]) => {
        if (!methods || methods.length === 0) return;

        const cryptoMethods = methods.filter(m => m.payment_type === "crypto" || m.payment_type === "nowpayments");
        if (cryptoMethods.length === 0) return;

        const mapped: CryptoCurrency[] = [];
        for (const m of cryptoMethods) {
          const code = resolveNowPaymentsCode(m.name);
          if (code) {
            const meta = CRYPTO_META[code] ?? {};
            mapped.push({
              code,
              label: m.name,
              network: meta.network ?? m.name,
              color: meta.color ?? "#26A17B",
              symbol: meta.symbol ?? "₮",
              bg: meta.bg ?? "rgba(38,161,123,0.18)",
              logoUrl: m.logo_url ?? meta.logoUrl,
            });
          }
        }

        if (mapped.length > 0) {
          // Dédupliquer par code
          const seen = new Set<string>();
          const unique = mapped.filter(c => { if (seen.has(c.code)) return false; seen.add(c.code); return true; });
          setCurrencies(unique);
        }
      })
      .catch(() => {});
  }, []);

  // Estimations NowPayments en temps réel
  const fetchEstimates = async (usdAmount: number) => {
    setLoadingEstimates(true);
    const results: Record<string, number | null> = {};
    await Promise.all(
      currencies.map(async (c) => {
        try {
          const res = await fetch(
            `/api/nowpayments/estimate?amount=${usdAmount}&currency_from=usd&currency_to=${c.code}`
          );
          if (res.ok) {
            const data = await res.json();
            results[c.code] = typeof data.estimated_amount === "number" ? data.estimated_amount : null;
          } else {
            results[c.code] = null;
          }
        } catch {
          results[c.code] = null;
        }
      })
    );
    setEstimates(results);
    setLoadingEstimates(false);
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val);
    if (estimateDebounce.current) clearTimeout(estimateDebounce.current);
    if (parsed >= 1) {
      estimateDebounce.current = setTimeout(() => fetchEstimates(parsed), 600);
    } else {
      setEstimates({});
    }
  };

  const handleSelectCurrency = (currency: CryptoCurrency) => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < minAmount || parsed > maxAmount) return;
    navigate("/recharge/paiement", { state: { amount: parsed, currency } });
  };

  const parsedAmount = parseFloat(amount);
  const amountValid = parsedAmount >= minAmount && parsedAmount <= maxAmount;

  const USDT_CODES = new Set(["usdtbsc", "usdttrc20", "usdterc20", "usdtmatic"]);

  const formatEstimate = (code: string): string => {
    const parsed = parseFloat(amount);
    if (USDT_CODES.has(code.toLowerCase()) && parsed >= 1) {
      return `= ${parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const val = estimates[code];
    if (val === null || val === undefined) return "";
    if (val >= 1000) return `≈ ${val.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    if (val >= 1) return `≈ ${val.toFixed(4)}`;
    return `≈ ${val.toFixed(6)}`;
  };

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
            <div className="flex-1">
              <p className="text-sm font-bold text-primary-foreground">{t.recharge.autoCryptoTitle}</p>
              <p className="text-[11px] text-primary-foreground/75">
                {t.recharge.autoCryptoSubtitle}
              </p>
            </div>
            <div className="flex-shrink-0 bg-white/20 rounded-full px-2.5 py-1">
              <p className="text-[10px] font-bold text-primary-foreground whitespace-nowrap">0% frais</p>
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
              onChange={(e) => handleAmountChange(e.target.value)}
              className="bg-transparent text-foreground text-lg font-semibold w-full outline-none placeholder:text-muted-foreground"
            />
            <span className="text-primary font-bold text-sm ml-2 whitespace-nowrap">USDT</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {presetAmounts.map((p) => (
              <button
                key={p}
                onClick={() => handleAmountChange(String(p))}
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
                {c.logoUrl ? (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: c.bg }}
                  >
                    <img
                      src={c.logoUrl}
                      alt={c.code}
                      className="w-7 h-7 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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

                <div className="text-right flex-shrink-0">
                  {amountValid && loadingEstimates && !estimates[c.code] && (
                    <Loader2 size={14} className="text-muted-foreground animate-spin ml-auto" />
                  )}
                  {amountValid && formatEstimate(c.code) && (
                    <p className="text-xs font-bold text-primary">{formatEstimate(c.code)}</p>
                  )}
                  {amountValid && formatEstimate(c.code) && (
                    <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  )}
                </div>

                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 ml-1" />
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
