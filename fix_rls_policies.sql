-- ============================================================
-- FIX RLS POLICIES FOR chat_channels, kudos, admin_permissions
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 0. DEFINE/UPDATE helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id 
    AND status::text = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id text)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id::text = _user_id 
    AND status::text = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. FIX: chat_channels INSERT & SELECT policies
-- ============================================================
-- Drop ALL existing policies on chat_channels to start fresh
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'chat_channels' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_channels', pol.policyname);
  END LOOP;
END $$;

-- SELECT: users can see channels in their company
CREATE POLICY "chat_channels_select"
ON chat_channels FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND is_approved(auth.uid())
);

-- INSERT: approved users can create channels in their company
CREATE POLICY "chat_channels_insert"
ON chat_channels FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND created_by::text = auth.uid()::text
  AND is_approved(auth.uid())
);

-- UPDATE: only creator or admins can update
CREATE POLICY "chat_channels_update"
ON chat_channels FOR UPDATE TO authenticated
USING (
  created_by::text = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')
  )
);

-- DELETE: only admins can delete channels
CREATE POLICY "chat_channels_delete"
ON chat_channels FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')
  )
);

-- ============================================================
-- 2. FIX: kudos INSERT & SELECT policies
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'kudos' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON kudos', pol.policyname);
  END LOOP;
END $$;

-- SELECT: users can see kudos in their company
CREATE POLICY "kudos_select"
ON kudos FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND is_approved(auth.uid())
);

-- INSERT: approved users can give kudos within their company
CREATE POLICY "kudos_insert"
ON kudos FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND from_user::text = auth.uid()::text
  AND is_approved(auth.uid())
);

-- ============================================================
-- 3. FIX: admin_permissions policies
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'admin_permissions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_permissions', pol.policyname);
  END LOOP;
END $$;

-- SELECT: admins and company owners can view permissions
CREATE POLICY "admin_permissions_select"
ON admin_permissions FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

-- INSERT: admins and company owners can insert permissions
CREATE POLICY "admin_permissions_insert"
ON admin_permissions FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

-- UPDATE: admins and company owners can update permissions
CREATE POLICY "admin_permissions_update"
ON admin_permissions FOR UPDATE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
)
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
);

-- ============================================================
-- 4. FIX: admin_permissions UNIQUE CONSTRAINT
-- Add unique constraint so ON CONFLICT (company_id, admin_id) works
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_permissions_company_id_admin_id_key'
    AND conrelid = 'admin_permissions'::regclass
  ) THEN
    ALTER TABLE admin_permissions 
    ADD CONSTRAINT admin_permissions_company_id_admin_id_key 
    UNIQUE (company_id, admin_id);
  END IF;
END $$;

-- ============================================================
-- 5. FIX: chat_messages policies (if broken too)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "chat_messages_select"
ON chat_messages FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND is_approved(auth.uid())
);

CREATE POLICY "chat_messages_insert"
ON chat_messages FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND author_id::text = auth.uid()::text
  AND is_approved(auth.uid())
);

-- ============================================================
-- 6. FIX: admin_messages policies
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'admin_messages' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_messages', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see broadcast messages in their company, messages where they are the sender/receiver, or if they are admin
CREATE POLICY "admin_messages_select"
ON admin_messages FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    is_broadcast = true
    OR receiver_id::text = auth.uid()::text
    OR sender_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')
    )
  )
);

-- INSERT: users can insert messages they send, as long as it's in their company
CREATE POLICY "admin_messages_insert"
ON admin_messages FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND sender_id::text = auth.uid()::text
);

-- UPDATE: users can update messages where they are receiver or sender, or if they are admin
CREATE POLICY "admin_messages_update"
ON admin_messages FOR UPDATE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    receiver_id::text = auth.uid()::text
    OR sender_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
);

-- DELETE: only admins can delete messages
CREATE POLICY "admin_messages_delete"
ON admin_messages FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')
  )
);

-- ============================================================
-- 7. FIX: storage.objects policies for avatars, id-cards, and employee-documents
-- ============================================================
-- Drop specific custom policies on storage.objects to avoid permission errors on system-owned policies
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

DROP POLICY IF EXISTS "id_cards_select" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_insert" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_update" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_delete" ON storage.objects;

DROP POLICY IF EXISTS "employee_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_delete" ON storage.objects;

-- 7.1 Avatars Bucket Policies
-- SELECT: anyone authenticated can read avatars
CREATE POLICY "avatars_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- INSERT: users can upload to their own folder, admins can upload anywhere
CREATE POLICY "avatars_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- UPDATE: users can update their own folder, admins can update anywhere
CREATE POLICY "avatars_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
)
WITH CHECK (
  bucket_id = 'avatars'
);

-- DELETE: users can delete their own folder, admins can delete anywhere
CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- 7.2 ID Cards Bucket Policies
-- SELECT: owner can read their own id-card, admins can read any
CREATE POLICY "id_cards_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- INSERT: owner or admin can upload
CREATE POLICY "id_cards_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-cards'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- UPDATE: owner or admin can update
CREATE POLICY "id_cards_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
)
WITH CHECK (
  bucket_id = 'id-cards'
);

-- DELETE: owner or admin can delete
CREATE POLICY "id_cards_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- 7.3 Employee Documents Bucket Policies
-- SELECT: owner can read their own documents, admins can read any
CREATE POLICY "employee_documents_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    name LIKE (auth.uid()::text || '/%')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
  )
);

-- INSERT: admins only
CREATE POLICY "employee_documents_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
);

-- UPDATE: admins only
CREATE POLICY "employee_documents_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
)
WITH CHECK (
  bucket_id = 'employee-documents'
);

-- DELETE: admins only
CREATE POLICY "employee_documents_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
);

-- ============================================================
-- 8. FIX: approval_chains policies
-- ============================================================
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'approval_chains' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON approval_chains', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "approval_chains_select" ON public.approval_chains 
FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
);

CREATE POLICY "approval_chains_insert" ON public.approval_chains 
FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

CREATE POLICY "approval_chains_update" ON public.approval_chains 
FOR UPDATE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

CREATE POLICY "approval_chains_delete" ON public.approval_chains 
FOR DELETE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

-- ============================================================
-- 9. FIX: company_features policies
-- ============================================================
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'company_features' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON company_features', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "company_features_select" ON public.company_features 
FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
);

CREATE POLICY "company_features_insert" ON public.company_features 
FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

CREATE POLICY "company_features_update" ON public.company_features 
FOR UPDATE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);

CREATE POLICY "company_features_delete" ON public.company_features 
FOR DELETE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM profiles WHERE id::text = auth.uid()::text LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM companies WHERE id::text = company_id::text AND owner_id::text = auth.uid()::text)
  )
);
