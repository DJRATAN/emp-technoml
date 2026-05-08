
-- Add super_admin policies for user_roles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' AND policyname = 'super admin manage roles'
    ) THEN
        CREATE POLICY "super admin manage roles" ON public.user_roles
            FOR ALL TO authenticated
            USING (public.is_super_admin(auth.uid()))
            WITH CHECK (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- Add super_admin policies for admin_permissions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_permissions' AND policyname = 'super admin manage all permissions'
    ) THEN
        CREATE POLICY "super admin manage all permissions" ON public.admin_permissions
            FOR ALL TO authenticated
            USING (public.is_super_admin(auth.uid()))
            WITH CHECK (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- Fix potential RLS issue in login_logs (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_logs') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'login_logs' AND policyname = 'super admin view logs'
        ) THEN
            CREATE POLICY "super admin view logs" ON public.login_logs
                FOR SELECT TO authenticated
                USING (public.is_super_admin(auth.uid()));
        END IF;
    END IF;
END $$;

-- Ensure super_admin can see ALL profiles regardless of company_id
-- (The existing policy in 20260421020938...sql already does this, but let's be sure)
DROP POLICY IF EXISTS "super admin all profiles" ON public.profiles;
CREATE POLICY "super admin all profiles" ON public.profiles FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Ensure super_admin can see ALL audit logs
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Super Admin can see all logs" ON public.audit_logs;
        CREATE POLICY "Super Admin can see all logs" ON public.audit_logs
            FOR SELECT TO authenticated
            USING (public.is_super_admin(auth.uid()));
    END IF;
END $$;
