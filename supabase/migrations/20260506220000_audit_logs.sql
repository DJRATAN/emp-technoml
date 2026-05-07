-- Immutable Audit Log for enterprise compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their company
CREATE POLICY "Admins view company audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND has_role(auth.uid(), 'admin'::app_role)
    );

-- Any authenticated user can insert audit logs (the app logs on their behalf)
CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- Super admin full access
CREATE POLICY "Super admin all audit logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Make audit logs immutable: no updates or deletes allowed (except super admin above)
-- The absence of UPDATE/DELETE policies for regular users ensures immutability
