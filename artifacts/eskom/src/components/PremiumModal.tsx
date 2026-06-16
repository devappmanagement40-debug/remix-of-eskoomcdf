import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  void navigate;
  const [data, setData] = useState<PopupMessage | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`/api/popup-messages?triggerKey=${encodeURIComponent(triggerKey)}`).then(r => r.ok ? r.json() : []),
        fetch("/api/site-settings").then(r => r.ok ? r.json() : []),
      ]).then(([popups, settings]) => {
        const msgs = Array.isArray(popups) ? popups : [];
        const msg = msgs.find((m: any) => (m.triggerKey ?? m.trigger_key) === triggerKey) ?? null;
        if (msg) {
          const urlMap: Record<string, string> = {};
          (Array.isArray(settings) ? settings : []).forEach((s: any) => {
            if (s.value && ["official_whatsapp_link", "official_whatsapp_group", "official_telegram_link", "official_telegram_group"].includes(s.key)) {
              urlMap[s.key] = s.value;
            }
          });

          const rawTabs: Tab[] = msg.tabs ? (Array.isArray(msg.tabs) ? (msg.tabs as Tab[]) : []) : [];
          const enrichedTabs = rawTabs.map((tab) => {
            if (tab.url) return tab;
            const lbl = tab.label.toLowerCase();
            if (lbl.includes("telegram") && lbl.includes("group")) return { ...tab, url: urlMap["official_telegram_group"] || "" };
            if (lbl.includes("telegram")) return { ...tab, url: urlMap["official_telegram_link"] || "" };
            if (lbl.includes("whatsapp") && lbl.includes("group")) return { ...tab, url: urlMap["official_whatsapp_group"] || "" };
            if (lbl.includes("whatsapp")) return { ...tab, url: urlMap["official_whatsapp_link"] || "" };
            if (lbl.includes("groupe")) return { ...tab, url: urlMap["official_whatsapp_group"] || "" };
            return tab;
          });

          const normalized: PopupMessage = {
            id: msg.id,
            trigger_key: msg.triggerKey ?? msg.trigger_key,
            title: msg.title,
            message: msg.message,
            button_confirm: msg.buttonConfirm ?? msg.button_confirm ?? "OK",
            button_cancel: msg.buttonCancel ?? msg.button_cancel ?? null,
            tabs: enrichedTabs,
          };
          setData(normalized);
          requestAnimationFrame(() => setVisible(true));
        }
      });
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
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

        <div className="bg-white px-6 py-5">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-4">
            {message}
          </p>

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
