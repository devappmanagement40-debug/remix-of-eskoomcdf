import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showLogout, setShowLogout] = useState(false);

  const settingsItems = [
    { label: t.settings.changePassword, path: "/changer-mot-de-passe" },
    { label: t.settings.changeLanguage, path: "/changer-langue" },
    { label: t.settings.signOut, action: "logout" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={t.settings.title} showBack />
      <div className="px-4 pt-6 space-y-3">
        {settingsItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.action === "logout") setShowLogout(true);
              else if (item.path) navigate(item.path);
            }}
            className="w-full bg-secondary rounded-xl p-4 flex items-center justify-between hover:bg-muted transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowLogout(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs shadow-xl border border-secondary" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold text-foreground text-center mb-2">{t.settings.signOut}</p>
            <p className="text-sm text-muted-foreground text-center mb-6">Êtes-vous sûr de vouloir vous déconnecter ?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-2.5 rounded-xl border border-secondary text-sm font-medium text-muted-foreground">Annuler</button>
              <button onClick={async () => {
                try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("ge_auth_token")}` } }); } catch {}
                localStorage.removeItem("ge_auth_token");
                localStorage.removeItem("ge_auth_user");
                localStorage.removeItem("auth_token");
                navigate("/connexion");
              }} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
