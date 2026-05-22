-- ============================================================
-- FIX: company_features RLS - grant super_admin role to platform owner
-- and fix company_features INSERT/UPDATE policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Give ratanprajapati12421@gmail.com the super_admin role
-- Their user ID is: 1f9d348a-e0cf-4c2b-9fca-390720844cf4
INSERT INTO public.user_roles (user_id, role)
VALUES ('1f9d348a-e0cf-4c2b-9fca-390720844cf4', 'super_admin')
ON CONFLICT DO NOTHING;

-- 2. Also ensure gnome0259@gmail.com (company owner, c29b7852...) has admin role
-- (it was recently added, just ensure it exists)
INSERT INTO public.user_roles (user_id, role)
VALUES ('c29b7852-55b3-4068-ab19-6cffbf2295db', 'super_admin')
ON CONFLICT DO NOTHING;

-- 3. Drop and recreate company_features policies to also allow super_admin
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'company_features' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_features', pol.policyname);
  END LOOP;
END $$;

-- SELECT: any authenticated user in the company can read features
CREATE POLICY "company_features_select" ON public.company_features
FOR SELECT TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- INSERT: admins, super_admins, or company owners can insert
CREATE POLICY "company_features_insert" ON public.company_features
FOR INSERT TO authenticated
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE id::text = company_id::text AND owner_id = auth.uid())
  )
);

-- UPDATE: admins, super_admins, or company owners can update
CREATE POLICY "company_features_update" ON public.company_features
FOR UPDATE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE id::text = company_id::text AND owner_id = auth.uid())
  )
)
WITH CHECK (
  company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- DELETE: admins, super_admins, or company owners can delete
CREATE POLICY "company_features_delete" ON public.company_features
FOR DELETE TO authenticated
USING (
  company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM public.companies WHERE id::text = company_id::text AND owner_id = auth.uid())
  )
);

-- 4. Ensure the company_features row exists for TechnoML (upsert defaults)
INSERT INTO public.company_features (
  company_id,
  chat_enabled,
  tasks_enabled,
  kudos_enabled,
  birthdays_enabled,
  helpdesk_enabled,
  ai_analytics_enabled,
  payroll_export_enabled,
  multi_level_approvals_enabled,
  ip_whitelist_enabled,
  mock_gps_detection_enabled,
  wellbeing_enabled
)
VALUES (
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  true, true, true, true, true, true, true, true, true, true, true
)
ON CONFLICT (company_id) DO NOTHING;
