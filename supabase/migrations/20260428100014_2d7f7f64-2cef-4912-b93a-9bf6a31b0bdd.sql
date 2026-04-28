-- 1. Add leave SLA setting
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS leave_approval_sla_hours integer NOT NULL DEFAULT 48;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self read notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self update notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "company admin read notifications" ON public.notifications FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role) AND company_id = user_company(auth.uid()));
CREATE POLICY "company admin insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all notifications" ON public.notifications FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 3. Loan target audit log
CREATE TABLE IF NOT EXISTS public.loan_target_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_target_id uuid NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  bank text NOT NULL,
  month date NOT NULL,
  field text NOT NULL,
  old_value integer,
  new_value integer,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lth_target ON public.loan_target_history(loan_target_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lth_company_month_bank ON public.loan_target_history(company_id, month, bank);
ALTER TABLE public.loan_target_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self read target history" ON public.loan_target_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "company admin read target history" ON public.loan_target_history FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role) AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all target history" ON public.loan_target_history FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_loan_target_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.target IS DISTINCT FROM OLD.target THEN
      INSERT INTO public.loan_target_history(loan_target_id, company_id, user_id, bank, month, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.company_id, NEW.user_id, NEW.bank, NEW.month, 'target', OLD.target, NEW.target, COALESCE(auth.uid(), NEW.user_id));
    END IF;
    IF NEW.achieved IS DISTINCT FROM OLD.achieved THEN
      INSERT INTO public.loan_target_history(loan_target_id, company_id, user_id, bank, month, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.company_id, NEW.user_id, NEW.bank, NEW.month, 'achieved', OLD.achieved, NEW.achieved, COALESCE(auth.uid(), NEW.user_id));
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.loan_target_history(loan_target_id, company_id, user_id, bank, month, field, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.company_id, NEW.user_id, NEW.bank, NEW.month, 'created', 0, NEW.target, COALESCE(auth.uid(), NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_loan_target ON public.loan_targets;
CREATE TRIGGER trg_log_loan_target AFTER INSERT OR UPDATE ON public.loan_targets FOR EACH ROW EXECUTE FUNCTION public.log_loan_target_change();

-- 4. Add monthly target task fields to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_target boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_month date,
  ADD COLUMN IF NOT EXISTS target_count integer,
  ADD COLUMN IF NOT EXISTS progress_count integer NOT NULL DEFAULT 0;

-- 5. Triggers to create notifications
CREATE OR REPLACE FUNCTION public.notify_leave_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications(user_id, company_id, type, title, body, link)
    VALUES (
      NEW.user_id, NEW.company_id, 'leave_' || NEW.status,
      'Leave ' || NEW.status,
      'Your ' || NEW.leave_type || ' leave from ' || NEW.start_date || ' to ' || NEW.end_date || ' was ' || NEW.status,
      '/employee/leave'
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_leave ON public.leave_requests;
CREATE TRIGGER trg_notify_leave AFTER UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.notify_leave_review();

CREATE OR REPLACE FUNCTION public.notify_loan_target_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, company_id, type, title, body, link)
    VALUES (
      NEW.user_id, NEW.company_id, 'target_assigned',
      'New ' || NEW.bank || ' target assigned',
      'Target of ' || NEW.target || ' for ' || to_char(NEW.month,'Mon YYYY'),
      '/employee/targets'
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_target ON public.loan_targets;
CREATE TRIGGER trg_notify_target AFTER INSERT ON public.loan_targets FOR EACH ROW EXECUTE FUNCTION public.notify_loan_target_assigned();