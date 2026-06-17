import { Home, ShoppingBag, Wallet, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import { useState } from "react";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useRealtimeProfile();
  const [avatarError, setAvatarError] = useState(false);

  const navItems = [
    { icon: Home, label: t.nav.home, path: "/" },
    { icon: ShoppingBag, label: t.nav.products, path: "/produits" },
    { icon: Wallet, label: t.nav.wallet, path: "/portefeuille" },
    { icon: User, label: t.nav.me, path: "/profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-secondary">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isProfile = item.path === "/profil";
          const showAvatar = isProfile && profile.avatar_url && !avatarError;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {showAvatar ? (
                <img
                  src={profile.avatar_url!}
                  alt="avatar"
                  className={`w-6 h-6 rounded-full object-cover ${isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "opacity-80"}`}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <item.icon size={22} />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
