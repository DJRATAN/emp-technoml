
-- Admin Communication Hub
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  message_type TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  body TEXT NOT NULL,
  attachment_url TEXT,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  disable_replies BOOLEAN NOT NULL DEFAULT false,
  require_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_messages_receiver ON public.admin_messages(receiver_id, created_at DESC);
CREATE INDEX idx_admin_messages_company ON public.admin_messages(company_id, created_at DESC);

-- Admin can manage all messages in their company
CREATE POLICY "admin manage messages" ON public.admin_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()));

-- Employees can read messages sent to them or broadcast
CREATE POLICY "employee read own messages" ON public.admin_messages FOR SELECT TO authenticated
  USING (receiver_id = auth.uid() OR (is_broadcast = true AND company_id = user_company(auth.uid())));

-- Employees can update their own messages (read_at, acknowledged_at)
CREATE POLICY "employee update own messages" ON public.admin_messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());

-- Super admin full access
CREATE POLICY "super admin all messages" ON public.admin_messages FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;

-- Password Reset Audit Log
CREATE TABLE public.password_reset_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read audit" ON public.password_reset_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = user_company(auth.uid()));

CREATE POLICY "super admin all audit" ON public.password_reset_audit FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Allow edge function inserts (service role handles this, but also allow admin insert)
CREATE POLICY "admin insert audit" ON public.password_reset_audit FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- Fix: ensure id-cards bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for id-cards bucket (admin)
CREATE POLICY "admin upload id-cards" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin read id-cards" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-cards' AND (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "admin update id-cards" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete id-cards" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'id-cards' AND has_role(auth.uid(), 'admin'::app_role));
