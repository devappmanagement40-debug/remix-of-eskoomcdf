
-- Table for dynamic popup messages manageable from admin
CREATE TABLE public.popup_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_key text NOT NULL UNIQUE,
  title text NOT NULL,
  message text NOT NULL,
  button_confirm text DEFAULT 'OK',
  button_cancel text,
  tabs jsonb,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.popup_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active popup messages"
  ON public.popup_messages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage popup messages"
  ON public.popup_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.popup_messages (trigger_key, title, message, button_confirm, button_cancel) VALUES
  ('welcome', 'Bienvenue', 'Bienvenue sur votre compte {username} 🎉', 'Continuer', null),
  ('recharge_success', 'Confirmation', 'Votre demande de rechargement a été envoyée avec succès. Elle sera traitée dans les plus brefs délais.', 'OK', null),
  ('withdrawal_sent', 'Demande envoyée', 'Votre demande de retrait est en cours de traitement. Vous recevrez une notification une fois traitée.', 'OK', null),
  ('logout_confirm', 'Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', 'Confirmer', 'Annuler');

INSERT INTO public.popup_messages (trigger_key, title, message, button_confirm, tabs, is_active) VALUES
  ('service_client', 'Service', 'Contactez notre service client pour toute assistance.', 'Contacter le service', 
   '[{"label":"Ligne 1","content":"Une fois votre compte rechargé, veuillez contacter le service client ou votre responsable pour leur envoyer une capture d''écran de votre paiement."},{"label":"Ligne 2","content":"Pour tout problème technique ou question sur votre compte, contactez-nous via le chat en ligne."},{"label":"Ligne 3","content":"Pour les demandes urgentes, envoyez un message prioritaire via le service client."}]'::jsonb,
   true);

CREATE TRIGGER update_popup_messages_updated_at
  BEFORE UPDATE ON public.popup_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
