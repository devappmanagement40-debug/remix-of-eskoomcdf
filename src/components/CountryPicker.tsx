import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Country = {
  code: string;
  flag: string;
  name: string;
};

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  triggerClassName?: string;
}

const CountryPicker = ({ value, onChange, triggerClassName }: CountryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("countries")
        .select("country_code, flag_emoji, name")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setCountries(data.map(c => ({
          code: c.country_code,
          flag: c.flag_emoji || "🏳️",
          name: c.name,
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const selected = countries.find((c) => c.code === value) || countries[0] || { code: value, flag: "🏳️", name: "" };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName || "flex items-center gap-1 text-primary font-semibold text-sm whitespace-nowrap"}
      >
        {selected.code} ▼
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full max-w-lg rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{
              background: "linear-gradient(135deg, hsl(174 72% 45%), hsl(220 25% 12%) 40%)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-foreground">Selectionnez le code</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>

            <div className="h-[2px] w-full" style={{
              background: "linear-gradient(90deg, hsl(174 72% 50%), hsl(270 60% 55%))",
            }} />

            <div className="max-h-[50vh] overflow-y-auto py-2">
              {loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
              ) : countries.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucun pays disponible</p>
              ) : (
                countries.map((c) => {
                  const isSelected = c.code === value;
                  return (
                    <button
                      key={c.code}
                      onClick={() => { onChange(c.code); setOpen(false); }}
                      className="w-full flex items-center justify-center gap-3 py-4 transition-colors hover:bg-secondary/30"
                    >
                      <span className={`text-base font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {c.code}
                      </span>
                    </button>
                  );
                })

              )}
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
};

export default CountryPicker;