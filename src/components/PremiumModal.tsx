import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tab = { label: string; content: string };

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
  /** Replace {username} etc in message */
  replacements?: Record<string, string>;
}

const PremiumModal = ({ triggerKey, open, onClose, onConfirm, onCancel, replacements }: PremiumModalProps) => {
  const [data, setData] = useState<PopupMessage | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      supabase
        .from("popup_messages")
        .select("*")
        .eq("trigger_key", triggerKey)
        .eq("is_active", true)
        .single()
        .then(({ data: msg }) => {
          if (msg) {
            setData(msg as unknown as PopupMessage);
            setActiveTab(0);
            // animate in
            requestAnimationFrame(() => setVisible(true));
          }
        });
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
          {/* Tabs if present */}
          {tabs.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeTab === i
                      ? "text-white shadow-lg"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                  style={
                    activeTab === i
                      ? { background: "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))" }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Message */}
          <p className="text-gray-700 text-sm leading-relaxed mb-5">
            {tabs.length > 0 && tabs[activeTab] ? tabs[activeTab].content : message}
          </p>

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
