import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Country = {
  dialCode: string;
  name: string;
  flag: string;
};

const FLAG_MAP: Record<string, string> = {
  "Afghanistan": "🇦🇫", "Albania": "🇦🇱", "Algeria": "🇩🇿", "Andorra": "🇦🇩",
  "Angola": "🇦🇴", "Argentina": "🇦🇷", "Armenia": "🇦🇲", "Australia": "🇦🇺",
  "Austria": "🇦🇹", "Azerbaijan": "🇦🇿", "Bahrain": "🇧🇭", "Bangladesh": "🇧🇩",
  "Belarus": "🇧🇾", "Belgium": "🇧🇪", "Benin": "🇧🇯", "Bolivia": "🇧🇴",
  "Bosnia": "🇧🇦", "Brazil": "🇧🇷", "Bulgaria": "🇧🇬", "Burkina Faso": "🇧🇫",
  "Burundi": "🇧🇮", "Cambodia": "🇰🇭", "Cameroon": "🇨🇲", "Canada": "🇨🇦",
  "Central African Republic": "🇨🇫", "Chad": "🇹🇩", "Chile": "🇨🇱", "China": "🇨🇳",
  "Colombia": "🇨🇴", "Congo": "🇨🇬", "DR Congo": "🇨🇩", "Costa Rica": "🇨🇷",
  "Croatia": "🇭🇷", "Cuba": "🇨🇺", "Cyprus": "🇨🇾", "Czech Republic": "🇨🇿",
  "Denmark": "🇩🇰", "Djibouti": "🇩🇯", "Dominican Republic": "🇩🇴", "Ecuador": "🇪🇨",
  "Egypt": "🇪🇬", "El Salvador": "🇸🇻", "Equatorial Guinea": "🇬🇶", "Eritrea": "🇪🇷",
  "Estonia": "🇪🇪", "Ethiopia": "🇪🇹", "Finland": "🇫🇮", "France": "🇫🇷",
  "Gabon": "🇬🇦", "Gambia": "🇬🇲", "Georgia": "🇬🇪", "Germany": "🇩🇪",
  "Ghana": "🇬🇭", "Greece": "🇬🇷", "Guatemala": "🇬🇹", "Guinea": "🇬🇳",
  "Guinea-Bissau": "🇬🇼", "Haiti": "🇭🇹", "Honduras": "🇭🇳", "Hungary": "🇭🇺",
  "India": "🇮🇳", "Indonesia": "🇮🇩", "Iran": "🇮🇷", "Iraq": "🇮🇶",
  "Ireland": "🇮🇪", "Israel": "🇮🇱", "Italy": "🇮🇹", "Ivory Coast": "🇨🇮",
  "Jamaica": "🇯🇲", "Japan": "🇯🇵", "Jordan": "🇯🇴", "Kazakhstan": "🇰🇿",
  "Kenya": "🇰🇪", "Kuwait": "🇰🇼", "Kyrgyzstan": "🇰🇬", "Laos": "🇱🇦",
  "Latvia": "🇱🇻", "Lebanon": "🇱🇧", "Lesotho": "🇱🇸", "Liberia": "🇱🇷",
  "Libya": "🇱🇾", "Lithuania": "🇱🇹", "Luxembourg": "🇱🇺", "Madagascar": "🇲🇬",
  "Malawi": "🇲🇼", "Malaysia": "🇲🇾", "Mali": "🇲🇱", "Malta": "🇲🇹",
  "Mauritania": "🇲🇷", "Mauritius": "🇲🇺", "Mexico": "🇲🇽", "Moldova": "🇲🇩",
  "Mongolia": "🇲🇳", "Morocco": "🇲🇦", "Mozambique": "🇲🇿", "Myanmar": "🇲🇲",
  "Namibia": "🇳🇦", "Nepal": "🇳🇵", "Netherlands": "🇳🇱", "New Zealand": "🇳🇿",
  "Nicaragua": "🇳🇮", "Niger": "🇳🇪", "Nigeria": "🇳🇬", "North Korea": "🇰🇵",
  "Norway": "🇳🇴", "Oman": "🇴🇲", "Pakistan": "🇵🇰", "Palestine": "🇵🇸",
  "Panama": "🇵🇦", "Paraguay": "🇵🇾", "Peru": "🇵🇪", "Philippines": "🇵🇭",
  "Poland": "🇵🇱", "Portugal": "🇵🇹", "Qatar": "🇶🇦", "Romania": "🇷🇴",
  "Russia": "🇷🇺", "Rwanda": "🇷🇼", "Saudi Arabia": "🇸🇦", "Senegal": "🇸🇳",
  "Serbia": "🇷🇸", "Sierra Leone": "🇸🇱", "Singapore": "🇸🇬", "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮", "Somalia": "🇸🇴", "South Africa": "🇿🇦", "South Korea": "🇰🇷",
  "South Sudan": "🇸🇸", "Spain": "🇪🇸", "Sri Lanka": "🇱🇰", "Sudan": "🇸🇩",
  "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Syria": "🇸🇾", "Taiwan": "🇹🇼",
  "Tajikistan": "🇹🇯", "Tanzania": "🇹🇿", "Thailand": "🇹🇭", "Togo": "🇹🇬",
  "Tunisia": "🇹🇳", "Turkey": "🇹🇷", "Turkmenistan": "🇹🇲", "Uganda": "🇺🇬",
  "Ukraine": "🇺🇦", "United Arab Emirates": "🇦🇪", "United Kingdom": "🇬🇧",
  "United States": "🇺🇸", "Uruguay": "🇺🇾", "Uzbekistan": "🇺🇿",
  "Venezuela": "🇻🇪", "Vietnam": "🇻🇳", "Yemen": "🇾🇪", "Zambia": "🇿🇲",
  "Zimbabwe": "🇿🇼", "Haiti": "🇭🇹",
};

function getFlag(name: string): string {
  for (const [key, flag] of Object.entries(FLAG_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return flag;
    }
  }
  return "🌍";
}

interface CountryPickerProps {
  value: string;
  onChange: (dialCode: string) => void;
}

const CountryPicker = ({ value, onChange }: CountryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("countries")
          .select("country_code, name")
          .eq("is_active", true)
          .order("sort_order");
        if (!error && data && data.length > 0) {
          setCountries(data.map(c => ({
            dialCode: c.country_code,
            name: c.name,
            flag: getFlag(c.name),
          })));
        }
      } catch (err) {
        console.error("CountryPicker error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }, [countries, search]);

  return (
    <div translate="no" className="notranslate">
      <button
        type="button"
        onClick={() => { setSearch(""); setOpen(true); }}
        className="flex items-center gap-0.5 text-primary font-semibold text-sm whitespace-nowrap"
      >
        <span>{value}</span>
        <span className="text-xs">▼</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            translate="no"
            className="notranslate relative w-full max-w-lg rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 bg-white"
            style={{ maxHeight: "75vh" }}
          >
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(75vh - 70px)" }}>
              {loading ? (
                <p className="text-center text-sm text-gray-400 py-8">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No results</p>
              ) : (
                filtered.map((c, i) => {
                  const isSelected = c.dialCode === value;
                  return (
                    <div key={c.dialCode}>
                      <button
                        type="button"
                        onClick={() => { onChange(c.dialCode); setOpen(false); }}
                        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors active:bg-gray-50"
                      >
                        <span className={`text-sm font-medium ${isSelected ? "text-amber-500" : "text-gray-800"}`}>
                          {c.name} {c.flag} ({c.dialCode})
                        </span>
                        {isSelected && (
                          <span className="text-amber-500 text-lg">✓</span>
                        )}
                      </button>
                      {i < filtered.length - 1 && (
                        <div className="h-px bg-gray-100 mx-4" />
                      )}
                    </div>
                  );
                })
              )}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryPicker;
