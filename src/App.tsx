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
          <Route path="/profil" element={<Profile />} />
          <Route path="/parametres" element={<Settings />} />
          <Route path="/loterie" element={<Loterie />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
