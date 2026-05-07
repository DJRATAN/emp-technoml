-- Attendance Correction Requests
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    original_attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_corrections_company ON public.attendance_corrections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_att_corrections_user ON public.attendance_corrections(user_id, date);

ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Employee can insert their own correction requests
CREATE POLICY "Employee insert own correction" ON public.attendance_corrections
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Employee can view their own correction requests
CREATE POLICY "Employee view own corrections" ON public.attendance_corrections
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admin can view all corrections in their company
CREATE POLICY "Admin view company corrections" ON public.attendance_corrections
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND has_role(auth.uid(), 'admin'::app_role)
    );

-- Admin can update corrections in their company
CREATE POLICY "Admin update company corrections" ON public.attendance_corrections
    FOR UPDATE TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND has_role(auth.uid(), 'admin'::app_role)
    );

-- Super admin full access
CREATE POLICY "Super admin all corrections" ON public.attendance_corrections
    FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role));
