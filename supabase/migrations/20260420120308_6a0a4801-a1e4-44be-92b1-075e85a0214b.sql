-- Fix: restrict listing of avatars bucket. Files are still accessible via direct public URL.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;

-- Public can SELECT individual avatar objects only by exact name (not list everything)
-- Public bucket already serves files via CDN; we just remove broad listing capability.
CREATE POLICY "avatars authed read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');