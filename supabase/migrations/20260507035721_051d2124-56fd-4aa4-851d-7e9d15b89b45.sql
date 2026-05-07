
-- Revoke from PUBLIC (which includes anon) on ALL security definer functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_channel_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_kudos_received() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_leave_review() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_loan_target_assigned() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_helpdesk_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_loan_target_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- Grant EXECUTE to authenticated only for RLS-helper functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid, uuid) TO authenticated;

-- Trigger functions don't need direct user grants (triggered by system)
-- handle_new_user, notify_*, log_*, update_updated_at_column remain revoked from all roles
