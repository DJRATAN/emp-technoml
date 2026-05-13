-- Allow super_admin to manage any storage bucket
DROP POLICY IF EXISTS "Super Admin any bucket" ON storage.objects;
CREATE POLICY "Super Admin any bucket" ON storage.objects
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Allow admin to manage any storage bucket
DROP POLICY IF EXISTS "Admin any bucket" ON storage.objects;
CREATE POLICY "Admin any bucket" ON storage.objects
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Specific policies for company-assets (legacy support)
DROP POLICY IF EXISTS "Admins upload company assets" ON storage.objects;
CREATE POLICY "Admins upload company assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'company-assets'
        AND (
            public.is_super_admin(auth.uid())
            OR public.has_role(auth.uid(), 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins delete company assets" ON storage.objects;
CREATE POLICY "Admins delete company assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'company-assets'
        AND (
            public.is_super_admin(auth.uid())
            OR public.has_role(auth.uid(), 'admin')
        )
    );
