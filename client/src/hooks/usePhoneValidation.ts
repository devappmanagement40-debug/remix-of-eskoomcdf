import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    supabase
      .from("countries")
      .select("id, name, country_code, phone_digits, validation_enabled, is_active")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCountryRules(data as CountryRule[]);
      });
  }, []);

  const validatePhone = (phone: string, countryCode: string): { valid: boolean; message: string } => {
    const rule = countryRules.find((c) => c.country_code === countryCode);
    if (!rule) return { valid: true, message: "" }; // No rule = no validation
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
