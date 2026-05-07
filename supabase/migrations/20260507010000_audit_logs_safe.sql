-- ============================================================
-- Safe, idempotent audit_logs table
-- Uses user_roles table for role checks (NOT profiles.role)
-- ============================================================

-- Ensure has_role helper exists (defensive re-create)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Create table if not already present
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    actor_id    UUID NOT NULL REFERENCES auth.users(id),
    actor_name  TEXT NOT NULL,
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    details     JSONB DEFAULT '{}',
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor           ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity          ON public.audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies safely before re-creating
DROP POLICY IF EXISTS "Admins view company audit logs"        ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin all audit logs"            ON public.audit_logs;

-- Admins of the same company can SELECT
CREATE POLICY "Admins view company audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Any authenticated user can INSERT their own audit record
CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- Super admin full access (all operations)
-- Note: super_admin was added in a later migration; guard with EXISTS check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
      AND enumlabel = 'super_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Super admin all audit logs" ON public.audit_logs
          FOR ALL TO authenticated
          USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
    $policy$;
  END IF;
END $$;
