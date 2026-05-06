-- Run this in your Supabase Dashboard SQL Editor

-- 1. Create id-cards bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for id-cards bucket
CREATE POLICY "admin upload id-cards" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin read id-cards" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-cards' AND (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "admin update id-cards" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete id-cards" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));


-- 3. Create admin-attachments bucket (for the new Chat feature)
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-attachments', 'admin-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for admin-attachments bucket
CREATE POLICY "admin upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-attachments' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin and employee read attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-attachments');

CREATE POLICY "admin delete attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'admin-attachments' AND has_role(auth.uid(), 'admin'::app_role));
