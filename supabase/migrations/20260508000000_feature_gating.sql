-- ============== PLAN TYPE ENUM ==============
DO $$ BEGIN
    CREATE TYPE public.plan_type AS ENUM ('basic', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============== COMPANIES UPDATES ==============
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_type public.plan_type NOT NULL DEFAULT 'basic';

-- ============== FEATURE FLAGS UPDATES ==============
ALTER TABLE public.company_features 
  ADD COLUMN IF NOT EXISTS ai_analytics_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_export_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tasks_enabled boolean NOT NULL DEFAULT true;

-- ============== ACCESS CHECK FUNCTION ==============
CREATE OR REPLACE FUNCTION public.check_feature_access(_feature_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _company_id uuid;
    _is_super_admin boolean;
    _enabled boolean;
BEGIN
    _is_super_admin := public.is_super_admin(auth.uid());
    IF _is_super_admin THEN RETURN true; END IF;

    _company_id := public.user_company(auth.uid());
    IF _company_id IS NULL THEN RETURN false; END IF;

    EXECUTE format('SELECT %I FROM public.company_features WHERE company_id = $1', _feature_name)
    INTO _enabled
    USING _company_id;

    RETURN COALESCE(_enabled, false);
END;
$$;

-- ============== UPDATE RLS POLICIES ==============
-- Example: Restrict payroll access to those with the feature enabled
-- We'll apply this to relevant tables if they exist or as a general pattern

-- Seed existing companies if not already in company_features
INSERT INTO public.company_features (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
