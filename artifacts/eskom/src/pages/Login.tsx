import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PremiumModal from "@/components/PremiumModal";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";

const Login = () => {
  const navigate = useNavigate();
  const { showError } = useActionPopup();
  const { validatePhone } = usePhoneValidation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const countryCode = "+509";
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) { showError("Error", "Please fill in all fields"); return; }

    const cleanPhone = phone.replace(/\D/g, "");
    let isAdminPhone = false;

    try {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_phones")
        .maybeSingle();

      const adminPhones = setting?.value ? JSON.parse(setting.value) : [];
      const normalizedAdminPhones = adminPhones.map((value: string) => value.replace(/\D/g, ""));
      isAdminPhone = normalizedAdminPhones.includes(cleanPhone);
    } catch {
      isAdminPhone = false;
    }

    if (!isAdminPhone) {
      const phoneCheck = validatePhone(phone, countryCode);
      if (!phoneCheck.valid) { showError("Invalid number", phoneCheck.message); return; }
    }

    setLoading(true);
    const email = `${cleanPhone}@users.eskom.app`;
    const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError("Login failed", "Incorrect number or password");
    } else {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", authData.user.id).single();
      setUserName(profile?.full_name || profile?.phone || phone);
      setShowWelcome(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Sign in" showBack />
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-1">Hello!</h2>
        <p className="text-xl font-bold text-foreground text-center mb-8">Instant Login</p>

        <div className="mb-10">
          <EskomLogo size="md" />
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4" translate="no">
          <div className="input-glow rounded-lg bg-input">
            <div className="flex items-center">
              <span className="pl-3 pr-2 text-primary font-semibold text-sm whitespace-nowrap">+509</span>
              <span className="text-muted-foreground">|</span>
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Enter your password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account? /{" "}
            <button type="button" onClick={() => navigate("/inscription")} className="text-primary font-medium hover:underline">Sign up</button>
          </p>
        </form>
      </div>

      <PremiumModal
        triggerKey="welcome"
        open={showWelcome}
        onClose={() => { setShowWelcome(false); navigate("/"); }}
        replacements={{ username: userName }}
      />
    </div>
  );
};

export default Login;
