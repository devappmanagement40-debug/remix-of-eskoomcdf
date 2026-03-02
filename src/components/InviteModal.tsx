import { X, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { safeClipboardWrite } from "@/lib/clipboard";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

const InviteModal = ({ open, onClose }: InviteModalProps) => {
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [rules, setRules] = useState<{ text: string }[]>([]);
  const [title, setTitle] = useState("Inviter des amis");
  const [subtitle, setSubtitle] = useState("Gains d'invitation");
  const { showCopy } = useActionPopup();

  useEffect(() => {
    if (!open) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("referral_code").eq("user_id", user.id).single().then(({ data }) => {
          if (data?.referral_code) setReferralCode(data.referral_code);
        });
      }
    });

    // Fetch dynamic referral info from site_settings
    supabase.from("site_settings").select("key, value").eq("category", "referral").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s) => { map[s.key] = s.value || ""; });
        if (map.referral_title) setTitle(map.referral_title);
        if (map.referral_subtitle) setSubtitle(map.referral_subtitle);
        if (map.referral_rules) {
          try {
            const parsed = JSON.parse(map.referral_rules);
            if (Array.isArray(parsed)) setRules(parsed.map((r: string) => ({ text: r })));
          } catch {
            // fallback: split by newline
            setRules(map.referral_rules.split("\n").filter(Boolean).map((t) => ({ text: t })));
          }
        }
      }
    });
  }, [open]);

  if (!open) return null;

  const inviteLink = `${window.location.origin}/inscription?code=${referralCode}`;

  const copyLink = async () => {
    const ok = await safeClipboardWrite(inviteLink);
    if (ok) {
      setCopied(true);
      showCopy("Votre lien d'invitation a été copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Ultime fallback: prompt pour copie manuelle
      window.prompt("Copiez ce lien manuellement :", inviteLink);
    }
  };

  const defaultRules = [
    "Partagez votre lien d'invitation avec des amis pour qu'ils rejoignent et obtiennent bonus d'invitation et gagnez une commission",
    "Gagnez 10% de commission sur vos directs (niveau B)",
    "Supplémentaire 5% de commission sur les parrainages de second niveau (niveau C)",
    "Supplémentaire 1% de commission sur les parrainages de troisième niveau (niveau D)",
  ];

  const displayRules = rules.length > 0 ? rules.map((r) => r.text) : defaultRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">{title}</h2>
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
            <p className="text-sm font-semibold text-primary mb-3 uppercase">{subtitle}</p>
            <ul className="space-y-3">
              {displayRules.map((rule, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
