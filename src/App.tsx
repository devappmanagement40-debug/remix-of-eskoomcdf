import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionPopupProvider } from "@/components/ActionPopupProvider";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
      staleTime: 1000 * 60 * 2, // 2 min cache
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ActionPopupProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Signup />} />
          <Route path="/produits" element={<Products />} />
          <Route path="/equipe" element={<Team />} />
          <Route path="/portefeuille" element={<Portefeuille />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="/aide" element={<Aide />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/actualite/:id" element={<NewsDetail />} />
          <Route path="/historique-retraits" element={<HistoriqueRetraits />} />
          <Route path="/historique-fonds" element={<HistoriqueFonds />} />
          <Route path="/points-cadeaux" element={<PointsCadeaux />} />
          <Route path="/mes-produits" element={<MesProduits />} />
          <Route path="/recharge" element={<Recharge />} />
          <Route path="/recharge/paiement" element={<RechargePaiement />} />
          <Route path="/admin/recharges" element={<AdminRecharges />} />
          <Route path="/lier-carte" element={<LierCarte />} />
          <Route path="/retrait" element={<Retrait />} />
          <Route path="/admin/retraits" element={<AdminRetraits />} />
          <Route path="/admin/produits" element={<AdminProduits />} />
          <Route path="/admin/popups" element={<AdminPopups />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/echanger-code" element={<EchangerCode />} />
          <Route path="/changer-mot-de-passe" element={<ChangerMotDePasse />} />
          <Route path="/changer-langue" element={<ChangerLangue />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/parametres" element={<Settings />} />
          <Route path="/loterie" element={<Loterie />} />
          <Route path="/service-chat" element={<ServiceChat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </ActionPopupProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
