import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { localAuth, getAuthToken } from "@/integrations/supabase/client";

const ADMIN_LOGIN_PATH = "/admin/827728389992871772661616161626E";

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const session = localAuth.getSession();
      if (!session) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      try {
        const token = getAuthToken();
        const res = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      }
      setChecking(false);
    };
    verify();
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
