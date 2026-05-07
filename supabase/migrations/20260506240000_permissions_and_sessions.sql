-- Role-Based Permission Matrix
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_reset_passwords BOOLEAN DEFAULT false,
    can_view_chat_history BOOLEAN DEFAULT false,
    can_manage_payroll BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    can_approve_leaves BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, admin_id)
);

-- Session Kill Switch column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ;


ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Administrators (owners) can manage permissions for their company's admins
CREATE POLICY "Admins manage permissions" ON public.admin_permissions
    FOR ALL TO authenticated
    USING (
        company_id = user_company(auth.uid()) 
        AND has_role(auth.uid(), 'admin'::app_role) -- In a real scenario, we might check for 'owner' level
    )
    WITH CHECK (
        company_id = user_company(auth.uid()) 
        AND has_role(auth.uid(), 'admin'::app_role)
    );

-- Admins can read their own permissions
CREATE POLICY "Admins read own permissions" ON public.admin_permissions
    FOR SELECT TO authenticated
    USING (admin_id = auth.uid());
