import { useState, useEffect } from "react";

export type CountryRule = {
  id: string;
  name: string;
  country_code: string;
  phone_digits: number;
  validation_enabled: boolean;
  is_active: boolean;
};

export const usePhoneValidation = () => {
  const [countryRules, setCountryRules] = useState<CountryRule[]>([]);

  useEffect(() => {
    fetch("/api/countries")
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const active = (data || [])
          .filter((c: any) => c.isActive ?? c.is_active)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            country_code: c.countryCode ?? c.country_code,
            phone_digits: c.phoneDigits ?? c.phone_digits,
            validation_enabled: c.validationEnabled ?? c.validation_enabled,
            is_active: c.isActive ?? c.is_active,
          }));
        setCountryRules(active);
      })
      .catch(() => {});
  }, []);

  const validatePhone = (phone: string, countryCode: string): { valid: boolean; message: string } => {
    const rule = countryRules.find((c) => c.country_code === countryCode);
    if (!rule) return { valid: true, message: "" };
    if (!rule.validation_enabled) return { valid: true, message: "" };

    const digits = phone.replace(/\D/g, "");
    if (!digits) return { valid: false, message: "Veuillez entrer un numero de telephone" };

    if (digits.length !== rule.phone_digits) {
      return {
        valid: false,
        message: `Le numero doit contenir exactement ${rule.phone_digits} chiffres pour ${rule.name}`,
      };
    }

    return { valid: true, message: "" };
  };

  return { countryRules, validatePhone };
};
