-- ============================================================
-- Create company-assets storage bucket (public, for logos)
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

-- Public bucket so logo images can be displayed without signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies safely
DROP POLICY IF EXISTS "Admins upload company assets"  ON storage.objects;
DROP POLICY IF EXISTS "Admins delete company assets"  ON storage.objects;
DROP POLICY IF EXISTS "Public read company assets"    ON storage.objects;

-- Anyone can read logos (they're public branding)
CREATE POLICY "Public read company assets" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'company-assets');

-- Only admins can upload to company-assets
CREATE POLICY "Admins upload company assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'company-assets'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Only admins can delete from company-assets
CREATE POLICY "Admins delete company assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'company-assets'
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
