import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import CountryPicker from "@/components/CountryPicker";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useActionPopup();
  const { validatePhone } = usePhoneValidation();
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
    if (!phone || !password || !confirmPassword) { showError("Error", "Please fill in all fields"); return; }
    const phoneCheck = validatePhone(phone, countryCode);
    if (!phoneCheck.valid) { showError("Invalid number", phoneCheck.message); return; }
    if (password.length < 6) { showError("Error", "Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { showError("Error", "Passwords do not match"); return; }
    if (!inviteCode.trim()) { showError("Error", "Invitation code is required"); return; }

    setLoading(true);
    const cleanPhone = phone.replace(/\s/g, "");
    const email = `${cleanPhone}@users.eskom.app`;

    const codeToCheck = inviteCode.trim();
    const { data: referrerId, error: codeError } = await supabase
      .rpc("validate_referral_code", { code: codeToCheck });
    if (codeError || !referrerId) {
      showError("Error", "Invalid invitation code");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: cleanPhone, phone: cleanPhone },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        showError("Error", "This number is already registered");
      } else {
        showError("Error", "Sign up failed");
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updateData: Record<string, unknown> = { phone: cleanPhone, country_code: countryCode };
        if (referrerId) updateData.referred_by = referrerId;
        updateData.referral_code = cleanPhone.slice(-4).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        await supabase.from("profiles").update(updateData).eq("user_id", user.id);
      }
      showSuccess("Sign up successful", "Your account has been created ✅");
      setTimeout(() => navigate("/"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Sign up" showBack />
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-1">Create</h2>
        <p className="text-xl font-bold text-foreground text-center mb-8">New Account</p>

        <div className="mb-10">
          <EskomLogo size="md" />
        </div>

        <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4" translate="no">
          <div className="input-glow rounded-lg bg-input">
            <div className="flex items-center">
              <span className="pl-3 pr-1">
                <CountryPicker value={countryCode} onChange={setCountryCode} />
              </span>
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

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Confirm your password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="text" placeholder="Enter invitation code" value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account? /{" "}
            <button type="button" onClick={() => navigate("/connexion")} className="text-primary font-medium hover:underline">Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
