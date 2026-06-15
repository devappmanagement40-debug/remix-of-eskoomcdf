import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { localAuth } from "@/integrations/supabase/client";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const session = localAuth.getSession();
    setAuthenticated(!!session);
    setChecking(false);

    const { data: { subscription } } = localAuth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
