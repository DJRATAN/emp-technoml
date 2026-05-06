
-- Revoke anon execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_company(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_leave_review() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_loan_target_assigned() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_kudos_received() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_helpdesk_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_loan_target_change() FROM anon;
