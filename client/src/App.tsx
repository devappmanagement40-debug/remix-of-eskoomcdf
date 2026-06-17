import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionPopupProvider } from "@/components/ActionPopupProvider";
import { HashRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppImagesProvider } from "@/contexts/AppImagesContext";
import RequireAuth from "@/components/RequireAuth";

// Eager load core pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy load all protected pages
const Index           = lazy(() => import("./pages/Index"));
const Products        = lazy(() => import("./pages/Products"));
const Profile         = lazy(() => import("./pages/Profile"));
const Portefeuille    = lazy(() => import("./pages/Portefeuille"));
const Team            = lazy(() => import("./pages/Team"));
const Historique      = lazy(() => import("./pages/Historique"));
const Aide            = lazy(() => import("./pages/Aide"));
const Settings        = lazy(() => import("./pages/Settings"));
const Loterie         = lazy(() => import("./pages/Loterie"));
const APropos         = lazy(() => import("./pages/APropos"));
const NewsDetail      = lazy(() => import("./pages/NewsDetail"));
const HistoriqueRetraits = lazy(() => import("./pages/HistoriqueRetraits"));
const HistoriqueFonds    = lazy(() => import("./pages/HistoriqueFonds"));
const PointsCadeaux   = lazy(() => import("./pages/PointsCadeaux"));
const MesProduits     = lazy(() => import("./pages/MesProduits"));
const Recharge        = lazy(() => import("./pages/Recharge"));
const RechargePaiement = lazy(() => import("./pages/RechargePaiement"));
const AdminRecharges  = lazy(() => import("./pages/AdminRecharges"));
const LierCarte       = lazy(() => import("./pages/LierCarte"));
const Retrait         = lazy(() => import("./pages/Retrait"));
const AdminRetraits   = lazy(() => import("./pages/AdminRetraits"));
const AdminProduits   = lazy(() => import("./pages/AdminProduits"));
const AdminPopups     = lazy(() => import("./pages/AdminPopups"));
const AdminPanel      = lazy(() => import("./pages/AdminPanel"));
const AdminLogin      = lazy(() => import("./pages/AdminLogin"));
const EchangerCode    = lazy(() => import("./pages/EchangerCode"));
const ChangerMotDePasse = lazy(() => import("./pages/ChangerMotDePasse"));
const ChangerLangue   = lazy(() => import("./pages/ChangerLangue"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Loading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const R = ({ children }: { children: React.ReactNode }) => (
  <RouteErrorBoundary>{children}</RouteErrorBoundary>
);

const Auth = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><R>{children}</R></RequireAuth>
);

const App = () => (
  <ErrorBoundary>
    <AppImagesProvider>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ActionPopupProvider>
            <HashRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Pages publiques — accessibles sans connexion */}
                  <Route path="/connexion"   element={<R><Login /></R>} />
                  <Route path="/inscription" element={<R><Signup /></R>} />
                  {/* /reg — alias anglais pour les liens de parrainage: /#/reg?invite_code=XXX */}
                  <Route path="/reg"         element={<R><Signup /></R>} />
                  <Route path="/admin/827728389992871772661616161626E" element={<R><AdminLogin /></R>} />

                  {/* Toutes les autres pages — connexion obligatoire */}
                  <Route path="/"                    element={<Auth><Index /></Auth>} />
                  <Route path="/produits"            element={<Auth><Products /></Auth>} />
                  <Route path="/equipe"              element={<Auth><Team /></Auth>} />
                  <Route path="/portefeuille"        element={<Auth><Portefeuille /></Auth>} />
                  <Route path="/historique"          element={<Auth><Historique /></Auth>} />
                  <Route path="/aide"                element={<Auth><Aide /></Auth>} />
                  <Route path="/a-propos"            element={<Auth><APropos /></Auth>} />
                  <Route path="/actualite/:id"       element={<Auth><NewsDetail /></Auth>} />
                  <Route path="/historique-retraits" element={<Auth><HistoriqueRetraits /></Auth>} />
                  <Route path="/historique-fonds"    element={<Auth><HistoriqueFonds /></Auth>} />
                  <Route path="/points-cadeaux"      element={<Auth><PointsCadeaux /></Auth>} />
                  <Route path="/mes-produits"        element={<Auth><MesProduits /></Auth>} />
                  <Route path="/recharge"            element={<Auth><Recharge /></Auth>} />
                  <Route path="/recharge/paiement"   element={<Auth><RechargePaiement /></Auth>} />
                  <Route path="/admin/recharges"     element={<Auth><AdminRecharges /></Auth>} />
                  <Route path="/lier-carte"          element={<Auth><LierCarte /></Auth>} />
                  <Route path="/retrait"             element={<Auth><Retrait /></Auth>} />
                  <Route path="/admin/retraits"      element={<Auth><AdminRetraits /></Auth>} />
                  <Route path="/admin/produits"      element={<Auth><AdminProduits /></Auth>} />
                  <Route path="/admin/popups"        element={<Auth><AdminPopups /></Auth>} />
                  <Route path="/admin"               element={<Auth><AdminPanel /></Auth>} />
                  <Route path="/echanger-code"       element={<Auth><EchangerCode /></Auth>} />
                  <Route path="/changer-mot-de-passe" element={<Auth><ChangerMotDePasse /></Auth>} />
                  <Route path="/changer-langue"      element={<Auth><ChangerLangue /></Auth>} />
                  <Route path="/profil"              element={<Auth><Profile /></Auth>} />
                  <Route path="/parametres"          element={<Auth><Settings /></Auth>} />
                  <Route path="/loterie"             element={<Auth><Loterie /></Auth>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </ActionPopupProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
    </AppImagesProvider>
  </ErrorBoundary>
);

export default App;
