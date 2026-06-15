import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

type Tab = { label: string; content: string; url?: string };

type PopupMessage = {
  id: string;
  trigger_key: string;
  title: string;
  message: string;
  button_confirm: string;
  button_cancel: string | null;
  tabs: Tab[] | null;
};

interface PremiumModalProps {
  triggerKey: string;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  replacements?: Record<string, string>;
}

const PremiumModal = ({ triggerKey, open, onClose, onConfirm, onCancel, replacements }: PremiumModalProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<PopupMessage | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get(`/popup-messages?triggerKey=${encodeURIComponent(triggerKey)}`),
        api.get("/site-settings"),
      ]).then(([msgs, settings]) => {
        const msg = Array.isArray(msgs) ? msgs[0] : null;
        if (msg) {
          const urlMap: Record<string, string> = {};
          (settings || []).forEach((s: any) => { if (s.value) urlMap[s.key] = s.value; });

          const rawTabs: Tab[] = msg.tabs ? (Array.isArray(msg.tabs) ? (msg.tabs as unknown as Tab[]) : []) : [];
          const enrichedTabs = rawTabs.map((tab) => {
            if (tab.url) return tab;
            const lbl = tab.label.toLowerCase();
            if (lbl.includes("whatsapp") && lbl.includes("group")) return { ...tab, url: urlMap["official_whatsapp_group"] || "" };
            if (lbl.includes("whatsapp")) return { ...tab, url: urlMap["official_whatsapp_link"] || "" };
            if (lbl.includes("groupe")) return { ...tab, url: urlMap["official_whatsapp_group"] || "" };
            return tab;
          });

          setData({ ...(msg as unknown as PopupMessage), tabs: enrichedTabs });
          requestAnimationFrame(() => setVisible(true));
        }
      }).catch(() => {});
      return;
    } else {
      setVisible(false);
      const t = setTimeout(() => setData(null), 300);
      return () => clearTimeout(t);
    }
  }, [open, triggerKey]);

  if (!data && !open) return null;
  if (!data) return null;

  let message = data.message;
  if (replacements) {
    Object.entries(replacements).forEach(([key, val]) => {
      message = message.replace(`{${key}}`, val);
    });
  }

  const tabs: Tab[] = data.tabs ? (Array.isArray(data.tabs) ? data.tabs : []) : [];

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Gradient Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%), hsl(210 70% 50%))",
          }}
        >
          <h3 className="text-white font-bold text-lg">{data.title}</h3>
          <button onClick={handleCancel} className="text-white/80 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-5">
          {/* Message text */}
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-4">
            {message}
          </p>

          {/* Links displayed inline like the reference screenshot */}
          {tabs.length > 0 && (
            <div className="space-y-3 mb-5">
              <p className="text-lg">⬇️⬇️⬇️</p>
              {tabs.map((tab, i) => (
                <div key={i}>
                  {tab.url && (
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold break-all"
                      style={{ color: "hsl(200 80% 50%)" }}
                    >
                      👉 {tab.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {data.button_cancel && (
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))",
                }}
              >
                {data.button_cancel}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))",
              }}
            >
              {data.button_confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
