-- Migration to add helper function and RLS policies for profiles
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to fetch a user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id FROM public.profiles
    WHERE id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for super admins (unrestricted read)
DROP POLICY IF EXISTS "Super admin can read any profile" ON public.profiles;
CREATE POLICY "Super admin can read any profile"
ON public.profiles
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Policy for admins to read only their own company employees
DROP POLICY IF EXISTS "Admin can read own company profiles" ON public.profiles;
CREATE POLICY "Admin can read own company profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (
  NOT public.is_super_admin(auth.uid()) AND
  public.get_user_company_id(auth.uid()) = company_id
);
