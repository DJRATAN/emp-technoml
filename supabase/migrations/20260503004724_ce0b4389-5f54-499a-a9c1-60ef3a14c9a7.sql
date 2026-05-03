
-- Document vault table
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  storage_path text NOT NULL,
  notes text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employee can view own docs
CREATE POLICY "employee read own docs"
ON public.employee_documents FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Admin manages docs for their company
CREATE POLICY "admin manage docs"
ON public.employee_documents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()));

-- Super admin full access
CREATE POLICY "super admin all docs"
ON public.employee_documents FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_employee_documents_updated_at
BEFORE UPDATE ON public.employee_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false);

-- Storage policies
CREATE POLICY "admin upload employee docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete employee docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users read own employee docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
