import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Check } from "lucide-react";

const languages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const ChangerLangue = () => {
  const navigate = useNavigate();
  const { showSuccess } = useActionPopup();
  const [selected, setSelected] = useState(localStorage.getItem("eskom_lang") || "fr");

  const handleSelect = (code: string) => {
    setSelected(code);
    localStorage.setItem("eskom_lang", code);
    showSuccess("Language updated", `Language set to ${languages.find(l => l.code === code)?.label}`);
    setTimeout(() => navigate("/parametres"), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Change Language" showBack />
      <div className="px-4 pt-6 space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`w-full bg-card rounded-xl border p-4 flex items-center justify-between transition-colors ${
              selected === lang.code ? "border-primary" : "border-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">{lang.label}</span>
            </div>
            {selected === lang.code && <Check size={20} className="text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChangerLangue;
