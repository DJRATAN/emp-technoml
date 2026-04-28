-- Extend profiles with self-editable fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_card_url text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Monthly loan targets per employee per bank
CREATE TABLE IF NOT EXISTS public.loan_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  month date NOT NULL,
  bank text NOT NULL,
  target integer NOT NULL DEFAULT 0,
  achieved integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, bank)
);

ALTER TABLE public.loan_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self read loan targets" ON public.loan_targets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "self update achieved loan targets" ON public.loan_targets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "company admin read loan targets" ON public.loan_targets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));

CREATE POLICY "company admin insert loan targets" ON public.loan_targets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));

CREATE POLICY "company admin update loan targets" ON public.loan_targets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));

CREATE POLICY "company admin delete loan targets" ON public.loan_targets
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND company_id = user_company(auth.uid()));

CREATE POLICY "super admin all loan targets" ON public.loan_targets
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_loan_targets_updated_at
  BEFORE UPDATE ON public.loan_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for ID cards (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own id card" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users read own id card" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own id card" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "admins read company id cards" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-cards'
    AND has_role(auth.uid(), 'admin')
    AND user_company(((storage.foldername(name))[1])::uuid) = user_company(auth.uid())
  );