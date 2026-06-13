import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Wallet, Trash2, Plus, Copy, ChevronRight } from "lucide-react";

type WalletRecord = {
  id: string;
  phone: string;
  country_code: string;
  network: string;
  label: string | null;
  holder_name?: string | null;
  created_at: string | null;
};

type NpCurrency = {
  code: string;
  name: string;
  logo: string;
};

type CurrencyMeta = { label: string; network: string; color: string; symbol: string; bg: string; logo: string };

// Local metadata with official logos from /crypto-logos/ (downloaded from official sources)
const CURRENCY_META: Record<string, CurrencyMeta> = {
  usdtbsc:   { label: "USDT BEP20",   network: "BNB Smart Chain (BEP20)", color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdtmatic: { label: "USDT Polygon", network: "Polygon (MATIC)",         color: "#8247E5", symbol: "₮", bg: "rgba(130,71,229,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdterc20: { label: "USDT ERC20",   network: "Ethereum (ERC20)",        color: "#26A17B", symbol: "₮", bg: "rgba(38,161,123,0.15)",  logo: "/crypto-logos/usdt.png" },
  usdttrc20: { label: "USDT TRC20",   network: "TRON (TRC20)",            color: "#EF0027", symbol: "₮", bg: "rgba(239,0,39,0.15)",    logo: "/crypto-logos/usdt.png" },
  trx:       { label: "TRX",          network: "TRON",                    color: "#EF0027", symbol: "◈", bg: "rgba(239,0,39,0.15)",    logo: "/crypto-logos/trx.png"  },
  bnbbsc:    { label: "BNB",          network: "BNB Smart Chain (BEP20)", color: "#F0B90B", symbol: "⬡", bg: "rgba(240,185,11,0.15)",  logo: "/crypto-logos/bnb.png"  },
  eth:       { label: "ETH",          network: "Ethereum",                color: "#627EEA", symbol: "Ξ", bg: "rgba(98,126,234,0.15)",  logo: "/crypto-logos/eth.png"  },
  btc:       { label: "BTC",          network: "Bitcoin",                 color: "#F7931A", symbol: "₿", bg: "rgba(247,147,26,0.15)",  logo: "/crypto-logos/btc.png"  },
  sol:       { label: "SOL",          network: "Solana",                  color: "#9945FF", symbol: "◎", bg: "rgba(153,69,255,0.15)",  logo: "/crypto-logos/sol.png"  },
  ltc:       { label: "LTC",          network: "Litecoin",                color: "#BFBBBB", symbol: "Ł", bg: "rgba(191,187,187,0.15)", logo: "/crypto-logos/ltc.png"  },
  doge:      { label: "DOGE",         network: "Dogecoin",                color: "#C2A633", symbol: "Ð", bg: "rgba(194,166,51,0.15)",  logo: "/crypto-logos/doge.png" },
  xrp:       { label: "XRP",          network: "Ripple",                  color: "#00AAE4", symbol: "✕", bg: "rgba(0,170,228,0.15)",   logo: "/crypto-logos/xrp.png"  },
  ada:       { label: "ADA",          network: "Cardano",                 color: "#0033AD", symbol: "₳", bg: "rgba(0,51,173,0.15)",    logo: "/crypto-logos/ada.png"  },
  matic:     { label: "MATIC",        network: "Polygon",                 color: "#8247E5", symbol: "⬡", bg: "rgba(130,71,229,0.15)",  logo: "/crypto-logos/matic.png"},
  avax:      { label: "AVAX",         network: "Avalanche",               color: "#E84142", symbol: "▲", bg: "rgba(232,65,66,0.15)",   logo: "/crypto-logos/avax.png" },
  usdteosio: { label: "USDT EOS",     network: "EOS",                     color: "#14191E", symbol: "₮", bg: "rgba(20,25,30,0.25)",    logo: "/crypto-logos/usdt.png" },
};

const FALLBACK_CURRENCIES: NpCurrency[] = [
  { code: "usdtbsc",   name: "Tether USD (BEP20)",  logo: "" },
  { code: "usdttrc20", name: "Tether USD (TRC20)",  logo: "" },
  { code: "usdterc20", name: "Tether USD (ERC20)",  logo: "" },
  { code: "usdtmatic", name: "Tether USD (Polygon)",logo: "" },
  { code: "trx",       name: "TRON",                logo: "" },
  { code: "bnbbsc",    name: "Binance Coin (BEP20)", logo: "" },
  { code: "eth",       name: "Ethereum",            logo: "" },
];

const PRIORITY_CODES = ["usdtbsc", "usdttrc20", "usdterc20", "usdtmatic", "trx", "bnbbsc", "eth", "btc"];

function validateAddress(code: string, address: string): boolean {
  const addr = address.trim();
  if (addr.length < 10 || /\s/.test(addr)) return false;
  const c = code.toLowerCase();
  if (["usdterc20", "usdtbsc", "usdtmatic", "eth", "bnbbsc"].includes(c)) {
    return /^0x[0-9a-fA-F]{40}$/.test(addr);
  }
  if (["usdttrc20", "trx"].includes(c)) {
    return /^T[A-Za-z0-9]{33}$/.test(addr);
  }
  return addr.length >= 20;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function isCryptoWallet(w: WalletRecord): boolean {
  return !!w.country_code && !/^\+?\d+$/.test(w.country_code);
}

const LierCarte = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [npCurrencies, setNpCurrencies] = useState<NpCurrency[]>(FALLBACK_CURRENCIES);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState<NpCurrency | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [holderName, setHolderName] = useState("");

  useEffect(() => {
    loadWallets();
  }, []);

  const openForm = () => {
    setShowForm(true);
    setLoadingCurrencies(true);
    fetch("/api/nowpayments/currencies")
      .then((r) => r.json())
      .then((data: { currencies?: NpCurrency[] }) => {
        if (data.currencies && data.currencies.length > 0) {
          const sorted = [...data.currencies].sort((a, b) => {
            const ia = PRIORITY_CODES.indexOf(a.code.toLowerCase());
            const ib = PRIORITY_CODES.indexOf(b.code.toLowerCase());
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.code.localeCompare(b.code);
          });
          setNpCurrencies(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCurrencies(false));
  };

  const loadWallets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/connexion"); return; }
      const { data } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setWallets(data);
    } catch (err) {
      console.error("Wallets load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCurrency) { showError("Error", "Please select a network"); return; }
    if (!walletAddress.trim()) { showError("Error", "Please enter a wallet address"); return; }
    if (!validateAddress(selectedCurrency.code, walletAddress)) {
      const c = selectedCurrency.code.toLowerCase();
      if (["usdterc20", "usdtbsc", "usdtmatic", "eth", "bnbbsc"].includes(c)) {
        showError("Invalid address", "Address must start with 0x and be 42 characters long");
      } else if (["usdttrc20", "trx"].includes(c)) {
        showError("Invalid address", "TRON address must start with T and be 34 characters long");
      } else {
        showError("Invalid address", "Please enter a valid wallet address");
      }
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }

    const meta = CURRENCY_META[selectedCurrency.code.toLowerCase()];
    const networkName = meta?.label ?? selectedCurrency.name;

    const { error } = await supabase.from("user_wallets").insert({
      user_id: user.id,
      phone: walletAddress.trim(),
      country_code: selectedCurrency.code.toLowerCase(),
      network: networkName,
      label: networkName,
      holder_name: holderName.trim() || null,
    });

    if (error) {
      showError("Error", "Failed to save wallet");
    } else {
      showSuccess("Wallet added", "Your crypto wallet has been saved ✅");
      setWalletAddress("");
      setHolderName("");
      setSelectedCurrency(null);
      setShowForm(false);
      loadWallets();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_wallets").delete().eq("id", id);
    if (!error) { showSuccess("Deleted", "Wallet removed"); loadWallets(); }
  };

  const selectedMeta = selectedCurrency
    ? CURRENCY_META[selectedCurrency.code.toLowerCase()]
    : null;

  const CARD_GRADIENTS = [
    "linear-gradient(135deg, hsl(174 72% 42%), hsl(220 25% 14%) 70%)",
    "linear-gradient(135deg, hsl(270 60% 40%), hsl(220 25% 14%) 70%)",
    "linear-gradient(135deg, hsl(30 90% 45%), hsl(220 25% 14%) 70%)",
    "linear-gradient(135deg, hsl(210 80% 40%), hsl(220 25% 14%) 70%)",
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="My Wallets" showBack />
      <div className="px-4 pt-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading...</p>
        ) : (
          <>
            {wallets.length === 0 && !showForm ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                  <Wallet size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-6">No wallet registered</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {wallets.map((w, i) => {
                  const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                  const crypto = isCryptoWallet(w);
                  const meta = CURRENCY_META[w.country_code?.toLowerCase() ?? ""];

                  return (
                    <div
                      key={w.id}
                      className="relative rounded-2xl overflow-hidden border border-primary/20"
                      style={{ background: gradient, minHeight: "148px" }}
                    >
                      <div className="absolute inset-0 opacity-10"
                        style={{ background: "repeating-linear-gradient(120deg, transparent, transparent 40px, rgba(255,255,255,0.07) 40px, rgba(255,255,255,0.07) 42px)" }}
                      />
                      <div className="relative p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.15)", color: meta?.color ?? "#fff" }}
                          >
                            {meta?.symbol ?? "◉"}
                          </div>
                          <button
                            onClick={() => handleDelete(w.id)}
                            className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center"
                          >
                            <Trash2 size={14} className="text-white/70" />
                          </button>
                        </div>
                        {crypto ? (
                          <p className="text-sm font-mono text-white/80 tracking-wide mb-1">
                            {truncateAddress(w.phone)}
                          </p>
                        ) : (
                          <p className="text-sm font-mono text-white/80 tracking-wide mb-1">
                            {w.country_code} **** {w.phone.slice(-4)}
                          </p>
                        )}
                        {(w as WalletRecord).holder_name && (
                          <p className="text-xs text-white/60">{(w as WalletRecord).holder_name}</p>
                        )}
                        <p className="text-xs text-white/50 mt-0.5 font-medium">{w.network}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-secondary p-5 mb-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Add crypto wallet</h3>

            {/* Network selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Network</label>
              <button
                type="button"
                onClick={() => setShowNetworkPicker(true)}
                className="w-full input-glow rounded-xl bg-secondary p-3 flex items-center justify-between text-sm"
              >
                {selectedCurrency && selectedMeta ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: selectedMeta.bg, color: selectedMeta.color }}
                    >
                      {selectedMeta.symbol}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{selectedMeta.label}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedMeta.network}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {loadingCurrencies ? "Loading networks…" : "Select network"}
                  </span>
                )}
                <ChevronRight size={16} className="text-primary flex-shrink-0" />
              </button>
            </div>

            {/* Wallet address */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Wallet address</label>
              <div className="input-glow rounded-xl bg-secondary p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value.trim())}
                  placeholder={
                    selectedCurrency
                      ? ["usdterc20", "usdtbsc", "usdtmatic", "eth", "bnbbsc"].includes(
                          selectedCurrency.code.toLowerCase()
                        )
                        ? "0x..."
                        : ["usdttrc20", "trx"].includes(selectedCurrency.code.toLowerCase())
                        ? "T..."
                        : "Wallet address..."
                      : "Select a network first"
                  }
                  className="flex-1 bg-transparent text-foreground text-sm font-mono outline-none placeholder:text-muted-foreground"
                  disabled={!selectedCurrency}
                />
                {walletAddress && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                    }}
                    className="flex-shrink-0"
                  >
                    <Copy size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>
              {selectedCurrency && walletAddress && !validateAddress(selectedCurrency.code, walletAddress) && (
                <p className="text-[10px] text-destructive mt-1.5 px-1">
                  {["usdterc20", "usdtbsc", "usdtmatic", "eth", "bnbbsc"].includes(selectedCurrency.code.toLowerCase())
                    ? "Must start with 0x — 42 characters"
                    : ["usdttrc20", "trx"].includes(selectedCurrency.code.toLowerCase())
                    ? "Must start with T — 34 characters"
                    : "Invalid address format"}
                </p>
              )}
            </div>

            {/* Holder name (optional) */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Name (optional)</label>
              <div className="input-glow rounded-xl bg-secondary p-3">
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Account holder name"
                  className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => { setShowForm(false); setSelectedCurrency(null); setWalletAddress(""); }}
                className="bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedCurrency || !walletAddress}
                className="gradient-button text-primary-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            onClick={openForm}
            className="w-full gradient-button text-primary-foreground font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Wallet
          </button>
        )}
      </div>

      {/* Network picker bottom sheet */}
      {showNetworkPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNetworkPicker(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ background: "linear-gradient(135deg, hsl(174 72% 45%), hsl(220 25% 12%) 40%)" }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-foreground">Select network</span>
              <button
                onClick={() => setShowNetworkPicker(false)}
                className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center"
              >
                <span className="text-foreground text-sm">✕</span>
              </button>
            </div>
            <div
              className="h-[2px] w-full"
              style={{ background: "linear-gradient(90deg, hsl(174 72% 50%), hsl(270 60% 55%))" }}
            />
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {npCurrencies.map((c) => {
                const meta = CURRENCY_META[c.code.toLowerCase()];
                const label = meta?.label ?? c.name;
                const network = meta?.network ?? c.name;
                const isSelected = selectedCurrency?.code === c.code;

                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      setSelectedCurrency(c);
                      setWalletAddress("");
                      setShowNetworkPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
                      isSelected ? "bg-primary/20" : "hover:bg-secondary/30"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 overflow-hidden"
                      style={{
                        background: meta?.bg ?? "rgba(170,170,170,0.18)",
                        color: meta?.color ?? "#aaa",
                      }}
                    >
                      {(meta?.logo || c.logo) ? (
                        <img
                          src={meta?.logo || c.logo}
                          alt={c.code}
                          className="w-7 h-7 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        meta?.symbol ?? "◉"
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{network}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LierCarte;
