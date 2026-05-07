-- Migration for Employee Moods and Burnout Dashboard

CREATE TABLE IF NOT EXISTS public.employee_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_employee_moods_company_date ON public.employee_moods(company_id, date);
CREATE INDEX IF NOT EXISTS idx_employee_moods_user_date ON public.employee_moods(user_id, date);

-- Enable RLS
ALTER TABLE public.employee_moods ENABLE ROW LEVEL SECURITY;

-- Policies

-- Employees can insert their own moods
CREATE POLICY "Employees can insert own moods" ON public.employee_moods
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Employees can view their own moods
CREATE POLICY "Employees can view own moods" ON public.employee_moods
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admins and Super Admins can view all moods in their company
CREATE POLICY "Admins can view company moods" ON public.employee_moods
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        AND has_role(auth.uid(), 'admin'::app_role)
    );

-- Super Admins can view all
CREATE POLICY "Super admins can view all moods" ON public.employee_moods
    FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role));
