import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import EskomLogo from "@/components/EskomLogo";
import PageHeader from "@/components/PageHeader";

const Signup = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
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
              <span className="pl-4 pr-2 text-muted-foreground text-sm font-medium whitespace-nowrap">+226 ▼</span>
              <span className="text-muted-foreground">|</span>
              <Input
                type="tel"
                placeholder="Numéro Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input
              type="password"
              placeholder="Veuillez entrer le mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input
              type="password"
              placeholder="Veuillez entrer à nouveau le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="input-glow rounded-lg bg-input">
            <Input
              type="text"
              placeholder="Veuillez entrer le code d'invitation"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90"
            >
              Inscription
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Vous avez déjà un compte ? /{" "}
            <button
              type="button"
              onClick={() => navigate("/connexion")}
              className="text-primary font-medium hover:underline"
            >
              Connexion
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
