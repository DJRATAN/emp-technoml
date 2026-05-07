-- ============================================================
-- Safe, idempotent attendance_corrections table
-- Run this in Supabase SQL Editor if the table is missing
-- ============================================================

-- Ensure has_role helper exists (defensive)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Create table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id             UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date                   DATE NOT NULL,
    requested_check_in     TIMESTAMPTZ,
    requested_check_out    TIMESTAMPTZ,
    reason                 TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
    original_attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    admin_notes            TEXT,
    reviewed_by            UUID REFERENCES auth.users(id),
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_att_corrections_company ON public.attendance_corrections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_att_corrections_user    ON public.attendance_corrections(user_id, date);

-- RLS
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Employee insert own correction"    ON public.attendance_corrections;
DROP POLICY IF EXISTS "Employee view own corrections"     ON public.attendance_corrections;
DROP POLICY IF EXISTS "Admin view company corrections"    ON public.attendance_corrections;
DROP POLICY IF EXISTS "Admin update company corrections"  ON public.attendance_corrections;
DROP POLICY IF EXISTS "Super admin all corrections"       ON public.attendance_corrections;

-- Employee: insert own
CREATE POLICY "Employee insert own correction" ON public.attendance_corrections
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- Employee: view own
CREATE POLICY "Employee view own corrections" ON public.attendance_corrections
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admin: view all in their company
CREATE POLICY "Admin view company corrections" ON public.attendance_corrections
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Admin: approve/reject in their company
CREATE POLICY "Admin update company corrections" ON public.attendance_corrections
    FOR UPDATE TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );

-- Super admin full access (guarded in case enum value not yet added)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
      AND enumlabel = 'super_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Super admin all corrections" ON public.attendance_corrections
          FOR ALL TO authenticated
          USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
    $policy$;
  END IF;
END $$;
