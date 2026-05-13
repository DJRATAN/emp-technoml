-- Migration: allow admins to read their own profile (needed to fetch company_id)

-- Ensure RLS is enabled (already done in previous migration)

CREATE POLICY "Admins can read own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());
