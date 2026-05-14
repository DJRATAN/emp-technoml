-- =====================================================
-- Fix Employee ID Generation Logic
-- Makes it more robust to find the highest existing ID
-- =====================================================

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
    -- 1. Get the company prefix (configured prefix or first 3 letters of slug)
    SELECT COALESCE(NULLIF(employee_id_prefix, ''), UPPER(LEFT(slug, 3))) INTO v_prefix
    FROM public.companies WHERE id = p_company_id;

    -- 2. Current 2-digit year (e.g. '26')
    v_year := TO_CHAR(NOW(), 'YY');

    -- 3. Pattern to match for current year (e.g. 'TML-26-')
    v_pattern := v_prefix || '-' || v_year || '-';

    -- 4. Find highest serial number by extracting digits from the end of matching IDs
    -- This is more robust than REGEXP_REPLACE for various formats
    SELECT MAX(CAST(substring(employee_internal_id FROM '[0-9]+$') AS INT))
    INTO v_max_serial
    FROM public.profiles
    WHERE company_id = p_company_id
      AND employee_internal_id ILIKE v_pattern || '%';

    -- 5. Default to 0 if no matching IDs found
    v_max_serial := COALESCE(v_max_serial, 0);

    -- 6. Return next ID in format: PREFIX-YY-NNN (e.g. TML-26-002)
    -- LPAD ensures it is at least 3 digits (001, 002, etc.) but allows more (1000)
    RETURN v_prefix || '-' || v_year || '-' || LPAD((v_max_serial + 1)::TEXT, 3, '0');
END;
$$;
