
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS face_recognition_sensitivity INTEGER NOT NULL DEFAULT 80;
