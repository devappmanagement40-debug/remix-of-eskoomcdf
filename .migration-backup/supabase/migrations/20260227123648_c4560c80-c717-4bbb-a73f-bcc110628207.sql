
-- Table pour stocker les messages du chat support
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  is_ai boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour charger les conversations par utilisateur
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id, created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND sender = 'user');

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert support replies
CREATE POLICY "Admins can insert replies"
ON public.chat_messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
