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
      showError("Error", "Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      showError("Error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    // Verify old password by re-signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { showError("Error", "User not logged in"); setLoading(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      showError("Error", "Current password is incorrect");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showError("Error", "Failed to update password");
    } else {
      showSuccess("Success", "Password updated successfully ✅");
      setTimeout(() => navigate("/parametres"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Change Password" showBack />
      <div className="px-4 pt-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Current password" value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="New password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="input-glow rounded-lg bg-input">
            <Input type="password" placeholder="Confirm new password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full gradient-button text-foreground font-semibold py-3.5 rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangerMotDePasse;
