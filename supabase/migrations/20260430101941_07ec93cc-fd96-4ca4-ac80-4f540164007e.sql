-- ============== FEATURE FLAGS ==============
CREATE TABLE public.company_features (
  company_id uuid PRIMARY KEY,
  kudos_enabled boolean NOT NULL DEFAULT true,
  birthdays_enabled boolean NOT NULL DEFAULT true,
  chat_enabled boolean NOT NULL DEFAULT true,
  helpdesk_enabled boolean NOT NULL DEFAULT true,
  multi_level_approvals_enabled boolean NOT NULL DEFAULT false,
  ip_whitelist_enabled boolean NOT NULL DEFAULT false,
  mock_gps_detection_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read features" ON public.company_features FOR SELECT TO authenticated
  USING (company_id = user_company(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin update features" ON public.company_features FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "admin insert features" ON public.company_features FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all features" ON public.company_features FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Seed flags for existing companies
INSERT INTO public.company_features (company_id)
SELECT id FROM public.companies ON CONFLICT DO NOTHING;

-- ============== APPROVAL CHAINS ==============
CREATE TABLE public.approval_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  leave_type text NOT NULL DEFAULT 'all',
  step_order int NOT NULL,
  role_label text NOT NULL,
  approver_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, leave_type, step_order)
);
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read chains" ON public.approval_chains FOR SELECT TO authenticated
  USING (company_id = user_company(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage chains" ON public.approval_chains FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));

CREATE TABLE public.leave_approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL,
  company_id uuid NOT NULL,
  step_order int NOT NULL,
  approver_user_id uuid NOT NULL,
  role_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|skipped
  notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read steps" ON public.leave_approval_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.id = leave_request_id AND lr.user_id = auth.uid()));
CREATE POLICY "approver read steps" ON public.leave_approval_steps FOR SELECT TO authenticated
  USING (approver_user_id = auth.uid());
CREATE POLICY "approver update step" ON public.leave_approval_steps FOR UPDATE TO authenticated
  USING (approver_user_id = auth.uid());
CREATE POLICY "admin all steps" ON public.leave_approval_steps FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all steps" ON public.leave_approval_steps FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============== KUDOS ==============
CREATE TABLE public.kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  message text NOT NULL,
  badge text DEFAULT 'star',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company read kudos" ON public.kudos FOR SELECT TO authenticated
  USING (company_id = user_company(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "self create kudos" ON public.kudos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND is_approved(auth.uid()) AND company_id = user_company(auth.uid()));
CREATE POLICY "author or admin delete kudos" ON public.kudos FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid())) OR is_super_admin(auth.uid()));

-- ============== CHAT ==============
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'public', -- public|private|dm
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chat_channel_members (
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  company_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.chat_channel_members WHERE channel_id=_channel AND user_id=_user)
$$;

CREATE POLICY "company read public channels" ON public.chat_channels FOR SELECT TO authenticated
  USING (company_id = user_company(auth.uid()) AND (type='public' OR public.is_channel_member(id, auth.uid())));
CREATE POLICY "admin manage channels" ON public.chat_channels FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "self create channel" ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=created_by AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all channels" ON public.chat_channels FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "self read membership" ON public.chat_channel_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_channel_member(channel_id, auth.uid()));
CREATE POLICY "self join channel" ON public.chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "self leave channel" ON public.chat_channel_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "members read messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id, auth.uid()) OR (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid())));
CREATE POLICY "members post messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=author_id AND public.is_channel_member(channel_id, auth.uid()) AND company_id = user_company(auth.uid()));
CREATE POLICY "author delete message" ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid()=author_id OR (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;

-- ============== HELPDESK ==============
CREATE TABLE public.helpdesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  created_by uuid NOT NULL,
  assignee_id uuid,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general', -- it|hr|facilities|finance|general
  priority text NOT NULL DEFAULT 'medium', -- low|medium|high|urgent
  status text NOT NULL DEFAULT 'open', -- open|in_progress|resolved|closed
  sla_hours int NOT NULL DEFAULT 48,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator read ticket" ON public.helpdesk_tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assignee_id = auth.uid()
         OR (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid())));
CREATE POLICY "self create ticket" ON public.helpdesk_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=created_by AND is_approved(auth.uid()) AND company_id = user_company(auth.uid()));
CREATE POLICY "creator update own open ticket" ON public.helpdesk_tickets FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status IN ('open'));
CREATE POLICY "admin manage ticket" ON public.helpdesk_tickets FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') AND company_id = user_company(auth.uid()));
CREATE POLICY "super admin all tickets" ON public.helpdesk_tickets FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_helpdesk_updated BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.helpdesk_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  company_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.helpdesk_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket party read comments" ON public.helpdesk_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.helpdesk_tickets t WHERE t.id = ticket_id
    AND (t.created_by=auth.uid() OR t.assignee_id=auth.uid()
         OR (has_role(auth.uid(),'admin') AND t.company_id = user_company(auth.uid())))));
CREATE POLICY "ticket party post comment" ON public.helpdesk_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=author_id AND EXISTS (SELECT 1 FROM public.helpdesk_tickets t WHERE t.id = ticket_id
    AND (t.created_by=auth.uid() OR t.assignee_id=auth.uid()
         OR (has_role(auth.uid(),'admin') AND t.company_id = user_company(auth.uid())))));

CREATE TABLE public.helpdesk_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  company_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.helpdesk_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket party read attach" ON public.helpdesk_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.helpdesk_tickets t WHERE t.id = ticket_id
    AND (t.created_by=auth.uid() OR t.assignee_id=auth.uid()
         OR (has_role(auth.uid(),'admin') AND t.company_id = user_company(auth.uid())))));
CREATE POLICY "ticket party add attach" ON public.helpdesk_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=uploaded_by);

-- Notify ticket creator when assignee or status changes
CREATE OR REPLACE FUNCTION public.notify_helpdesk_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,company_id,type,title,body,link)
      VALUES (NEW.assignee_id, NEW.company_id, 'helpdesk_assigned', 'New ticket assigned',
              NEW.title, '/employee/helpdesk');
    END IF;
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications(user_id,company_id,type,title,body,link)
      VALUES (NEW.created_by, NEW.company_id, 'helpdesk_status', 'Ticket ' || NEW.status,
              NEW.title, '/employee/helpdesk');
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,company_id,type,title,body,link)
      VALUES (NEW.assignee_id, NEW.company_id, 'helpdesk_assigned', 'New ticket assigned',
              NEW.title, '/employee/helpdesk');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_helpdesk_notify AFTER INSERT OR UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_helpdesk_change();

-- Notify on kudos received
CREATE OR REPLACE FUNCTION public.notify_kudos_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, company_id, type, title, body, link)
  VALUES (NEW.to_user, NEW.company_id, 'kudos_received', 'You received kudos!',
          NEW.message, '/employee/kudos');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_kudos_notify AFTER INSERT ON public.kudos
  FOR EACH ROW EXECUTE FUNCTION public.notify_kudos_received();

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('helpdesk','helpdesk',false),
  ('chat-attachments','chat-attachments',false)
ON CONFLICT DO NOTHING;

-- helpdesk bucket: company-scoped folder = company_id/ticket_id/file
CREATE POLICY "helpdesk read own company" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='helpdesk' AND (storage.foldername(name))[1] = user_company(auth.uid())::text);
CREATE POLICY "helpdesk upload own company" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='helpdesk' AND (storage.foldername(name))[1] = user_company(auth.uid())::text);
CREATE POLICY "helpdesk delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='helpdesk' AND owner = auth.uid());

CREATE POLICY "chat read own company" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='chat-attachments' AND (storage.foldername(name))[1] = user_company(auth.uid())::text);
CREATE POLICY "chat upload own company" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='chat-attachments' AND (storage.foldername(name))[1] = user_company(auth.uid())::text);