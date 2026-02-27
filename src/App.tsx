import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Products from "./pages/Products";
import Team from "./pages/Team";
import Portefeuille from "./pages/Portefeuille";
import Historique from "./pages/Historique";
import Aide from "./pages/Aide";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Loterie from "./pages/Loterie";
import NotFound from "./pages/NotFound";
import ServiceChat from "./pages/ServiceChat";
import APropos from "./pages/APropos";
import NewsDetail from "./pages/NewsDetail";
import HistoriqueRetraits from "./pages/HistoriqueRetraits";
import HistoriqueFonds from "./pages/HistoriqueFonds";
import PointsCadeaux from "./pages/PointsCadeaux";
import MesProduits from "./pages/MesProduits";
import Recharge from "./pages/Recharge";
import RechargePaiement from "./pages/RechargePaiement";
import AdminRecharges from "./pages/AdminRecharges";
import LierCarte from "./pages/LierCarte";
import Retrait from "./pages/Retrait";
import AdminRetraits from "./pages/AdminRetraits";
import AdminProduits from "./pages/AdminProduits";
import AdminPopups from "./pages/AdminPopups";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/actualite/:slug" element={<NewsDetail />} />
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
          <Route path="/profil" element={<Profile />} />
          <Route path="/parametres" element={<Settings />} />
          <Route path="/loterie" element={<Loterie />} />
          <Route path="/service-chat" element={<ServiceChat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
