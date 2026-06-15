import { useState, useMemo } from "react";
import { Search } from "lucide-react";

export type Country = {
  dialCode: string;
  name: string;
  flag: string;
};

const ALL_COUNTRIES: Country[] = [
  { flag: "🇦🇫", name: "Afghanistan", dialCode: "+93" },
  { flag: "🇦🇱", name: "Albania", dialCode: "+355" },
  { flag: "🇩🇿", name: "Algeria", dialCode: "+213" },
  { flag: "🇦🇩", name: "Andorra", dialCode: "+376" },
  { flag: "🇦🇴", name: "Angola", dialCode: "+244" },
  { flag: "🇦🇬", name: "Antigua & Barbuda", dialCode: "+1268" },
  { flag: "🇦🇷", name: "Argentina", dialCode: "+54" },
  { flag: "🇦🇲", name: "Armenia", dialCode: "+374" },
  { flag: "🇦🇺", name: "Australia", dialCode: "+61" },
  { flag: "🇦🇹", name: "Austria", dialCode: "+43" },
  { flag: "🇦🇿", name: "Azerbaijan", dialCode: "+994" },
  { flag: "🇧🇸", name: "Bahamas", dialCode: "+1242" },
  { flag: "🇧🇭", name: "Bahrain", dialCode: "+973" },
  { flag: "🇧🇩", name: "Bangladesh", dialCode: "+880" },
  { flag: "🇧🇧", name: "Barbados", dialCode: "+1246" },
  { flag: "🇧🇾", name: "Belarus", dialCode: "+375" },
  { flag: "🇧🇪", name: "Belgium", dialCode: "+32" },
  { flag: "🇧🇿", name: "Belize", dialCode: "+501" },
  { flag: "🇧🇯", name: "Benin", dialCode: "+229" },
  { flag: "🇧🇹", name: "Bhutan", dialCode: "+975" },
  { flag: "🇧🇴", name: "Bolivia", dialCode: "+591" },
  { flag: "🇧🇦", name: "Bosnia & Herzegovina", dialCode: "+387" },
  { flag: "🇧🇼", name: "Botswana", dialCode: "+267" },
  { flag: "🇧🇷", name: "Brazil", dialCode: "+55" },
  { flag: "🇧🇳", name: "Brunei", dialCode: "+673" },
  { flag: "🇧🇬", name: "Bulgaria", dialCode: "+359" },
  { flag: "🇧🇫", name: "Burkina Faso", dialCode: "+226" },
  { flag: "🇧🇮", name: "Burundi", dialCode: "+257" },
  { flag: "🇨🇻", name: "Cape Verde", dialCode: "+238" },
  { flag: "🇰🇭", name: "Cambodia", dialCode: "+855" },
  { flag: "🇨🇲", name: "Cameroon", dialCode: "+237" },
  { flag: "🇨🇦", name: "Canada", dialCode: "+1" },
  { flag: "🇨🇫", name: "Central African Republic", dialCode: "+236" },
  { flag: "🇹🇩", name: "Chad", dialCode: "+235" },
  { flag: "🇨🇱", name: "Chile", dialCode: "+56" },
  { flag: "🇨🇳", name: "China", dialCode: "+86" },
  { flag: "🇨🇴", name: "Colombia", dialCode: "+57" },
  { flag: "🇰🇲", name: "Comoros", dialCode: "+269" },
  { flag: "🇨🇬", name: "Congo", dialCode: "+242" },
  { flag: "🇨🇩", name: "Congo (DR)", dialCode: "+243" },
  { flag: "🇨🇷", name: "Costa Rica", dialCode: "+506" },
  { flag: "🇨🇮", name: "Côte d'Ivoire", dialCode: "+225" },
  { flag: "🇭🇷", name: "Croatia", dialCode: "+385" },
  { flag: "🇨🇺", name: "Cuba", dialCode: "+53" },
  { flag: "🇨🇾", name: "Cyprus", dialCode: "+357" },
  { flag: "🇨🇿", name: "Czech Republic", dialCode: "+420" },
  { flag: "🇩🇰", name: "Denmark", dialCode: "+45" },
  { flag: "🇩🇯", name: "Djibouti", dialCode: "+253" },
  { flag: "🇩🇴", name: "Dominican Republic", dialCode: "+1809" },
  { flag: "🇪🇨", name: "Ecuador", dialCode: "+593" },
  { flag: "🇪🇬", name: "Egypt", dialCode: "+20" },
  { flag: "🇸🇻", name: "El Salvador", dialCode: "+503" },
  { flag: "🇬🇶", name: "Equatorial Guinea", dialCode: "+240" },
  { flag: "🇪🇷", name: "Eritrea", dialCode: "+291" },
  { flag: "🇪🇪", name: "Estonia", dialCode: "+372" },
  { flag: "🇸🇿", name: "Eswatini", dialCode: "+268" },
  { flag: "🇪🇹", name: "Ethiopia", dialCode: "+251" },
  { flag: "🇫🇯", name: "Fiji", dialCode: "+679" },
  { flag: "🇫🇮", name: "Finland", dialCode: "+358" },
  { flag: "🇫🇷", name: "France", dialCode: "+33" },
  { flag: "🇬🇦", name: "Gabon", dialCode: "+241" },
  { flag: "🇬🇲", name: "Gambia", dialCode: "+220" },
  { flag: "🇬🇪", name: "Georgia", dialCode: "+995" },
  { flag: "🇩🇪", name: "Germany", dialCode: "+49" },
  { flag: "🇬🇭", name: "Ghana", dialCode: "+233" },
  { flag: "🇬🇷", name: "Greece", dialCode: "+30" },
  { flag: "🇬🇩", name: "Grenada", dialCode: "+1473" },
  { flag: "🇬🇹", name: "Guatemala", dialCode: "+502" },
  { flag: "🇬🇳", name: "Guinea", dialCode: "+224" },
  { flag: "🇬🇼", name: "Guinea-Bissau", dialCode: "+245" },
  { flag: "🇬🇾", name: "Guyana", dialCode: "+592" },
  { flag: "🇭🇹", name: "Haiti", dialCode: "+509" },
  { flag: "🇭🇳", name: "Honduras", dialCode: "+504" },
  { flag: "🇭🇺", name: "Hungary", dialCode: "+36" },
  { flag: "🇮🇸", name: "Iceland", dialCode: "+354" },
  { flag: "🇮🇳", name: "India", dialCode: "+91" },
  { flag: "🇮🇩", name: "Indonesia", dialCode: "+62" },
  { flag: "🇮🇷", name: "Iran", dialCode: "+98" },
  { flag: "🇮🇶", name: "Iraq", dialCode: "+964" },
  { flag: "🇮🇪", name: "Ireland", dialCode: "+353" },
  { flag: "🇮🇱", name: "Israel", dialCode: "+972" },
  { flag: "🇮🇹", name: "Italy", dialCode: "+39" },
  { flag: "🇯🇲", name: "Jamaica", dialCode: "+1876" },
  { flag: "🇯🇵", name: "Japan", dialCode: "+81" },
  { flag: "🇯🇴", name: "Jordan", dialCode: "+962" },
  { flag: "🇰🇿", name: "Kazakhstan", dialCode: "+7" },
  { flag: "🇰🇪", name: "Kenya", dialCode: "+254" },
  { flag: "🇰🇮", name: "Kiribati", dialCode: "+686" },
  { flag: "🇰🇼", name: "Kuwait", dialCode: "+965" },
  { flag: "🇰🇬", name: "Kyrgyzstan", dialCode: "+996" },
  { flag: "🇱🇦", name: "Laos", dialCode: "+856" },
  { flag: "🇱🇻", name: "Latvia", dialCode: "+371" },
  { flag: "🇱🇧", name: "Lebanon", dialCode: "+961" },
  { flag: "🇱🇸", name: "Lesotho", dialCode: "+266" },
  { flag: "🇱🇷", name: "Liberia", dialCode: "+231" },
  { flag: "🇱🇾", name: "Libya", dialCode: "+218" },
  { flag: "🇱🇮", name: "Liechtenstein", dialCode: "+423" },
  { flag: "🇱🇹", name: "Lithuania", dialCode: "+370" },
  { flag: "🇱🇺", name: "Luxembourg", dialCode: "+352" },
  { flag: "🇲🇬", name: "Madagascar", dialCode: "+261" },
  { flag: "🇲🇼", name: "Malawi", dialCode: "+265" },
  { flag: "🇲🇾", name: "Malaysia", dialCode: "+60" },
  { flag: "🇲🇻", name: "Maldives", dialCode: "+960" },
  { flag: "🇲🇱", name: "Mali", dialCode: "+223" },
  { flag: "🇲🇹", name: "Malta", dialCode: "+356" },
  { flag: "🇲🇭", name: "Marshall Islands", dialCode: "+692" },
  { flag: "🇲🇷", name: "Mauritania", dialCode: "+222" },
  { flag: "🇲🇺", name: "Mauritius", dialCode: "+230" },
  { flag: "🇲🇽", name: "Mexico", dialCode: "+52" },
  { flag: "🇫🇲", name: "Micronesia", dialCode: "+691" },
  { flag: "🇲🇩", name: "Moldova", dialCode: "+373" },
  { flag: "🇲🇨", name: "Monaco", dialCode: "+377" },
  { flag: "🇲🇳", name: "Mongolia", dialCode: "+976" },
  { flag: "🇲🇪", name: "Montenegro", dialCode: "+382" },
  { flag: "🇲🇦", name: "Morocco", dialCode: "+212" },
  { flag: "🇲🇿", name: "Mozambique", dialCode: "+258" },
  { flag: "🇲🇲", name: "Myanmar", dialCode: "+95" },
  { flag: "🇳🇦", name: "Namibia", dialCode: "+264" },
  { flag: "🇳🇷", name: "Nauru", dialCode: "+674" },
  { flag: "🇳🇵", name: "Nepal", dialCode: "+977" },
  { flag: "🇳🇱", name: "Netherlands", dialCode: "+31" },
  { flag: "🇳🇿", name: "New Zealand", dialCode: "+64" },
  { flag: "🇳🇮", name: "Nicaragua", dialCode: "+505" },
  { flag: "🇳🇪", name: "Niger", dialCode: "+227" },
  { flag: "🇳🇬", name: "Nigeria", dialCode: "+234" },
  { flag: "🇰🇵", name: "North Korea", dialCode: "+850" },
  { flag: "🇲🇰", name: "North Macedonia", dialCode: "+389" },
  { flag: "🇳🇴", name: "Norway", dialCode: "+47" },
  { flag: "🇴🇲", name: "Oman", dialCode: "+968" },
  { flag: "🇵🇰", name: "Pakistan", dialCode: "+92" },
  { flag: "🇵🇼", name: "Palau", dialCode: "+680" },
  { flag: "🇵🇸", name: "Palestine", dialCode: "+970" },
  { flag: "🇵🇦", name: "Panama", dialCode: "+507" },
  { flag: "🇵🇬", name: "Papua New Guinea", dialCode: "+675" },
  { flag: "🇵🇾", name: "Paraguay", dialCode: "+595" },
  { flag: "🇵🇪", name: "Peru", dialCode: "+51" },
  { flag: "🇵🇭", name: "Philippines", dialCode: "+63" },
  { flag: "🇵🇱", name: "Poland", dialCode: "+48" },
  { flag: "🇵🇹", name: "Portugal", dialCode: "+351" },
  { flag: "🇶🇦", name: "Qatar", dialCode: "+974" },
  { flag: "🇷🇴", name: "Romania", dialCode: "+40" },
  { flag: "🇷🇺", name: "Russia", dialCode: "+7" },
  { flag: "🇷🇼", name: "Rwanda", dialCode: "+250" },
  { flag: "🇰🇳", name: "Saint Kitts & Nevis", dialCode: "+1869" },
  { flag: "🇱🇨", name: "Saint Lucia", dialCode: "+1758" },
  { flag: "🇻🇨", name: "Saint Vincent", dialCode: "+1784" },
  { flag: "🇼🇸", name: "Samoa", dialCode: "+685" },
  { flag: "🇸🇲", name: "San Marino", dialCode: "+378" },
  { flag: "🇸🇹", name: "São Tomé & Príncipe", dialCode: "+239" },
  { flag: "🇸🇦", name: "Saudi Arabia", dialCode: "+966" },
  { flag: "🇸🇳", name: "Senegal", dialCode: "+221" },
  { flag: "🇷🇸", name: "Serbia", dialCode: "+381" },
  { flag: "🇸🇨", name: "Seychelles", dialCode: "+248" },
  { flag: "🇸🇱", name: "Sierra Leone", dialCode: "+232" },
  { flag: "🇸🇬", name: "Singapore", dialCode: "+65" },
  { flag: "🇸🇰", name: "Slovakia", dialCode: "+421" },
  { flag: "🇸🇮", name: "Slovenia", dialCode: "+386" },
  { flag: "🇸🇧", name: "Solomon Islands", dialCode: "+677" },
  { flag: "🇸🇴", name: "Somalia", dialCode: "+252" },
  { flag: "🇿🇦", name: "South Africa", dialCode: "+27" },
  { flag: "🇰🇷", name: "South Korea", dialCode: "+82" },
  { flag: "🇸🇸", name: "South Sudan", dialCode: "+211" },
  { flag: "🇪🇸", name: "Spain", dialCode: "+34" },
  { flag: "🇱🇰", name: "Sri Lanka", dialCode: "+94" },
  { flag: "🇸🇩", name: "Sudan", dialCode: "+249" },
  { flag: "🇸🇷", name: "Suriname", dialCode: "+597" },
  { flag: "🇸🇪", name: "Sweden", dialCode: "+46" },
  { flag: "🇨🇭", name: "Switzerland", dialCode: "+41" },
  { flag: "🇸🇾", name: "Syria", dialCode: "+963" },
  { flag: "🇹🇼", name: "Taiwan", dialCode: "+886" },
  { flag: "🇹🇯", name: "Tajikistan", dialCode: "+992" },
  { flag: "🇹🇿", name: "Tanzania", dialCode: "+255" },
  { flag: "🇹🇭", name: "Thailand", dialCode: "+66" },
  { flag: "🇹🇱", name: "Timor-Leste", dialCode: "+670" },
  { flag: "🇹🇬", name: "Togo", dialCode: "+228" },
  { flag: "🇹🇴", name: "Tonga", dialCode: "+676" },
  { flag: "🇹🇹", name: "Trinidad & Tobago", dialCode: "+1868" },
  { flag: "🇹🇳", name: "Tunisia", dialCode: "+216" },
  { flag: "🇹🇷", name: "Turkey", dialCode: "+90" },
  { flag: "🇹🇲", name: "Turkmenistan", dialCode: "+993" },
  { flag: "🇹🇻", name: "Tuvalu", dialCode: "+688" },
  { flag: "🇺🇬", name: "Uganda", dialCode: "+256" },
  { flag: "🇺🇦", name: "Ukraine", dialCode: "+380" },
  { flag: "🇦🇪", name: "United Arab Emirates", dialCode: "+971" },
  { flag: "🇬🇧", name: "United Kingdom", dialCode: "+44" },
  { flag: "🇺🇸", name: "United States", dialCode: "+1" },
  { flag: "🇺🇾", name: "Uruguay", dialCode: "+598" },
  { flag: "🇺🇿", name: "Uzbekistan", dialCode: "+998" },
  { flag: "🇻🇺", name: "Vanuatu", dialCode: "+678" },
  { flag: "🇻🇦", name: "Vatican City", dialCode: "+39" },
  { flag: "🇻🇪", name: "Venezuela", dialCode: "+58" },
  { flag: "🇻🇳", name: "Vietnam", dialCode: "+84" },
  { flag: "🇾🇪", name: "Yemen", dialCode: "+967" },
  { flag: "🇿🇲", name: "Zambia", dialCode: "+260" },
  { flag: "🇿🇼", name: "Zimbabwe", dialCode: "+263" },
];

interface CountryPickerProps {
  value: string;
  onChange: (dialCode: string) => void;
}

const CountryPicker = ({ value, onChange }: CountryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES;
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }, [search]);

  const selected = ALL_COUNTRIES.find((c) => c.dialCode === value);

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
            {/* Search bar */}
            <div className="px-4 pt-4 pb-3 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(75vh - 70px)" }}>
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No results</p>
              ) : (
                filtered.map((c, i) => {
                  const isSelected = c.dialCode === value && c.name === selected?.name;
                  return (
                    <div key={`${c.dialCode}-${c.name}`}>
                      <button
                        type="button"
                        onClick={() => { onChange(c.dialCode); setOpen(false); }}
                        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors active:bg-gray-50"
                      >
                        <span className={`text-sm font-medium ${isSelected ? "text-amber-500" : "text-gray-800"}`}>
                          {c.name} {c.flag} ({c.dialCode})
                        </span>
                        {isSelected && (
                          <span className="text-amber-500 text-lg leading-none">✓</span>
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
