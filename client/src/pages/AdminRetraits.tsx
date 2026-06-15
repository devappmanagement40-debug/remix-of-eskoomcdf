import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import {
  Search, Clock, CheckCircle2, XCircle, ArrowDown, Loader2,
  Zap, Hand, ChevronDown, ChevronUp, DollarSign, Image,
  Send, ShieldCheck,
} from "lucide-react";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  phone: string;
  country_code: string;
  network: string;
  status: string;
  admin_note: string | null;
  created_at: string | null;
  wallet_id: string | null;
  processing_fee_amount: number;
  processing_fee_paid: boolean;
  processing_fee_proof_url: string | null;
};

type FeePayment = {
  id: string;
  user_id: string;
  fee_amount: number;
  capital_amount: number;
  proof_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type ProfileInfo = {
  full_name: string | null;
  phone: string | null;
  balance: number | null;
};

type WalletInfo = {
  holder_name: string | null;
  phone: string;
  network: string;
};

// Detect if a withdrawal is crypto (country_code is a NowPayments currency code, not a phone prefix)
function isCryptoWithdrawal(w: Withdrawal): boolean {
  return !!w.country_code && !/^\+?\d+$/.test(w.country_code);
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

const AdminRetraits = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [activeTab, setActiveTab] = useState<"withdrawals" | "fees">("fees");
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [wallets, setWallets] = useState<Record<string, WalletInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "approved" | "rejected">("pending");
  const [feeFilter, setFeeFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

  // Per-item action state
  const [autoPayingId, setAutoPayingId] = useState<string | null>(null);
  const [semiAutoId, setSemiAutoId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
    const interval = setInterval(() => { loadData(); loadFeePayments(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const adminCheck = await api.get("/admin/check");
      if (!adminCheck.isAdmin && !adminCheck.isModerator) {
        showError("Accès refusé", "Droits admin requis"); navigate("/"); return;
      }
      loadData();
      loadFeePayments();
    } catch {
      navigate("/connexion");
    }
  };

  const loadFeePayments = async () => {
    try {
      const data = await api.get("/admin/withdrawal-fee-payments");
      if (data) {
        setFeePayments(data as FeePayment[]);
        const map: Record<string, ProfileInfo> = {};
        data.forEach((fp: any) => { if (fp.profile) map[fp.user_id] = fp.profile; });
        setProfiles(prev => ({ ...prev, ...map }));
      }
    } catch {}
  };

  const loadData = async () => {
    try {
      const data = await api.get("/admin/withdrawals");
      if (data) {
        setItems(data);
        const profileMap: Record<string, ProfileInfo> = {};
        const walletMap: Record<string, WalletInfo> = {};
        data.forEach((w: any) => {
          if (w.profile) profileMap[w.user_id] = w.profile;
          if (w.wallet) walletMap[w.wallet_id] = w.wallet;
        });
        setProfiles(prev => ({ ...prev, ...profileMap }));
        setWallets(walletMap);
      }
    } catch {}
    setLoading(false);
  };

  // Manual approve / reject
  const handleAction = async (item: Withdrawal, status: "approved" | "rejected") => {
    try {
      await api.patch(`/admin/withdrawals/${item.id}`, { status });
      showSuccess(
        status === "approved" ? "Withdrawal approved" : "Withdrawal rejected",
        status === "approved" ? "Manually validated ✅" : "Rejected and amount refunded ❌"
      );
      loadData();
    } catch (err: any) {
      showError("Error", err?.message || "Update failed");
    }
  };

  // Automatic NowPayments payout
  const handleNowPaymentsPayout = async (item: Withdrawal) => {
    setAutoPayingId(item.id);
    try {
      const res = await fetch("/api/nowpayments/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: item.id }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Payout submitted", `Withdrawal sent via NowPayments ✅ (ID: ${data.payoutId})`);
        loadData();
      } else {
        showError("NowPayments Error", data.error || "Payout failed");
      }
    } catch {
      showError("Error", "Server connection error");
    } finally {
      setAutoPayingId(null);
    }
  };

  // Semi-automatic: confirm dialog then NowPayments payout
  const handleSemiAutoConfirm = async (item: Withdrawal) => {
    setSemiAutoId(null);
    await handleNowPaymentsPayout(item);
  };

  const handleFeeAction = async (fp: FeePayment, status: "approved" | "rejected", note?: string) => {
    try {
      await api.patch(`/admin/withdrawal-fee-payments/${fp.id}`, { status, note });
      showSuccess(
        status === "approved" ? "Frais confirmés" : "Frais refusés",
        status === "approved" ? "The user can proceed with their withdrawal" : "Payment rejected"
      );
      loadFeePayments();
    } catch (err: any) {
      showError("Error", err?.message || "Update failed");
    }
  };

  const counts = {
    pending: items.filter(r => r.status === "pending").length,
    processing: items.filter(r => r.status === "processing").length,
    approved: items.filter(r => r.status === "approved").length,
    rejected: items.filter(r => r.status === "rejected").length,
  };

  const feeCounts = {
    pending: feePayments.filter(f => f.status === "pending").length,
    approved: feePayments.filter(f => f.status === "approved").length,
    rejected: feePayments.filter(f => f.status === "rejected").length,
  };

  const filtered = items
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const profile = profiles[r.user_id];
      return (
        r.phone.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s) ||
        r.network.toLowerCase().includes(s) ||
        (profile?.full_name?.toLowerCase().includes(s)) ||
        (profile?.phone?.toLowerCase().includes(s))
      );
    });

  const filteredFees = feePayments
    .filter(f => feeFilter === "all" || f.status === feeFilter)
    .filter(f => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const profile = profiles[f.user_id];
      return (
        f.id.toLowerCase().includes(s) ||
        (profile?.full_name?.toLowerCase().includes(s)) ||
        (profile?.phone?.toLowerCase().includes(s))
      );
    });

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin — Retraits" showBack />

      <div className="px-4 pt-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "fees" ? "bg-warning text-warning-foreground" : "bg-secondary text-foreground"}`}
          >
            <DollarSign size={14} />
            Frais ({feeCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "withdrawals" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            <ArrowDown size={14} />
            Retraits ({counts.pending})
          </button>
        </div>

        {/* ====== FEE PAYMENTS TAB ====== */}
        {activeTab === "fees" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {(["pending", "approved", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setFeeFilter(s)}
                  className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${feeFilter === s ? (s === "pending" ? "border-warning" : s === "approved" ? "border-success" : "border-destructive") : "border-secondary"}`}>
                  <span className={`text-xl font-bold ${s === "pending" ? "text-warning" : s === "approved" ? "text-success" : "text-destructive"}`}>{feeCounts[s]}</span>
                  <span className="text-[9px] text-muted-foreground">{s === "pending" ? "En attente" : s === "approved" ? "Confirmés" : "Refusés"}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>

            {filteredFees.length === 0 ? (
              <div className="text-center py-16"><p className="text-sm text-muted-foreground">No fee payments</p></div>
            ) : filteredFees.map(fp => {
              const profile = profiles[fp.user_id];
              return (
                <div key={fp.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{profile?.full_name || "Utilisateur"}</p>
                        <p className="text-[10px] text-muted-foreground">{profile?.phone || "—"}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${fp.status === "approved" ? "bg-success/15 text-success" : fp.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                        {fp.status === "approved" ? "✅ Confirmé" : fp.status === "rejected" ? "❌ Refusé" : "⏳ En attente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-warning/10 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Frais payés</p>
                        <p className="text-sm font-bold text-warning">{fp.fee_amount.toLocaleString("en-US")} USDT</p>
                      </div>
                      <div className="bg-primary/10 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Capital</p>
                        <p className="text-sm font-bold text-primary">{fp.capital_amount.toLocaleString("en-US")} USDT</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mb-2">Soumis le {formatDate(fp.created_at)}</p>

                    {fp.proof_url && (
                      <a href={fp.proof_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
                        <div className="rounded-xl overflow-hidden border border-border/30 relative">
                          <img src={fp.proof_url} alt="Preuve" className="w-full h-40 object-cover" />
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                            <Image size={10} />Voir en grand
                          </div>
                        </div>
                      </a>
                    )}

                    {fp.admin_note && (
                      <div className="bg-muted/50 rounded-lg p-2 mb-3">
                        <p className="text-[10px] text-muted-foreground">{fp.admin_note}</p>
                      </div>
                    )}

                    {fp.status === "pending" && (
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleFeeAction(fp, "approved")} className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm">
                          <CheckCircle2 size={16} />Confirmer
                        </button>
                        <button onClick={() => handleFeeAction(fp, "rejected", "Preuve invalide")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm">
                          <XCircle size={16} />Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ====== WITHDRAWALS TAB ====== */}
        {activeTab === "withdrawals" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(["pending", "processing", "approved", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === s
                    ? s === "pending" ? "border-warning" : s === "processing" ? "border-primary" : s === "approved" ? "border-success" : "border-destructive"
                    : "border-secondary"}`}>
                  <span className={`text-xl font-bold ${s === "pending" ? "text-warning" : s === "processing" ? "text-primary" : s === "approved" ? "text-success" : "text-destructive"}`}>
                    {counts[s]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {s === "pending" ? "En attente" : s === "processing" ? "En cours" : s === "approved" ? "Approuvés" : "Rejetés"}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par adresse, nom…" className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16"><p className="text-sm text-muted-foreground">No withdrawals</p></div>
            ) : filtered.map(r => {
              const profile = profiles[r.user_id];
              const wallet = r.wallet_id ? wallets[r.wallet_id] : null;
              const feePercent = r.amount > 0 ? Math.round((r.fee_amount / r.amount) * 100) : 0;
              const crypto = isCryptoWithdrawal(r);
              const isExpanded = expandedId === r.id;
              const isSemiAutoOpen = semiAutoId === r.id;

              return (
                <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ArrowDown size={12} className="text-success" />
                          <span className="text-sm font-semibold text-success">Net: {r.net_amount.toLocaleString("en-US")} USDT</span>
                          <span className="text-xs text-muted-foreground">(- {feePercent} %)</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${r.status === "pending" ? "bg-warning/15 text-warning" : r.status === "processing" ? "bg-primary/15 text-primary" : r.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                        {r.status === "pending" ? <Clock size={12} /> : r.status === "processing" ? <Loader2 size={12} className="animate-spin" /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {r.status === "pending" ? "En attente" : r.status === "processing" ? "En cours" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                      </div>
                    </div>

                    {/* Network badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${crypto ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"}`}>
                        {crypto ? <Zap size={11} /> : <Hand size={11} />}
                        {r.network || r.country_code}
                      </div>
                      {crypto && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">
                          Crypto Auto
                        </span>
                      )}
                    </div>

                    {/* Wallet address (crypto) or phone (legacy) */}
                    {crypto ? (
                      <div className="bg-secondary/40 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Wallet address</p>
                          <p className="text-xs font-mono font-semibold text-foreground">{truncateAddress(r.phone)}</p>
                        </div>
                        <span className="text-[9px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                          {r.country_code.toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-secondary/40 rounded-xl px-3 py-2 mb-3">
                        <p className="text-[10px] text-muted-foreground">Numéro</p>
                        <p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p>
                      </div>
                    )}

                    {/* Toggle details */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? "Masquer les détails" : "Voir les détails"}
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 mb-3 p-3 bg-secondary/30 rounded-xl">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Titulaire :</p>
                          <p className="text-xs font-semibold text-foreground">{wallet?.holder_name || profile?.full_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Client :</p>
                          <p className="text-xs font-semibold text-foreground">{profile?.full_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Requested amount:</p>
                          <p className="text-xs font-semibold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Solde actuel :</p>
                          <p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p>
                        </div>
                        {crypto && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-muted-foreground">Adresse complète :</p>
                            <p className="text-[10px] font-mono text-foreground break-all">{r.phone}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <p className="text-[10px] text-muted-foreground">Date :</p>
                          <p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p>
                        </div>
                      </div>
                    )}

                    {r.admin_note && (
                      <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-secondary mb-2">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">📋 Note :</p>
                        <p className="text-[11px] text-foreground leading-relaxed break-all">{r.admin_note}</p>
                      </div>
                    )}

                    {/* ---- PENDING ACTIONS ---- */}
                    {r.status === "pending" && (
                      <div className="mt-2 space-y-2">
                        {crypto ? (
                          <>
                            {/* Semi-auto confirmation panel */}
                            {isSemiAutoOpen && (
                              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-bold text-primary">Confirmer le payout crypto</p>
                                <div className="text-[10px] text-muted-foreground space-y-0.5">
                                  <p>Network: <span className="text-foreground font-semibold">{r.network}</span></p>
                                  <p>Net amount: <span className="text-success font-bold">{r.net_amount.toLocaleString("en-US")} USDT</span></p>
                                  <p className="font-mono break-all">Adresse : {r.phone}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <button
                                    onClick={() => setSemiAutoId(null)}
                                    className="py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={() => handleSemiAutoConfirm(r)}
                                    disabled={autoPayingId === r.id}
                                    className="py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {autoPayingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    Confirmer
                                  </button>
                                </div>
                              </div>
                            )}

                            {!isSemiAutoOpen && (
                              <div className="space-y-2">
                                {/* Row 1: Auto + Semi-auto */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleNowPaymentsPayout(r)}
                                    disabled={autoPayingId === r.id}
                                    className="flex items-center justify-center gap-1.5 bg-success text-white font-bold py-2.5 rounded-xl text-xs disabled:opacity-50"
                                  >
                                    {autoPayingId === r.id
                                      ? <><Loader2 size={13} className="animate-spin" />Envoi...</>
                                      : <><Zap size={13} />Auto</>}
                                  </button>
                                  <button
                                    onClick={() => setSemiAutoId(r.id)}
                                    className="flex items-center justify-center gap-1.5 bg-primary/10 border border-primary text-primary font-bold py-2.5 rounded-xl text-xs hover:bg-primary/20"
                                  >
                                    <ShieldCheck size={13} />Semi-auto
                                  </button>
                                </div>
                                {/* Row 2: Manual + Reject */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleAction(r, "approved")}
                                    className="flex items-center justify-center gap-1.5 bg-secondary border border-border text-foreground font-semibold py-2.5 rounded-xl text-xs hover:bg-secondary/80"
                                  >
                                    <Hand size={13} />Manual
                                  </button>
                                  <button
                                    onClick={() => handleAction(r, "rejected")}
                                    className="flex items-center justify-center gap-1.5 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-xs hover:bg-destructive/10"
                                  >
                                    <XCircle size={13} />Rejeter
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm">
                              <CheckCircle2 size={16} />Approve
                            </button>
                            <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10">
                              <XCircle size={16} />Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Processing: force finish/fail */}
                    {r.status === "processing" && (
                      <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2 text-warning text-xs font-semibold mb-2">
                          <Loader2 size={14} className="animate-spin" />
                          Payout crypto en cours…
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-1 bg-success/10 text-success font-semibold py-2 rounded-lg text-[11px] border border-success/20">
                            <CheckCircle2 size={12} />Forcer Succès
                          </button>
                          <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-1 bg-destructive/10 text-destructive font-semibold py-2 rounded-lg text-[11px] border border-destructive/20">
                            <XCircle size={12} />Forcer Échec
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRetraits;
