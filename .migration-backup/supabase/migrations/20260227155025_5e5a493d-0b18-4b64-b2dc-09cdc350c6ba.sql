
-- 1. FAQ items table (dynamic help/FAQ)
CREATE TABLE public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active FAQ" ON public.faq_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQ" ON public.faq_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Info items table (important announcements)
CREATE TABLE public.info_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.info_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active info" ON public.info_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage info" ON public.info_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_info_items_updated_at BEFORE UPDATE ON public.info_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add site_settings for app message and home screen instructions
INSERT INTO public.site_settings (key, value, category) VALUES
  ('app_message_text', 'Notre application mobile est en cours de conception. Restez connecte pour la sortie officielle.', 'app'),
  ('app_message_enabled', 'true', 'app'),
  ('app_estimated_date', '', 'app'),
  ('app_download_url', '', 'app'),
  ('homescreen_instructions_enabled', 'true', 'app'),
  ('homescreen_instructions_text', 'Pour ajouter ESKOM a votre ecran d''accueil : 1. Ouvrez le menu du navigateur 2. Selectionnez "Ajouter a l''ecran d''accueil" 3. Confirmez l''ajout', 'app')
ON CONFLICT DO NOTHING;

-- 4. Seed default FAQ items
INSERT INTO public.faq_items (question, answer, sort_order) VALUES
  ('Comment effectuer un depot ?', 'Allez dans Portefeuille > Recharger, selectionnez un moyen de paiement et suivez les instructions affichees.', 1),
  ('Comment effectuer un retrait ?', 'Allez dans Portefeuille > Retirer, selectionnez votre portefeuille de retrait et entrez le montant souhaite.', 2),
  ('Comment acheter un produit ?', 'Allez dans la page Produits, choisissez un produit et cliquez sur Acheter. Le montant sera debite de votre solde.', 3),
  ('Comment fonctionne le parrainage ?', 'Partagez votre code de parrainage. Quand un filleul investit, vous recevez un bonus selon votre niveau VIP.', 4),
  ('Comment fonctionnent les niveaux VIP ?', 'Les niveaux VIP sont determines par vos investissements et votre equipe. Chaque niveau offre des avantages supplementaires.', 5),
  ('Comment fonctionnent les points cadeaux ?', 'Vous gagnez des points via vos activites (depots, retraits, membres actifs, niveau VIP). Echangez-les contre des cadeaux.', 6);
