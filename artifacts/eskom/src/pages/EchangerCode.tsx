import { useState } from "react";
import { useActionPopup } from "@/components/ActionPopupProvider";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/integrations/supabase/client";

const EchangerCode = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useActionPopup();

  const handleConfirm = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { showError("Error", "Please enter a code"); return; }

    const token = getAuthToken();
    if (!token) { showError("Error", "You must be logged in"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/gift-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError("Error", data.error || "An error occurred while redeeming the code");
        return;
      }
      showSuccess("Code redeemed successfully ✅", `You received ${data.pointsAwarded} GE (GE Currency)!`);
      setCode("");
    } catch (err) {
      console.error("Exchange code error:", err);
      showError("Error", "An error occurred while redeeming the code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Redeem Code" showBack />

      <div className="relative bg-card mx-4 mt-4 rounded-2xl overflow-hidden border border-border">
        <div className="flex items-center justify-center py-12">
          <svg width="160" height="180" viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="30" rx="16" ry="35" fill="#4a4a5a" />
            <ellipse cx="100" cy="30" rx="16" ry="35" fill="#4a4a5a" />
            <ellipse cx="60" cy="28" rx="10" ry="26" fill="#5a5a6a" />
            <ellipse cx="100" cy="28" rx="10" ry="26" fill="#5a5a6a" />
            <circle cx="80" cy="75" r="38" fill="#5a5a6a" />
            <text x="62" y="78" fontSize="16" fontWeight="bold" fill="#222" textAnchor="middle">✕</text>
            <text x="98" y="78" fontSize="16" fontWeight="bold" fill="#222" textAnchor="middle">✕</text>
            <path d="M72 88 Q80 95 88 88" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="80" cy="135" rx="35" ry="32" fill="#5a5a6a" />
            <ellipse cx="48" cy="125" rx="10" ry="18" fill="#4a4a5a" transform="rotate(-15 48 125)" />
            <ellipse cx="112" cy="125" rx="10" ry="18" fill="#4a4a5a" transform="rotate(15 112 125)" />
            <circle cx="65" cy="145" r="22" fill="#6a6a7a" stroke="#555" strokeWidth="2" />
            <text x="65" y="152" fontSize="22" fontWeight="bold" fill="#888" textAnchor="middle">P</text>
            <text x="50" cy="100" fontSize="24" fill="#666" textAnchor="middle" y="105">+</text>
          </svg>
        </div>

        <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl mx-3 mb-4 p-5 space-y-4 border border-border">
          <Input
            type="text"
            placeholder="Enter your redemption code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="bg-transparent border border-primary/40 text-foreground placeholder:text-muted-foreground h-12 rounded-lg focus-visible:ring-primary/50 uppercase"
          />
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Confirm"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EchangerCode;
