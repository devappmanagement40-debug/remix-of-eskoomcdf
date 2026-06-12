
-- Table for official documents, certificates, legal proofs
CREATE TABLE public.official_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT NOT NULL DEFAULT 'image', -- 'image', 'pdf', 'certificate'
  file_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage official documents"
ON public.official_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active official documents"
ON public.official_documents FOR SELECT
USING (is_active = true);

CREATE TRIGGER update_official_documents_updated_at
BEFORE UPDATE ON public.official_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
