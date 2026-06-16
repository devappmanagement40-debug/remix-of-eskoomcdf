import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAppImages } from "@/contexts/AppImagesContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { appLogo } = useAppImages();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError("Email ou mot de passe incorrect");
        setLoading(false);
        return;
      }

      const token = data.session?.access_token ?? data.token;

      const checkRes = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!checkRes.ok) {
        setError("Accès refusé. Ce compte n'a pas les droits administrateur.");
        setLoading(false);
        return;
      }

      localStorage.setItem("auth_token", token);
      navigate("/admin", { replace: true });
    } catch {
      setError("Erreur de connexion. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Shield size={32} className="text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">Accès réservé aux administrateurs</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-card border border-secondary rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Adresse e-mail</label>
              <div className="input-glow rounded-xl bg-secondary px-4 py-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemple.com"
                  autoComplete="email"
                  className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mot de passe</label>
              <div className="input-glow rounded-xl bg-secondary px-4 py-3 flex items-center gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                <p className="text-xs text-destructive font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Connexion...</>
              ) : (
                <><Shield size={16} /> Accéder au panel</>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Accès sécurisé — Toute tentative non autorisée est enregistrée
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
