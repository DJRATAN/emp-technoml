
-- Fix avatars bucket policies to allow Admins and Super-Admins to manage them.

-- 1. Admins should be able to upload avatars for users in their company.
-- Note: foldernames in avatars bucket are user IDs.
CREATE POLICY "admins upload company avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    AND public.user_company(((storage.foldername(name))[1])::uuid) = public.user_company(auth.uid())
  )
);

CREATE POLICY "admins update company avatars" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    AND public.user_company(((storage.foldername(name))[1])::uuid) = public.user_company(auth.uid())
  )
);

-- 2. Super admins should be able to manage any avatar.
CREATE POLICY "super admin all avatars" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'avatars' AND public.is_super_admin(auth.uid()));

-- 3. Fix id-cards bucket policies for admins
CREATE POLICY "admins upload company id cards" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    AND public.user_company(((storage.foldername(name))[1])::uuid) = public.user_company(auth.uid())
  )
);

CREATE POLICY "admins update company id cards" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'id-cards' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    AND public.user_company(((storage.foldername(name))[1])::uuid) = public.user_company(auth.uid())
  )
);

-- 4. Super admin for id-cards
CREATE POLICY "super admin all id cards" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'id-cards' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'id-cards' AND public.is_super_admin(auth.uid()));

-- 5. Super admin for employee-documents
CREATE POLICY "super admin all employee docs" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'employee-documents' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'employee-documents' AND public.is_super_admin(auth.uid()));
