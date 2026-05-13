-- Add company_id to profiles for company association
ALTER TABLE public.profiles
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Optional: backfill existing profiles if needed (none for now)
