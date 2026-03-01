import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionPopupProvider } from "@/components/ActionPopupProvider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

// Eager load core pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import Portefeuille from "./pages/Portefeuille";
import NotFound from "./pages/NotFound";

// Lazy load secondary pages
const Team = lazy(() => import("./pages/Team"));
const Historique = lazy(() => import("./pages/Historique"));
const Aide = lazy(() => import("./pages/Aide"));
const Settings = lazy(() => import("./pages/Settings"));
const Loterie = lazy(() => import("./pages/Loterie"));
const ServiceChat = lazy(() => import("./pages/ServiceChat"));
const APropos = lazy(() => import("./pages/APropos"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const HistoriqueRetraits = lazy(() => import("./pages/HistoriqueRetraits"));
const HistoriqueFonds = lazy(() => import("./pages/HistoriqueFonds"));
const PointsCadeaux = lazy(() => import("./pages/PointsCadeaux"));
const MesProduits = lazy(() => import("./pages/MesProduits"));
const Recharge = lazy(() => import("./pages/Recharge"));
const RechargePaiement = lazy(() => import("./pages/RechargePaiement"));
const AdminRecharges = lazy(() => import("./pages/AdminRecharges"));
const LierCarte = lazy(() => import("./pages/LierCarte"));
const Retrait = lazy(() => import("./pages/Retrait"));
const AdminRetraits = lazy(() => import("./pages/AdminRetraits"));
const AdminProduits = lazy(() => import("./pages/AdminProduits"));
const AdminPopups = lazy(() => import("./pages/AdminPopups"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const EchangerCode = lazy(() => import("./pages/EchangerCode"));
const ChangerMotDePasse = lazy(() => import("./pages/ChangerMotDePasse"));
const ChangerLangue = lazy(() => import("./pages/ChangerLangue"));

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

// Helper to wrap a page element in RouteErrorBoundary
const R = ({ children }: { children: React.ReactNode }) => (
  <RouteErrorBoundary>{children}</RouteErrorBoundary>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ActionPopupProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<R><Index /></R>} />
                <Route path="/connexion" element={<R><Login /></R>} />
                <Route path="/inscription" element={<R><Signup /></R>} />
                <Route path="/produits" element={<R><Products /></R>} />
                <Route path="/equipe" element={<R><Team /></R>} />
                <Route path="/portefeuille" element={<R><Portefeuille /></R>} />
                <Route path="/historique" element={<R><Historique /></R>} />
                <Route path="/aide" element={<R><Aide /></R>} />
                <Route path="/a-propos" element={<R><APropos /></R>} />
                <Route path="/actualite/:id" element={<R><NewsDetail /></R>} />
                <Route path="/historique-retraits" element={<R><HistoriqueRetraits /></R>} />
                <Route path="/historique-fonds" element={<R><HistoriqueFonds /></R>} />
                <Route path="/points-cadeaux" element={<R><PointsCadeaux /></R>} />
                <Route path="/mes-produits" element={<R><MesProduits /></R>} />
                <Route path="/recharge" element={<R><Recharge /></R>} />
                <Route path="/recharge/paiement" element={<R><RechargePaiement /></R>} />
                <Route path="/admin/recharges" element={<R><AdminRecharges /></R>} />
                <Route path="/lier-carte" element={<R><LierCarte /></R>} />
                <Route path="/retrait" element={<R><Retrait /></R>} />
                <Route path="/admin/retraits" element={<R><AdminRetraits /></R>} />
                <Route path="/admin/produits" element={<R><AdminProduits /></R>} />
                <Route path="/admin/popups" element={<R><AdminPopups /></R>} />
                <Route path="/admin" element={<R><AdminPanel /></R>} />
                <Route path="/echanger-code" element={<R><EchangerCode /></R>} />
                <Route path="/changer-mot-de-passe" element={<R><ChangerMotDePasse /></R>} />
                <Route path="/changer-langue" element={<R><ChangerLangue /></R>} />
                <Route path="/profil" element={<R><Profile /></R>} />
                <Route path="/parametres" element={<R><Settings /></R>} />
                <Route path="/loterie" element={<R><Loterie /></R>} />
                <Route path="/service-chat" element={<R><ServiceChat /></R>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ActionPopupProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
