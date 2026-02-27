import { X, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

const InviteModal = ({ open, onClose }: InviteModalProps) => {
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const { showCopy } = useActionPopup();

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from("profiles").select("referral_code").eq("user_id", user.id).single().then(({ data }) => {
            if (data?.referral_code) setReferralCode(data.referral_code);
          });
        }
      });
    }
  }, [open]);

  if (!open) return null;

  const inviteLink = `${window.location.origin}/inscription?code=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    showCopy("Votre lien d'invitation a été copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">Inviter des amis</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-2 uppercase">Votre lien d'invitation</p>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-foreground break-all">{inviteLink}</p>
            </div>
          </div>

          <button
            onClick={copyLink}
            className="w-full gradient-button text-foreground font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copié !" : "Copier lien"}
          </button>

          <div>
            <p className="text-sm font-semibold text-primary mb-3 uppercase">Gains d'invitation</p>
            <ul className="space-y-3">
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Partagez votre lien d'invitation avec des amis pour qu'ils rejoignent et obtiennent <span className="text-primary font-medium">bonus d'invitation</span> et gagnez une commission</span>
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Gagnez <span className="text-primary font-medium">10% de commission</span> sur vos directs (niveau B)</span>
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Supplémentaire <span className="text-primary font-medium">5% de commission</span> sur les parrainages de second niveau (niveau C)</span>
              </li>
              <li className="flex gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Supplémentaire <span className="text-primary font-medium">1% de commission</span> sur les parrainages de troisième niveau (niveau D)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
