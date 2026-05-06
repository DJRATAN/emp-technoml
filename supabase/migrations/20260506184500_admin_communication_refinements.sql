-- Add group_id to admin_messages
ALTER TABLE public.admin_messages ADD COLUMN group_id UUID;

-- Ensure admin-attachments bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-attachments', 'admin-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-attachments bucket
CREATE POLICY "admin upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-attachments' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin and employee read attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-attachments');

CREATE POLICY "admin delete attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'admin-attachments' AND has_role(auth.uid(), 'admin'::app_role));
