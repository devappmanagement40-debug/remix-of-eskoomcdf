import { useState, useEffect, useRef } from "react";
import { ArrowDownLeft, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Retrait = {
  id: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  network: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_note: string | null;
  processing_fee_amount: number;
  processing_fee_paid: boolean;
  processing_fee_proof_url: string | null;
};

const DetailRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-secondary/50 last:border-b-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
  </div>
);

const statusLabel = (s: string) => {
  if (s === "approved") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "processing") return "Processing";
  if (s === "rejected") return "Rejected";
  return s;
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { timeZone: "America/Port-au-Prince" }) + " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Port-au-Prince" });
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

const HistoriqueRetraits = () => {
  const [retraits, setRetraits] = useState<Retrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetWithdrawalId, setTargetWithdrawalId] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRetraits(data as Retrait[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("retraits-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUploadProof = (withdrawalId: string) => {
    setTargetWithdrawalId(withdrawalId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetWithdrawalId) return;

    setUploadingId(targetWithdrawalId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/fee-proof-${targetWithdrawalId.slice(0, 8)}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error("Error uploading proof");
        return;
      }

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({ processing_fee_proof_url: urlData.publicUrl })
        .eq("id", targetWithdrawalId);

      if (updateError) {
        toast.error("Error updating record");
        return;
      }

      toast.success("Proof submitted! Awaiting confirmation.");
      load();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setUploadingId(null);
      setTargetWithdrawalId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Withdrawal History" showBack />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading...</p>
        ) : retraits.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <ArrowDownLeft size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No withdrawals yet</p>
          </div>
        ) : (
          retraits.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-secondary overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-secondary to-secondary/60">
                <span className="text-xs font-mono font-semibold text-foreground truncate max-w-[200px]">{r.id.slice(0, 18)}...</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  r.status === "approved" ? "bg-success text-success-foreground" :
                  r.status === "processing" ? "bg-primary text-primary-foreground" :
                  r.status === "rejected" ? "bg-destructive text-destructive-foreground" :
                  "bg-warning text-warning-foreground"
                }`}>{statusLabel(r.status)}</span>
              </div>
              <div className="px-4 pt-2 pb-3">
                <div className="grid grid-cols-2 gap-4 py-3 border-b border-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Withdrawal amount</p>
                    <p className="text-lg font-bold text-foreground">{fmt(r.amount)} <span className="text-xs font-normal text-muted-foreground">USDT</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Amount received</p>
                    <p className="text-lg font-bold text-foreground">{fmt(r.net_amount)} <span className="text-xs font-normal text-muted-foreground">USDT</span></p>
                  </div>
                </div>

                {/* Processing fee section */}
                {r.processing_fee_amount > 0 && (
                  <div className={`my-3 p-3 rounded-lg border ${r.processing_fee_paid ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {r.processing_fee_paid ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : (
                        <AlertTriangle size={14} className="text-warning" />
                      )}
                      <span className={`text-xs font-bold ${r.processing_fee_paid ? "text-success" : "text-warning"}`}>
                        Processing fee: {fmt(r.processing_fee_amount)} USDT
                      </span>
                    </div>
                    {r.processing_fee_paid ? (
                      <p className="text-[10px] text-success">✅ Fee paid — Withdrawal is being processed</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          You must pay <span className="font-bold text-warning">{fmt(r.processing_fee_amount)} USDT</span> to unlock your withdrawal. Send the amount then upload your payment proof below.
                        </p>
                        {r.processing_fee_proof_url ? (
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-primary font-semibold">📄 Proof submitted — Awaiting verification</p>
                            <a href={r.processing_fee_proof_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">View</a>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUploadProof(r.id)}
                            disabled={uploadingId === r.id}
                            className="w-full flex items-center justify-center gap-2 bg-warning text-warning-foreground font-bold py-2.5 rounded-lg text-xs disabled:opacity-50"
                          >
                            <Upload size={14} />
                            {uploadingId === r.id ? "Uploading..." : "Upload payment proof"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <DetailRow label="Fee" value={`${fmt(r.fee_amount)} USDT`} />
                <DetailRow label="Network" value={r.network} />
                <DetailRow label="Number" value={r.phone} />
                <DetailRow label="Request time" value={fmtDate(r.created_at)} />
                <DetailRow label="Status" value={statusLabel(r.status)} highlight />
                {r.admin_note && <DetailRow label="Admin note" value={r.admin_note} />}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoriqueRetraits;
