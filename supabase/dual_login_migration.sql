-- =====================================================
-- Dual-Login Feature Migration (v2 — Smart Employee IDs)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add employee_internal_id to profiles (the display_id e.g. TML-26-001)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_internal_id TEXT;

-- 2. Add unique constraint on (employee_internal_id, company_id)
-- Allows same IDs across different tenants but never duplicates within one.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_employee_internal_id_company_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_employee_internal_id_company_id_key UNIQUE (employee_internal_id, company_id);

-- 3. Add login_preference and employee_id_prefix to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_preference TEXT DEFAULT 'both'
  CHECK (login_preference IN ('email', 'id', 'both'));

-- employee_id_prefix is the 3-letter company code used for ID generation (e.g. TML, PEG, ALP)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employee_id_prefix TEXT;

-- 4. Resolve employee ID to email — CASE-INSENSITIVE
-- SECURITY DEFINER runs with table-owner privileges so anon users can call it
CREATE OR REPLACE FUNCTION public.resolve_email_by_employee_id(p_employee_id TEXT, p_company_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
    v_company_id UUID;
BEGIN
    -- Resolve company_id from slug
    SELECT id INTO v_company_id FROM public.companies WHERE slug = p_company_slug;
    
    IF v_company_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Case-insensitive match on employee_internal_id
    SELECT email INTO v_email 
    FROM public.profiles 
    WHERE LOWER(employee_internal_id) = LOWER(p_employee_id) 
      AND company_id = v_company_id;

    RETURN v_email;
END;
$$;

-- 5. Helper function: get the next sequential employee ID for a company
-- Returns the next ID in format: PREFIX-YY-NNN (e.g. TML-26-042)
CREATE OR REPLACE FUNCTION public.get_next_employee_id(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_year TEXT;
    v_max_serial INT;
    v_pattern TEXT;
BEGIN
    -- Get the company prefix
    SELECT COALESCE(NULLIF(employee_id_prefix, ''), UPPER(LEFT(slug, 3))) INTO v_prefix
    FROM public.companies WHERE id = p_company_id;

    -- Current 2-digit year
    v_year := TO_CHAR(NOW(), 'YY');

    -- Pattern to match existing IDs for this year: PREFIX-YY-
    v_pattern := v_prefix || '-' || v_year || '-';

    -- Find the highest serial number for this pattern
    SELECT MAX(CAST(substring(employee_internal_id FROM '[0-9]+$') AS INT))
    INTO v_max_serial
    FROM public.profiles
    WHERE company_id = p_company_id
      AND employee_internal_id ILIKE v_pattern || '%';

    -- Return next ID
    v_max_serial := COALESCE(v_max_serial, 0);
    RETURN v_prefix || '-' || v_year || '-' || LPAD((v_max_serial + 1)::TEXT, 3, '0');
END;
$$;
