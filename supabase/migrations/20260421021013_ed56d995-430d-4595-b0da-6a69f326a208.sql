
ALTER TABLE public.profiles        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.attendance      ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.tasks           ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.leave_requests  ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_company_unique UNIQUE (company_id);
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS id;
ALTER TABLE public.company_settings ADD PRIMARY KEY (company_id);
