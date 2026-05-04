
-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_device text,
  ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- Login logs table
CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id uuid,
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read company login logs"
  ON public.login_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()));

CREATE POLICY "super admin all login logs"
  ON public.login_logs FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Allow edge functions / triggers to insert logs
CREATE POLICY "service insert login logs"
  ON public.login_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_login_logs_user ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_company ON public.login_logs(company_id);
CREATE INDEX idx_login_logs_created ON public.login_logs(created_at DESC);
