import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActionPopup } from "@/components/ActionPopupProvider";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

const ChangerMotDePasse = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useActionPopup();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showError("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    if (newPassword.length < 6) {
      showError("Erreur", "Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    // Verify old password by re-signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { showError("Erreur", "Utilisateur non connecté"); setLoading(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      showError("Erreur", "L'ancien mot de passe est incorrect");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showError("Erreur", "Erreur lors de la mise à jour du mot de passe");
    } else {
      showSuccess("Succès", "Mot de passe modifié avec succès ✅");
      setTimeout(() => navigate("/parametres"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Changer Mot de Passe" showBack />
      <div className="px-4 pt-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Ancien mot de passe" value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Nouveau mot de passe" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Modification..." : "Modifier le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangerMotDePasse;
