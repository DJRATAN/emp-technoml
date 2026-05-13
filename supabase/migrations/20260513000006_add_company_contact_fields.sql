-- Add contact fields to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
