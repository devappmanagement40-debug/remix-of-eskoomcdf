import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import PremiumModal from "@/components/PremiumModal";
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

      <PremiumModal
        triggerKey="logout_confirm"
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          localStorage.removeItem("auth_token");
          navigate("/connexion");
        }}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  );
};

export default Settings;
