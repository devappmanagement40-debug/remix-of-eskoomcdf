import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import CountryPicker from "@/components/CountryPicker";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useActionPopup();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [countryCode, setCountryCode] = useState("+226");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(code);
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !confirmPassword) { showError("Erreur", "Veuillez remplir tous les champs"); return; }
    if (phone.length < 8) { showError("Erreur", "Numéro de téléphone invalide"); return; }
    if (password.length < 6) { showError("Erreur", "Le mot de passe doit contenir au moins 6 caractères"); return; }
    if (password !== confirmPassword) { showError("Erreur", "Les mots de passe ne correspondent pas"); return; }

    setLoading(true);
    const cleanPhone = phone.replace(/\s/g, "");
    const email = `${cleanPhone}@users.eskom.app`;

    let referrerId: string | null = null;
    if (inviteCode.trim()) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", inviteCode.trim().toUpperCase())
        .single();
      if (referrer) {
        referrerId = referrer.id;
      } else {
        showError("Erreur", "Code d'invitation invalide");
        setLoading(false);
        return;
      }
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
        showError("Erreur", "Ce numéro est déjà inscrit");
      } else {
        showError("Erreur", "Erreur lors de l'inscription");
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updateData: Record<string, unknown> = { phone: cleanPhone, country_code: countryCode };
        if (referrerId) updateData.referred_by = referrerId;
        updateData.referral_code = cleanPhone.slice(-4).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        await supabase.from("profiles").update(updateData).eq("user_id", user.id);
      }
      showSuccess("Inscription réussie", "Votre compte a été créé avec succès ✅");
      setTimeout(() => navigate("/"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Inscription" showBack />
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-1">Créer</h2>
        <p className="text-xl font-bold text-foreground text-center mb-8">Nouveau Compte</p>

        <div className="mb-10">
          <EskomLogo size="md" />
        </div>

        <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
          <div className="input-glow rounded-lg bg-input">
            <div className="flex items-center">
              <span className="pl-3 pr-1">
                <CountryPicker value={countryCode} onChange={setCountryCode} />
              </span>
              <span className="text-muted-foreground">|</span>
              <Input
                type="tel"
                placeholder="Numéro Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Veuillez entrer le mot de passe" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Veuillez entrer à nouveau le mot de passe" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input type="text" placeholder="Veuillez entrer le code d'invitation" value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Inscription..." : "Inscription"}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Vous avez déjà un compte ? /{" "}
            <button type="button" onClick={() => navigate("/connexion")} className="text-primary font-medium hover:underline">Connexion</button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
