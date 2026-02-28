-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);

-- Allow authenticated users to upload to chat-images
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

-- Allow public read access for chat images
CREATE POLICY "Public can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');