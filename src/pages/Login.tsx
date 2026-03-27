import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import CountryPicker from "@/components/CountryPicker";
import PremiumModal from "@/components/PremiumModal";
import { usePhoneValidation } from "@/hooks/usePhoneValidation";

const Login = () => {
  const navigate = useNavigate();
  const { showError } = useActionPopup();
  const { validatePhone } = usePhoneValidation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+243");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) { showError("Erreur", "Veuillez remplir tous les champs"); return; }
    const phoneCheck = validatePhone(phone, countryCode);
    if (!phoneCheck.valid) { showError("Numero invalide", phoneCheck.message); return; }

    setLoading(true);
    const email = `${phone.replace(/\s/g, "")}@users.eskom.app`;
    const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError("Connexion échouée", "Numéro ou mot de passe incorrect");
    } else {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", authData.user.id).single();
      setUserName(profile?.full_name || profile?.phone || phone);
      setShowWelcome(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Connexion" showBack />
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-1">Salut !</h2>
        <p className="text-xl font-bold text-foreground text-center mb-8">Connexion Immédiate</p>

        <div className="mb-10">
          <EskomLogo size="md" />
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4" translate="no">
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

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Connexion..." : "Connexion"}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Vous n'avez pas de compte ? /{" "}
            <button type="button" onClick={() => navigate("/inscription")} className="text-primary font-medium hover:underline">S'inscrire</button>
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
