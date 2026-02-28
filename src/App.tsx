import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionPopupProvider } from "@/components/ActionPopupProvider";
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
import AdminPanel from "./pages/AdminPanel";
import EchangerCode from "./pages/EchangerCode";
import ChangerMotDePasse from "./pages/ChangerMotDePasse";
import ChangerLangue from "./pages/ChangerLangue";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ActionPopupProvider>
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
      </BrowserRouter>
      </ActionPopupProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
