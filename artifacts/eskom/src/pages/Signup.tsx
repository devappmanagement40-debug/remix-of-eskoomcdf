import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
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
  const countryCode = "+509";
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

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, password, inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.error?.includes("already registered")) {
          showError("Error", "This number is already registered");
        } else {
          showError("Error", data.error || "Sign up failed");
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

      showSuccess("Sign up successful", "Your account has been created ✅");
      setTimeout(() => navigate("/"), 1500);
    } catch {
      showError("Error", "Connection error, please try again");
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
