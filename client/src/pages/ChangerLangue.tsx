import { useNavigate } from "react-router-dom";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, LangCode } from "@/i18n/translations";

const ChangerLangue = () => {
  const navigate = useNavigate();
  const { showSuccess } = useActionPopup();
  const { lang, setLang, t } = useLanguage();

  const handleSelect = (code: LangCode) => {
    setLang(code);
    const selected = LANGUAGES.find((l) => l.code === code);
    showSuccess(t.changeLanguage.successTitle, `${t.changeLanguage.successMsg} ${selected?.label}`);
    setTimeout(() => navigate("/parametres"), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={t.changeLanguage.title} showBack />
      <div className="px-4 pt-6 space-y-3">
        {LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => handleSelect(language.code)}
            className={`w-full bg-card rounded-xl border p-4 flex items-center justify-between transition-colors ${
              lang === language.code ? "border-primary" : "border-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{language.flag}</span>
              <span className="text-sm font-medium text-foreground">{language.label}</span>
            </div>
            {lang === language.code && <Check size={20} className="text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChangerLangue;
