import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info, Copy } from "lucide-react";

type PopupType = "success" | "error" | "info" | "copy";

interface PopupData {
  type: PopupType;
  title: string;
  message: string;
  buttonText?: string;
}

interface ActionPopupContextType {
  showPopup: (data: PopupData) => void;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  showCopy: (message: string) => void;
}

const ActionPopupContext = createContext<ActionPopupContextType | null>(null);

export const useActionPopup = () => {
  const ctx = useContext(ActionPopupContext);
  if (!ctx) throw new Error("useActionPopup must be used within ActionPopupProvider");
  return ctx;
};

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  copy: Copy,
};

const colorMap = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-cyan-400",
  copy: "text-cyan-400",
};

export const ActionPopupProvider = ({ children }: { children: ReactNode }) => {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);

  const showPopup = useCallback((data: PopupData) => {
    setPopup(data);
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => setPopup(null), 300);
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    showPopup({ type: "success", title, message });
  }, [showPopup]);

  const showError = useCallback((title: string, message: string) => {
    showPopup({ type: "error", title, message });
  }, [showPopup]);

  const showInfo = useCallback((title: string, message: string) => {
    showPopup({ type: "info", title, message });
  }, [showPopup]);

  const showCopy = useCallback((message: string) => {
    showPopup({ type: "copy", title: "Copié !", message });
  }, [showPopup]);

  const Icon = popup ? iconMap[popup.type] : Info;

  return (
    <ActionPopupContext.Provider value={{ showPopup, showSuccess, showError, showInfo, showCopy }}>
      {children}

      {popup && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center px-6 transition-all duration-300 ${
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div
            className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
            }`}
          >
            {/* Gradient Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: popup.type === "error"
                  ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%), hsl(30 70% 50%))"
                  : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%), hsl(210 70% 50%))",
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={22} className="text-white" />
                <h3 className="text-white font-bold text-lg">{popup.title}</h3>
              </div>
              <button onClick={close} className="text-white/80 hover:text-white transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed mb-5">{popup.message}</p>
              <button
                onClick={close}
                className="w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{
                  background: popup.type === "error"
                    ? "linear-gradient(135deg, hsl(0 72% 50%), hsl(15 80% 55%))"
                    : "linear-gradient(135deg, hsl(174 72% 50%), hsl(200 80% 55%))",
                }}
              >
                {popup.buttonText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ActionPopupContext.Provider>
  );
};
