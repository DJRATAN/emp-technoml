-- =====================================================
-- Admin Password Reset RPC
-- Replaces failing bootstrap-admin Edge Function
-- =====================================================

-- Ensure pgcrypto is available in the extensions schema (standard for Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Ensure required security columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- RPC to reset user password as admin/super_admin/owner
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT;
  v_caller_role TEXT;
  v_is_owner BOOLEAN := FALSE;
  v_target_company UUID;
BEGIN
  -- 1. Get caller's role from user_roles
  SELECT role INTO v_caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
  LIMIT 1;

  -- 2. Check if caller is the company owner of the target user's company
  SELECT p.company_id INTO v_target_company
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_target_company IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.companies
      WHERE id = v_target_company AND owner_id = auth.uid()
    ) INTO v_is_owner;
  END IF;

  -- 3. Security check: allow if caller is admin, super_admin, OR company owner
  IF v_caller_role NOT IN ('admin', 'super_admin') AND v_is_owner = FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You must be an admin or company owner to reset passwords.');
  END IF;

  -- 4. Get target user email
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 5. Update the password in auth.users
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 6. Reset lockout status
  UPDATE public.profiles 
  SET force_password_change = TRUE,
      failed_login_count = 0,
      locked_until = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- Grant access to authenticated users (the function itself handles internal role/owner check)
GRANT EXECUTE ON FUNCTION public.admin_reset_password(UUID, TEXT) TO authenticated;
