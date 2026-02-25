import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";

const settingsItems = [
  { label: "Changeur Mot Passe", path: "#" },
  { label: "Changer de langue", path: "#" },
  { label: "Déconnexion", path: "/connexion" },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Paramètres" showBack />
      <div className="px-4 pt-6 space-y-3">
        {settingsItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full bg-secondary rounded-xl p-4 flex items-center justify-between hover:bg-muted transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;
