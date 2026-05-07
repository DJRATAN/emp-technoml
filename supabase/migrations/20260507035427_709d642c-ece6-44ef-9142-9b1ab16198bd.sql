
-- 1. Add parent_task_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 2. Add group_id to admin_messages for broadcast grouping
ALTER TABLE public.admin_messages ADD COLUMN IF NOT EXISTS group_id text;

-- 3. Create admin-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-attachments', 'admin-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-attachments
CREATE POLICY "admin upload attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'admin-attachments' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin read attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'admin-attachments' AND (
  public.has_role(auth.uid(), 'admin'::app_role) AND 
  (storage.foldername(name))[1] = public.user_company(auth.uid())::text
));

CREATE POLICY "employee read own msg attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'admin-attachments' AND 
  (storage.foldername(name))[1] = public.user_company(auth.uid())::text
);

-- 4. Revoke EXECUTE from anon on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_company(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_kudos_received() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_leave_review() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_loan_target_assigned() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_helpdesk_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_loan_target_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- 5. Revoke EXECUTE from authenticated on trigger-only functions (should not be called directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_kudos_received() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_leave_review() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_loan_target_assigned() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_helpdesk_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_loan_target_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
