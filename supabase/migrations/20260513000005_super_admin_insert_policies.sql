-- RLS policies for super-admin to INSERT/UPDATE companies and company_settings

-- Companies: super admin can insert
DROP POLICY IF EXISTS "Super admin can insert companies" ON public.companies;
CREATE POLICY "Super admin can insert companies"
ON public.companies
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Companies: super admin can update any company
DROP POLICY IF EXISTS "Super admin can update any company" ON public.companies;
CREATE POLICY "Super admin can update any company"
ON public.companies
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Company settings: super admin can insert
DROP POLICY IF EXISTS "Super admin can insert company settings" ON public.company_settings;
CREATE POLICY "Super admin can insert company settings"
ON public.company_settings
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Company settings: super admin can update any
DROP POLICY IF EXISTS "Super admin can update any company settings" ON public.company_settings;
CREATE POLICY "Super admin can update any company settings"
ON public.company_settings
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));
