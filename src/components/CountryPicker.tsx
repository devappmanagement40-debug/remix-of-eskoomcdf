import { useState } from "react";
import { X } from "lucide-react";

export type Country = {
  code: string;
  flag: string;
  name: string;
};

export const countries: Country[] = [
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "+243", flag: "🇨🇩", name: "RD Congo" },
];

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  /** Compact trigger style for inline use */
  triggerClassName?: string;
}

const CountryPicker = ({ value, onChange, triggerClassName }: CountryPickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = countries.find((c) => c.code === value) || countries[0];

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName || "flex items-center gap-1 text-primary font-semibold text-sm whitespace-nowrap"}
      >
        {selected.flag} {selected.code} ▲
      </button>

      {/* Backdrop + Bottom Sheet */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div
            className="relative w-full max-w-lg rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{
              background: "linear-gradient(135deg, hsl(174 72% 45%), hsl(220 25% 12%) 40%)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-foreground">Sélectionnez le code</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>

            {/* Gradient divider */}
            <div className="h-[2px] w-full" style={{
              background: "linear-gradient(90deg, hsl(174 72% 50%), hsl(270 60% 55%))",
            }} />

            {/* Country list */}
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {countries.map((c) => {
                const isSelected = c.code === value;
                return (
                  <button
                    key={c.code}
                    onClick={() => { onChange(c.code); setOpen(false); }}
                    className="w-full flex items-center justify-center py-4 transition-colors hover:bg-secondary/30"
                  >
                    <span className={`text-base font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {c.code.replace("+", "")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom safe area */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
};

export default CountryPicker;
