import { useState } from "react";
import { useActionPopup } from "@/components/ActionPopupProvider";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const EchangerCode = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError } = useActionPopup();

  const handleConfirm = () => {
    if (!code.trim()) {
      showError("Erreur", "Veuillez saisir un code");
      return;
    }
    setLoading(true);
    // TODO: validate code against backend
    setTimeout(() => {
      showError("Code invalide", "Ce code est invalide ou a déjà été utilisé");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Échanger Code" showBack />

      {/* Mascot area */}
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
            placeholder="Veuillez saisir le code d'échange"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-transparent border border-primary/40 text-foreground placeholder:text-muted-foreground h-12 rounded-lg focus-visible:ring-primary/50"
          />
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Vérification..." : "Confirmer"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EchangerCode;
