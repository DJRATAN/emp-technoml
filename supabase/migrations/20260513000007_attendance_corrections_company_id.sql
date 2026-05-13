-- Add company_id to attendance_corrections if missing
ALTER TABLE public.attendance_corrections
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Super admin can read all corrections
DROP POLICY IF EXISTS "Super admin can read all corrections" ON public.attendance_corrections;
CREATE POLICY "Super admin can read all corrections"
ON public.attendance_corrections
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Admin can read own company corrections
DROP POLICY IF EXISTS "Admin can read own company corrections" ON public.attendance_corrections;
CREATE POLICY "Admin can read own company corrections"
ON public.attendance_corrections
FOR SELECT TO authenticated
USING (public.get_user_company_id(auth.uid()) = company_id);

-- Admin can update own company corrections
DROP POLICY IF EXISTS "Admin can update own company corrections" ON public.attendance_corrections;
CREATE POLICY "Admin can update own company corrections"
ON public.attendance_corrections
FOR UPDATE TO authenticated
USING (public.get_user_company_id(auth.uid()) = company_id);

-- Employees can insert corrections for themselves
DROP POLICY IF EXISTS "Employees can insert corrections" ON public.attendance_corrections;
CREATE POLICY "Employees can insert corrections"
ON public.attendance_corrections
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Employees can read own corrections
DROP POLICY IF EXISTS "Employees can read own corrections" ON public.attendance_corrections;
CREATE POLICY "Employees can read own corrections"
ON public.attendance_corrections
FOR SELECT TO authenticated
USING (user_id = auth.uid());
