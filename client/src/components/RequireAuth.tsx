import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ge_auth_token") || localStorage.getItem("auth_token");
    setAuthenticated(!!token);
    setChecking(false);
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
