
-- 2. companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Add company_id to existing tables (nullable initially for migration)
ALTER TABLE public.profiles         ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.attendance       ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tasks            ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests   ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. company_settings: drop singleton, make per-company
ALTER TABLE public.company_settings DROP CONSTRAINT IF EXISTS company_settings_pkey;
ALTER TABLE public.company_settings ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.user_company(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- 6. Drop existing RLS policies and replace with multi-tenant ones
-- profiles
DROP POLICY IF EXISTS "users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "admins delete profiles" ON public.profiles;

CREATE POLICY "self read profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "company admin read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all profiles" ON public.profiles FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "super admin insert profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- attendance
DROP POLICY IF EXISTS "users view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "users update own attendance" ON public.attendance;
DROP POLICY IF EXISTS "admins view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "admins update any attendance" ON public.attendance;
DROP POLICY IF EXISTS "approved users insert own attendance" ON public.attendance;

CREATE POLICY "self read attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self insert attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_approved(auth.uid()) AND company_id = user_company(auth.uid()));
CREATE POLICY "self update attendance" ON public.attendance FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "company admin read attendance" ON public.attendance FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin update attendance" ON public.attendance FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all attendance" ON public.attendance FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- tasks
DROP POLICY IF EXISTS "users view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "users update own task status" ON public.tasks;
DROP POLICY IF EXISTS "admins create tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins delete tasks" ON public.tasks;

CREATE POLICY "assignee read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = assigned_to AND company_id = user_company(auth.uid()));
CREATE POLICY "assignee update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_to AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin write tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all tasks" ON public.tasks FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- leave_requests
DROP POLICY IF EXISTS "users view own leave" ON public.leave_requests;
DROP POLICY IF EXISTS "approved users create leave" ON public.leave_requests;
DROP POLICY IF EXISTS "admins view all leave" ON public.leave_requests;
DROP POLICY IF EXISTS "admins update leave" ON public.leave_requests;

CREATE POLICY "self read leave" ON public.leave_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self create leave" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_approved(auth.uid()) AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin read leave" ON public.leave_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin update leave" ON public.leave_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all leave" ON public.leave_requests FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- company_settings (per-company now)
DROP POLICY IF EXISTS "anyone authed reads settings" ON public.company_settings;
DROP POLICY IF EXISTS "admins update settings" ON public.company_settings;

CREATE POLICY "members read company settings" ON public.company_settings FOR SELECT TO authenticated
  USING (company_id = user_company(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "company admin update settings" ON public.company_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all settings" ON public.company_settings FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- companies
CREATE POLICY "members read own company" ON public.companies FOR SELECT TO authenticated
  USING (id = user_company(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "super admin manage companies" ON public.companies FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Allow public (anon) to look up companies by slug for the login flow step 1
CREATE POLICY "public lookup companies by slug" ON public.companies FOR SELECT TO anon USING (status = 'active');

-- 7. Disable auto-profile trigger (super admin creates users via edge function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 8. Updated_at triggers for companies
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Indexes for tenant scoping
CREATE INDEX IF NOT EXISTS idx_profiles_company        ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company      ON public.attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company           ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company  ON public.leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company ON public.company_settings(company_id);
