-- =====================================================
-- Security & Metadata Columns Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add security tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Add login metadata columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_device TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ;

-- 3. Ensure proper data types and defaults for existing columns if needed
-- (Optional: add constraints if necessary)

-- 4. Notify about success
COMMENT ON TABLE public.profiles IS 'User profiles with multi-tenant company mapping and security tracking.';
