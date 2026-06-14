import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import CountryPicker from "@/components/CountryPicker";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";
import { useLanguage } from "@/contexts/LanguageContext";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useActionPopup();
  const { validatePhone } = usePhoneValidation();
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [countryCode, setCountryCode] = useState("+509");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(decodeURIComponent(code).trim());
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !confirmPassword) { showError(t.common.error, t.signup.errorFields); return; }
    const phoneCheck = validatePhone(phone, countryCode);
    if (!phoneCheck.valid) { showError(t.login.errorInvalidNumber, phoneCheck.message); return; }
    if (password.length < 6) { showError(t.common.error, t.signup.errorPassword); return; }
    if (password !== confirmPassword) { showError(t.common.error, t.signup.errorPasswordMatch); return; }
    if (!inviteCode.trim()) { showError(t.common.error, t.signup.errorInviteCode); return; }

    setLoading(true);
    const cleanPhone = phone.replace(/\s/g, "");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, password, inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.error?.includes("already registered")) {
          showError(t.common.error, t.signup.errorAlreadyRegistered);
        } else {
          showError(t.common.error, data.error || t.signup.errorSignup);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      showSuccess(t.signup.successTitle, t.signup.successMsg);
      setTimeout(() => navigate("/"), 1500);
    } catch {
      showError(t.common.error, t.signup.errorConnection);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title={t.signup.title} showBack />
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-1">{t.signup.create}</h2>
        <p className="text-xl font-bold text-foreground text-center mb-8">{t.signup.newAccount}</p>

        <div className="mb-10">
          <EskomLogo size="md" />
        </div>

        <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4" translate="no">
          <div className="input-glow rounded-lg bg-input">
            <div className="flex items-center">
              <div className="pl-3 pr-2">
                <CountryPicker value={countryCode} onChange={setCountryCode} />
              </div>
              <span className="text-muted-foreground">|</span>
              <Input
                type="tel"
                placeholder={t.signup.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder={t.signup.passwordPlaceholder} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder={t.signup.confirmPasswordPlaceholder} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="text" placeholder={t.signup.inviteCodePlaceholder} value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? t.signup.signingUp : t.signup.signUp}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            {t.signup.hasAccount} /{" "}
            <button type="button" onClick={() => navigate("/connexion")} className="text-primary font-medium hover:underline">{t.signup.signIn}</button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
