import { ChevronRight, Settings, Wallet, History, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const menuItems = [
  { icon: Wallet, label: "Mon Portefeuille", path: "#" },
  { icon: History, label: "Historique", path: "#" },
  { icon: HelpCircle, label: "Centre d'aide", path: "#" },
  { icon: Settings, label: "Paramètres", path: "/parametres" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon Compte" />
      <div className="px-4 pt-6">
        {/* User info card */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xl">
            E
          </div>
          <div>
            <p className="font-bold text-foreground">Utilisateur ESKOM</p>
            <p className="text-xs text-muted-foreground">+226 XX XX XX XX</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-6">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-2xl font-bold text-primary">0,00 FCFA</p>
        </div>

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full bg-card rounded-xl border border-secondary p-4 flex items-center justify-between hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
