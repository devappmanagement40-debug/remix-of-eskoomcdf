import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LangCode, LANGUAGES, translations, Translations } from "@/i18n/translations";

type LanguageContextType = {
  lang: LangCode;
  t: Translations;
  setLang: (code: LangCode) => void;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  t: translations["fr"],
  setLang: () => {},
  dir: "ltr",
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem("ge_energy_lang") as LangCode | null;
    return (stored && translations[stored]) ? stored : "fr";
  });

  const setLang = (code: LangCode) => {
    localStorage.setItem("ge_energy_lang", code);
    setLangState(code);
  };

  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const dir: "ltr" | "rtl" = langMeta?.dir === "rtl" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
