-- Invitations table for Secure Onboarding flow
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT,
    job_title TEXT,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    UNIQUE(company_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins manage invitations" ON public.invitations
    FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()));

-- Public can read a specific invitation by token (to verify link)
CREATE POLICY "Public read invitation by token" ON public.invitations
    FOR SELECT TO anon, authenticated
    USING (used_at IS NULL AND expires_at > NOW());

-- Audit log for invitations
-- (Assuming audit_logs table exists from previous step)
