-- Allow admins to upload avatars for employees in their company
CREATE POLICY "admin upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update/overwrite avatars
CREATE POLICY "admin update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete old avatars
CREATE POLICY "admin delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'admin'::app_role)
);