-- ==========================================
-- 1. STORAGE BUCKETS SETUP & POLICIES
-- ==========================================

-- Create the storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('selfies', 'selfies', false),
  ('avatars', 'avatars', false),
  ('id-cards', 'id-cards', false),
  ('employee-documents', 'employee-documents', false),
  ('helpdesk', 'helpdesk', false),
  ('admin-attachments', 'admin-attachments', true),
  ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (normally enabled by default, comment out if permission error occurs)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Allow authenticated uploads to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to id-cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access to id-cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to employee-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access to employee-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to helpdesk" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read access to helpdesk" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin uploads to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to admin-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to admin-attachments" ON storage.objects;

-- Policies for 'selfies'
CREATE POLICY "Allow authenticated uploads to selfies"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'selfies' AND
  (auth.uid()::text = regexp_replace(name, '/.*$', ''))
);

CREATE POLICY "Allow authenticated read access to selfies"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'selfies' AND (
    auth.uid()::text = regexp_replace(name, '/.*$', '')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id::text = auth.uid()::text
      AND ur.role IN ('admin', 'super_admin')
    )
  )
);

-- Policies for 'avatars'
CREATE POLICY "Allow authenticated uploads to avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (auth.uid()::text = regexp_replace(name, '/.*$', ''))
);

CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- Policies for 'id-cards'
CREATE POLICY "Allow authenticated uploads to id-cards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  (auth.uid()::text = regexp_replace(name, '/.*$', ''))
);

CREATE POLICY "Allow authenticated read access to id-cards"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'id-cards' AND (
    auth.uid()::text = regexp_replace(name, '/.*$', '')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id::text = auth.uid()::text
      AND ur.role IN ('admin', 'super_admin')
    )
  )
);

-- Policies for 'employee-documents'
CREATE POLICY "Allow authenticated uploads to employee-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
);

CREATE POLICY "Allow authenticated read access to employee-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents' AND (
    auth.uid()::text = regexp_replace(name, '/.*$', '')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id::text = auth.uid()::text
      AND ur.role IN ('admin', 'super_admin')
    )
  )
);

-- Policies for 'helpdesk'
CREATE POLICY "Allow authenticated uploads to helpdesk"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'helpdesk');

CREATE POLICY "Allow authenticated read access to helpdesk"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'helpdesk');

-- Policies for 'company-assets'
CREATE POLICY "Allow admin uploads to company-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id::text = auth.uid()::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Allow public read access to company-assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-assets');

-- Policies for 'admin-attachments'
CREATE POLICY "Allow authenticated uploads to admin-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'admin-attachments' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id::text = auth.uid()::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Allow public read access to admin-attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'admin-attachments');


-- ==========================================
-- 2. ATTENDANCE & RELATED TABLES POLICIES
-- ==========================================

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attendance, and admins can view company attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can check-out, and admins can update attendance" ON public.attendance;

CREATE POLICY "Users can view their own attendance, and admins can view company attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Employees can insert their own attendance"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = user_id::text
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance.company_id::text
  )
);

CREATE POLICY "Employees can check-out, and admins can update attendance"
ON public.attendance FOR UPDATE TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  auth.uid()::text = user_id::text
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Enable RLS on attendance_corrections
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own corrections, and admins can view company corrections" ON public.attendance_corrections;
DROP POLICY IF EXISTS "Employees can insert corrections" ON public.attendance_corrections;
DROP POLICY IF EXISTS "Admins can update corrections" ON public.attendance_corrections;

CREATE POLICY "Users can view their own corrections, and admins can view company corrections"
ON public.attendance_corrections FOR SELECT TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance_corrections.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Employees can insert corrections"
ON public.attendance_corrections FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = user_id::text
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance_corrections.company_id::text
  )
);

CREATE POLICY "Admins can update corrections"
ON public.attendance_corrections FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = attendance_corrections.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Enable RLS on employee_moods
ALTER TABLE public.employee_moods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own moods, and admins can view company moods" ON public.employee_moods;
DROP POLICY IF EXISTS "Employees can insert moods" ON public.employee_moods;

CREATE POLICY "Users can view their own moods, and admins can view company moods"
ON public.employee_moods FOR SELECT TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id::text = auth.uid()::text
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = employee_moods.company_id::text
    AND ur.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Employees can insert moods"
ON public.employee_moods FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = user_id::text
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = auth.uid()::text
    AND p.company_id::text = employee_moods.company_id::text
  )
);
