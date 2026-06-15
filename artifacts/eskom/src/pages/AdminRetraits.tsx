import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import {
  Search, Clock, CheckCircle2, XCircle, ArrowDown, Loader2,
  Zap, Hand, ChevronDown, ChevronUp, DollarSign, Image,
} from "lucide-react";

type Withdrawal = {
  id: string; user_id: string; amount: number; fee_amount: number; net_amount: number;
  phone: string; country_code: string; network: string; status: string; admin_note: string | null;
  created_at: string | null; wallet_id: string | null; processing_fee_amount: number;
  processing_fee_paid: boolean; processing_fee_proof_url: string | null;
};
type FeePayment = {
  id: string; user_id: string; fee_amount: number; capital_amount: number;
  proof_url: string | null; status: string; admin_note: string | null; created_at: string;
};
type ProfileInfo = { full_name: string | null; phone: string | null; balance: number | null };
type WalletInfo = { holder_name: string | null; phone: string; network: string };

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
  const [autoPayingId, setAutoPayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tok = () => getAuthToken() || "";
  const hdrs = () => ({ Authorization: `Bearer ${tok()}` });
  const jsonHdrs = () => ({ ...hdrs(), "Content-Type": "application/json" });

  useEffect(() => {
    checkAdminAndLoad();
    const interval = setInterval(() => { loadData(); loadFeePayments(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAdminAndLoad = async () => {
    const res = await fetch("/api/admin/check", { headers: hdrs() });
    if (!res.ok) { showError("Accès refusé", "Droits admin requis"); navigate("/"); return; }
    loadData();
    loadFeePayments();
  };

  const loadFeePayments = async () => {
    const res = await fetch("/api/payments/fee-payments?admin=true", { headers: hdrs() });
    if (res.ok) {
      const data = await res.json();
      setFeePayments((Array.isArray(data) ? data : []).map((f: any) => ({
        id: f.id, user_id: f.userId ?? f.user_id, fee_amount: Number(f.feeAmount ?? f.fee_amount),
        capital_amount: Number(f.capitalAmount ?? f.capital_amount), proof_url: f.proofUrl ?? f.proof_url,
        status: f.status, admin_note: f.adminNote ?? f.admin_note, created_at: f.createdAt ?? f.created_at,
      })));
      const userIds = [...new Set((Array.isArray(data) ? data : []).map((d: any) => d.userId ?? d.user_id))];
      if (userIds.length > 0) fetchProfiles(userIds as string[]);
    }
  };

  const fetchProfiles = async (userIds: string[]) => {
    const res = await fetch(`/api/profiles/batch?userIds=${userIds.join(",")}`, { headers: hdrs() });
    if (res.ok) {
      const pData = await res.json();
      setProfiles(prev => {
        const map = { ...prev };
        (Array.isArray(pData) ? pData : []).forEach((p: any) => { map[p.userId ?? p.user_id] = { full_name: p.fullName ?? p.full_name, phone: p.phone, balance: p.balance }; });
        return map;
      });
    }
  };

  const loadData = async () => {
    const res = await fetch("/api/payments/withdrawals?admin=true", { headers: hdrs() });
    if (res.ok) {
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: r.id, user_id: r.userId ?? r.user_id, amount: Number(r.amount),
        fee_amount: Number(r.feeAmount ?? r.fee_amount ?? 0), net_amount: Number(r.netAmount ?? r.net_amount ?? 0),
        phone: r.phone, country_code: r.countryCode ?? r.country_code, network: r.network,
        status: r.status, admin_note: r.adminNote ?? r.admin_note,
        created_at: r.createdAt ?? r.created_at, wallet_id: r.walletId ?? r.wallet_id,
        processing_fee_amount: Number(r.processingFeeAmount ?? 0),
        processing_fee_paid: r.processingFeePaid ?? false,
        processing_fee_proof_url: r.processingFeeProofUrl ?? null,
      }));
      setItems(normalized);
      const userIds = [...new Set(normalized.map((r: any) => r.user_id))];
      if (userIds.length > 0) fetchProfiles(userIds as string[]);
      const walletIds = normalized.map((r: any) => r.wallet_id).filter(Boolean) as string[];
      if (walletIds.length > 0) {
        const wRes = await fetch(`/api/user-wallets/batch?ids=${walletIds.join(",")}`, { headers: hdrs() });
        if (wRes.ok) {
          const wData = await wRes.json();
          const wmap: Record<string, WalletInfo> = {};
          (Array.isArray(wData) ? wData : []).forEach((w: any) => { wmap[w.id] = { holder_name: w.holderName ?? w.holder_name, phone: w.phone, network: w.network }; });
          setWallets(wmap);
        }
      }
    }
    setLoading(false);
  };

  const handleAction = async (item: Withdrawal, status: "approved" | "rejected") => {
    const res = await fetch(`/api/payments/withdrawals/${item.id}/status`, {
      method: "PATCH",
      headers: jsonHdrs(),
      body: JSON.stringify({ status, adminNote: status === "approved" ? "✅ Validé manuellement par l'admin" : "❌ Rejeté manuellement par l'admin" }),
    });
    if (!res.ok) { showError("Error", "Update failed"); return; }
    showSuccess(status === "approved" ? "Withdrawal approved" : "Withdrawal rejected", status === "approved" ? "Manually validated ✅" : "Rejected ❌");
    loadData();
  };

  const handleNowPaymentsPayout = async (item: Withdrawal) => {
    setAutoPayingId(item.id);
    try {
      const res = await fetch("/api/nowpayments/payout", { method: "POST", headers: jsonHdrs(), body: JSON.stringify({ withdrawalId: item.id }) });
      const data = await res.json();
      if (data.success) { showSuccess("Payout submitted", `Sent via NowPayments ✅ (ID: ${data.payoutId})`); loadData(); }
      else showError("NowPayments Error", data.error || "Payout failed");
    } catch { showError("Error", "Server connection error"); }
    finally { setAutoPayingId(null); }
  };

  const handleFeeAction = async (fp: FeePayment, status: "approved" | "rejected", note?: string) => {
    const res = await fetch(`/api/payments/fee-payments/${fp.id}/status`, {
      method: "PATCH",
      headers: jsonHdrs(),
      body: JSON.stringify({ status, adminNote: status === "approved" ? "✅ Paiement des frais confirmé" : (note || "❌ Paiement refusé") }),
    });
    if (!res.ok) { showError("Error", "Update failed"); return; }
    showSuccess(status === "approved" ? "Frais confirmés" : "Frais refusés", status === "approved" ? "The user can proceed" : "Payment rejected");
    loadFeePayments();
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

  const filtered = items.filter(r => filter === "all" || r.status === filter).filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const p = profiles[r.user_id];
    return r.phone.toLowerCase().includes(s) || r.id.toLowerCase().includes(s) || r.network.toLowerCase().includes(s) || (p?.full_name?.toLowerCase().includes(s)) || (p?.phone?.toLowerCase().includes(s));
  });
  const filteredFees = feePayments.filter(f => feeFilter === "all" || f.status === feeFilter).filter(f => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const p = profiles[f.user_id];
    return f.id.toLowerCase().includes(s) || (p?.full_name?.toLowerCase().includes(s)) || (p?.phone?.toLowerCase().includes(s));
  });

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin — Retraits" showBack />
      <div className="px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("fees")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "fees" ? "bg-warning text-warning-foreground" : "bg-secondary text-foreground"}`}>
            <DollarSign size={14} />Frais ({feeCounts.pending})
          </button>
          <button onClick={() => setActiveTab("withdrawals")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "withdrawals" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
            <ArrowDown size={14} />Retraits ({counts.pending})
          </button>
        </div>

        {activeTab === "fees" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {(["pending", "approved", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setFeeFilter(s)} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${feeFilter === s ? s === "pending" ? "border-warning" : s === "approved" ? "border-success" : "border-destructive" : "border-secondary"}`}>
                  <span className={`text-xl font-bold ${s === "pending" ? "text-warning" : s === "approved" ? "text-success" : "text-destructive"}`}>{feeCounts[s]}</span>
                  <span className="text-[9px] text-muted-foreground">{s === "pending" ? "En attente" : s === "approved" ? "Confirmés" : "Refusés"}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>
            {filteredFees.length === 0 ? <div className="text-center py-16"><p className="text-sm text-muted-foreground">No fee payments</p></div> :
              filteredFees.map(fp => {
                const profile = profiles[fp.user_id];
                return (
                  <div key={fp.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div><p className="text-sm font-bold text-foreground">{profile?.full_name || "Utilisateur"}</p><p className="text-[10px] text-muted-foreground">{profile?.phone || "—"}</p></div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${fp.status === "approved" ? "bg-success/15 text-success" : fp.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                          {fp.status === "approved" ? "✅ Confirmé" : fp.status === "rejected" ? "❌ Refusé" : "⏳ En attente"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-warning/10 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground">Frais payés</p><p className="text-sm font-bold text-warning">{fp.fee_amount.toLocaleString("en-US")} USDT</p></div>
                        <div className="bg-primary/10 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground">Capital</p><p className="text-sm font-bold text-primary">{fp.capital_amount.toLocaleString("en-US")} USDT</p></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">Soumis le {formatDate(fp.created_at)}</p>
                      {fp.proof_url && (
                        <a href={fp.proof_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
                          <div className="rounded-xl overflow-hidden border border-border/30 relative"><img src={fp.proof_url} alt="Preuve" className="w-full h-40 object-cover" /><div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1"><Image size={10} />Voir en grand</div></div>
                        </a>
                      )}
                      {fp.status === "pending" && (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleFeeAction(fp, "approved")} className="flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm"><CheckCircle2 size={16} />Confirmer</button>
                          <button onClick={() => handleFeeAction(fp, "rejected", "Preuve invalide")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm"><XCircle size={16} />Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </>
        )}

        {activeTab === "withdrawals" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(["pending", "processing", "approved", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`bg-card rounded-xl border p-3 flex flex-col items-center gap-1 ${filter === s ? s === "pending" ? "border-warning" : s === "processing" ? "border-primary" : s === "approved" ? "border-success" : "border-destructive" : "border-secondary"}`}>
                  <span className={`text-xl font-bold ${s === "pending" ? "text-warning" : s === "processing" ? "text-primary" : s === "approved" ? "text-success" : "text-destructive"}`}>{counts[s]}</span>
                  <span className="text-[9px] text-muted-foreground">{s === "pending" ? "En attente" : s === "processing" ? "En cours" : s === "approved" ? "Approuvés" : "Rejetés"}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par adresse, nom…" className="w-full bg-card border border-secondary rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>
            {filtered.length === 0 ? <div className="text-center py-16"><p className="text-sm text-muted-foreground">No withdrawals</p></div> :
              filtered.map(r => {
                const profile = profiles[r.user_id];
                const wallet = r.wallet_id ? wallets[r.wallet_id] : null;
                const feePercent = r.amount > 0 ? Math.round((r.fee_amount / r.amount) * 100) : 0;
                const crypto = isCryptoWithdrawal(r);
                const isExpanded = expandedId === r.id;
                return (
                  <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-lg font-bold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p>
                          <div className="flex items-center gap-1.5 mt-0.5"><ArrowDown size={12} className="text-success" /><span className="text-sm font-semibold text-success">Net: {r.net_amount.toLocaleString("en-US")} USDT</span><span className="text-xs text-muted-foreground">(- {feePercent} %)</span></div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${r.status === "pending" ? "bg-warning/15 text-warning" : r.status === "processing" ? "bg-primary/15 text-primary" : r.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                          {r.status === "pending" ? <Clock size={12} /> : r.status === "processing" ? <Loader2 size={12} className="animate-spin" /> : r.status === "approved" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {r.status === "pending" ? "En attente" : r.status === "processing" ? "En cours" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${crypto ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"}`}>
                          {crypto ? <Zap size={11} /> : <Hand size={11} />}{r.network || r.country_code}
                        </div>
                        {crypto && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">Crypto Auto</span>}
                      </div>
                      {crypto ? (
                        <div className="bg-secondary/40 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
                          <div><p className="text-[10px] text-muted-foreground">Wallet address</p><p className="text-xs font-mono font-semibold text-foreground">{truncateAddress(r.phone)}</p></div>
                          <span className="text-[9px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">{r.country_code.toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="bg-secondary/40 rounded-xl px-3 py-2 mb-3"><p className="text-[10px] text-muted-foreground">Numéro</p><p className="text-xs font-semibold text-foreground">{r.country_code} {r.phone}</p></div>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{isExpanded ? "Masquer les détails" : "Voir les détails"}
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 mb-3 p-3 bg-secondary/30 rounded-xl">
                          <div><p className="text-[10px] text-muted-foreground">Titulaire:</p><p className="text-xs font-semibold text-foreground">{wallet?.holder_name || profile?.full_name || "—"}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Client:</p><p className="text-xs font-semibold text-foreground">{profile?.full_name || "—"}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Requested amount:</p><p className="text-xs font-semibold text-foreground">{r.amount.toLocaleString("en-US")} USDT</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Solde actuel:</p><p className="text-xs font-semibold text-foreground">{profile ? `${(profile.balance || 0).toLocaleString("en-US")} USDT` : "—"}</p></div>
                          {crypto && <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Adresse complète:</p><p className="text-[10px] font-mono text-foreground break-all">{r.phone}</p></div>}
                          <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Date:</p><p className="text-xs font-semibold text-foreground">{formatDate(r.created_at)}</p></div>
                        </div>
                      )}
                      {r.status === "pending" && (
                        <div className="space-y-2 mt-2">
                          {crypto && (
                            <button onClick={() => handleNowPaymentsPayout(r)} disabled={autoPayingId === r.id} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                              {autoPayingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                              {autoPayingId === r.id ? "Processing..." : "Auto Pay (NowPayments)"}
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleAction(r, "approved")} className="flex items-center justify-center gap-2 border-2 border-success text-success font-bold py-2.5 rounded-xl text-sm hover:bg-success/10 transition-colors"><CheckCircle2 size={16} />Approve</button>
                            <button onClick={() => handleAction(r, "rejected")} className="flex items-center justify-center gap-2 border-2 border-destructive text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive/10 transition-colors"><XCircle size={16} />Reject</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRetraits;
