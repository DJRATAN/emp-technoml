
-- Add Branding fields to Companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#0ea5e9';

-- Add Face Recognition Sensitivity to Company Settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS face_recognition_sensitivity FLOAT DEFAULT 0.6;

-- Create Granular Permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    can_view_attendance BOOLEAN DEFAULT true,
    can_view_payroll BOOLEAN DEFAULT false,
    can_manage_tasks BOOLEAN DEFAULT true,
    can_delete_employees BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_permissions
CREATE POLICY "members read permissions" ON public.admin_permissions 
FOR SELECT TO authenticated 
USING (company_id = user_company(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "admin manage permissions" ON public.admin_permissions 
FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));

CREATE POLICY "super admin all permissions" ON public.admin_permissions 
FOR ALL TO authenticated 
USING (is_super_admin(auth.uid())) 
WITH CHECK (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER trg_admin_permissions_updated BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
