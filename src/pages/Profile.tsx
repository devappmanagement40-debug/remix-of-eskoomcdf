import { Wallet, Download, Clock, MessageCircle, Headphones, FileText, Smartphone, CreditCard, Lock, Gift, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const actionButtons = [
  { icon: Wallet, label: "Recharger", path: "/portefeuille" },
  { icon: Download, label: "Retirer", path: "/portefeuille" },
  { icon: Clock, label: "Historique", path: "/historique" },
];

const menuGrid = [
  { icon: MessageCircle, label: "À propos de nous", path: "/a-propos" },
  { icon: Headphones, label: "Service client", path: "/aide" },
  { icon: Clock, label: "Enregistrements", path: "/historique" },
  { icon: FileText, label: "Réglementation", path: "/aide" },
  { icon: Smartphone, label: "Télécharger APP", path: "#" },
  { icon: CreditCard, label: "Lier carte bancaire", path: "#" },
  { icon: Lock, label: "Changer mot de passe", path: "/parametres" },
  { icon: Gift, label: "Échanger cadeau", path: "#" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon Compte" />
      <div className="px-4 pt-6">
        {/* Balance */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-2xl font-bold text-primary">0,00 FCFA</p>
        </div>

        {/* Action buttons */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4 flex items-center justify-around">
          {actionButtons.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2"
            >
              <item.icon size={24} className="text-foreground" />
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="bg-card rounded-xl border border-secondary p-5 mb-4">
          <div className="grid grid-cols-4 gap-y-6">
            {menuGrid.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <item.icon size={22} className="text-muted-foreground" />
                </div>
                <span className="text-[11px] font-medium text-foreground text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Déconnexion - same style */}
        <button
          onClick={() => navigate("/connexion")}
          className="w-full bg-card rounded-xl border border-secondary p-4 flex items-center justify-center gap-3 hover:border-primary transition-colors"
        >
          <LogOut size={20} className="text-primary" />
          <span className="text-sm font-medium text-primary">Se déconnecter</span>
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
