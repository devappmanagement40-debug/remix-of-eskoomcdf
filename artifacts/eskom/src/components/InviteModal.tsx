import { X, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { getAuthToken } from "@/integrations/supabase/client";
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
  const [title, setTitle] = useState("Invite Friends");
  const [subtitle, setSubtitle] = useState("Referral Earnings");
  const { showCopy } = useActionPopup();

  useEffect(() => {
    if (!open) return;
    const token = getAuthToken();

    if (token) {
      fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(profile => {
          if (profile?.referralCode ?? profile?.referral_code) {
            setReferralCode(profile.referralCode ?? profile.referral_code);
          }
        }).catch(() => {});
    }

    fetch("/api/site-settings?category=referral")
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const map: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((s: any) => { map[s.key] = s.value || ""; });
        if (map.referral_title) setTitle(map.referral_title);
        if (map.referral_subtitle) setSubtitle(map.referral_subtitle);
        if (map.referral_rules) {
          try {
            const parsed = JSON.parse(map.referral_rules);
            if (Array.isArray(parsed)) setRules(parsed.map((r: string) => ({ text: r })));
          } catch {
            setRules(map.referral_rules.split("\n").filter(Boolean).map((t) => ({ text: t })));
          }
        }
      }).catch(() => {});
  }, [open]);

  if (!open) return null;

  const inviteLink = `${window.location.origin}/inscription?code=${referralCode}`;

  const copyLink = async () => {
    const ok = await safeClipboardWrite(inviteLink);
    if (ok) {
      setCopied(true);
      showCopy("Your invitation link has been copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.prompt("Copy this link manually:", inviteLink);
    }
  };

  const defaultRules = [
    "Share your invitation link with friends so they join and get an invitation bonus — you earn a commission",
    "Earn 10% commission on direct referrals (level E)",
    "Earn an additional 5% commission on second-level referrals (level F)",
    "Earn an additional 1% commission on third-level referrals (level G)",
  ];

  const displayRules = rules.length > 0 ? rules.map((r) => r.text) : defaultRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 pb-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-2 uppercase">Your invitation link</p>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-foreground break-all">{inviteLink}</p>
            </div>
          </div>
          <button onClick={copyLink} className="w-full gradient-button text-foreground font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide transition-opacity hover:opacity-90 flex items-center justify-center gap-2">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied!" : "Copy link"}
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
