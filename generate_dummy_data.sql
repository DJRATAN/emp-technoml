-- ============================================================
-- SQL SCRIPT: GENERATE DUMMY DATA FOR HELPDESK, WELLBEING, AUDIT
-- Run this in Supabase Dashboard > SQL Editor
-- 👉 https://supabase.com/dashboard/project/theaotengnvtxlsyudmz/sql/new
-- ============================================================

-- 1. CREATE employee_moods TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.employee_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.employee_moods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'employee_moods' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON employee_moods', pol.policyname);
  END LOOP;
END $$;

-- Create policies
CREATE POLICY "employee_moods_select"
ON public.employee_moods FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "employee_moods_insert"
ON public.employee_moods FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "employee_moods_update"
ON public.employee_moods FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "employee_moods_delete"
ON public.employee_moods FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 2. CLEAR EXISTING MOCK DATA (to avoid duplicate key/constraint conflicts)
-- Define the target company ID
-- Company ID: a4dce0e6-f11e-4054-9b55-4b94f7f5143b
DELETE FROM public.helpdesk_comments WHERE company_id = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
DELETE FROM public.helpdesk_tickets WHERE company_id = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
DELETE FROM public.employee_moods WHERE company_id = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
DELETE FROM public.audit_logs WHERE company_id = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
DELETE FROM public.attendance WHERE company_id = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b' AND date::date >= (CURRENT_DATE - INTERVAL '7 days')::date;

-- 3. INSERT DUMMY DATA FOR HELPDESK
-- Ticket 1: High Priority (IT Support) - In Progress
INSERT INTO public.helpdesk_tickets (id, company_id, title, description, category, priority, status, created_by, assignee_id, due_at, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'MacBook overheating and shutting down',
  'My MacBook Pro starts overheating whenever I run the Docker containers, and then it suddenly shuts down. I need IT support to check the fans or get a replacement.',
  'IT Support',
  'high',
  'in_progress',
  'c57b30ca-08cd-4f12-9420-d0a2adcc4b99', -- Anil Dhakar
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin (gnome0259@gmail.com)
  (CURRENT_DATE + INTERVAL '2 days' + TIME '17:00:00')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '1 day' + TIME '10:00:00')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '1 day' + TIME '14:00:00')::timestamp with time zone
);

INSERT INTO public.helpdesk_comments (id, ticket_id, company_id, author_id, body, created_at)
VALUES 
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Hi Anil, please bring the laptop to the IT desk tomorrow morning. We will run hardware diagnostics and clean the dust from the vents.',
  (CURRENT_DATE - INTERVAL '1 day' + TIME '11:30:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c57b30ca-08cd-4f12-9420-d0a2adcc4b99', -- Anil Dhakar
  'Sure, I will bring it around 10 AM. Thanks!',
  (CURRENT_DATE - INTERVAL '1 day' + TIME '14:00:00')::timestamp with time zone
);

-- Ticket 2: Low Priority (Finance) - Open
INSERT INTO public.helpdesk_tickets (id, company_id, title, description, category, priority, status, created_by, assignee_id, due_at, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'Reimbursement request for high-speed internet',
  'I am working remotely this month and would like to request reimbursement for my home internet bill, as per the company remote work policy. Attached invoice details.',
  'Finance',
  'low',
  'open',
  '80bee59c-1e9a-4fa3-81f4-8d525bbd127a', -- aman
  NULL,
  (CURRENT_DATE + INTERVAL '5 days' + TIME '17:00:00')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '2 days' + TIME '09:15:00')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '2 days' + TIME '09:15:00')::timestamp with time zone
);

-- Ticket 3: Urgent Priority (Access Request) - Resolved
INSERT INTO public.helpdesk_tickets (id, company_id, title, description, category, priority, status, created_by, assignee_id, due_at, resolved_at, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'Blocking access to AWS staging environment',
  'I need access to the AWS Console under the staging account to deploy and test the new authentication microservice. My IAM user hasn''t been created yet.',
  'Access Request',
  'urgent',
  'resolved',
  '39a66252-bef3-423e-88f5-9349e279bfa5', -- Test Employee
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  (CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00')::timestamp with time zone,
  (CURRENT_DATE - TIME '06:00:00')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '1 day' + TIME '08:00:00')::timestamp with time zone,
  (CURRENT_DATE - TIME '06:00:00')::timestamp with time zone
);

INSERT INTO public.helpdesk_comments (id, ticket_id, company_id, author_id, body, created_at)
VALUES 
(
  gen_random_uuid(),
  '33333333-3333-3333-3333-333333333333',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  '39a66252-bef3-423e-88f5-9349e279bfa5', -- Test Employee
  'This is blocking our deployment schedule today.',
  (CURRENT_DATE - INTERVAL '1 day' + TIME '08:05:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  '33333333-3333-3333-3333-333333333333',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Access has been provisioned. You should receive an email invitation to set up your password.',
  (CURRENT_DATE - TIME '08:30:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  '33333333-3333-3333-3333-333333333333',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  '39a66252-bef3-423e-88f5-9349e279bfa5', -- Test Employee
  'Confirmed, I can access AWS now. Resolving the ticket. Thank you!',
  (CURRENT_DATE - TIME '06:00:00')::timestamp with time zone
);


-- 4. INSERT DUMMY DATA FOR WELLBEING (Attendance + Moods)
-- We need 7 days of attendance and today's moods for a couple of employees:

-- Employee A: Anil Dhakar (High Risk)
-- Attendance: Avg shift 10.0 hours (> 9.5 limit)
INSERT INTO public.attendance (user_id, company_id, date, check_in, check_out, location_verified, status)
SELECT 
  'c57b30ca-08cd-4f12-9420-d0a2adcc4b99'::uuid, 
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b'::uuid,
  d::date::text,
  (d + TIME '09:00:00')::timestamp with time zone,
  (d + TIME '19:00:00')::timestamp with time zone, -- 10 hours shift
  true,
  'present'
FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') d;

-- Mood: Today reported 2/5 (Bad)
INSERT INTO public.employee_moods (company_id, user_id, date, score, note)
VALUES ('a4dce0e6-f11e-4054-9b55-4b94f7f5143b', 'c57b30ca-08cd-4f12-9420-d0a2adcc4b99', CURRENT_DATE, 2, 'Workload is getting heavy and Docker is crashing.');


-- Employee B: aman (Medium Risk)
-- Attendance: Avg shift 8.0 hours (Normal workload)
INSERT INTO public.attendance (user_id, company_id, date, check_in, check_out, location_verified, status)
SELECT 
  '80bee59c-1e9a-4fa3-81f4-8d525bbd127a'::uuid, 
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b'::uuid,
  d::date::text,
  (d + TIME '09:00:00')::timestamp with time zone,
  (d + TIME '17:00:00')::timestamp with time zone, -- 8 hours shift
  true,
  'present'
FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') d;

-- Mood: Today reported 1/5 (Terrible) -> Triggers medium risk level (2 points from mood, 0 from hours)
INSERT INTO public.employee_moods (company_id, user_id, date, score, note)
VALUES ('a4dce0e6-f11e-4054-9b55-4b94f7f5143b', '80bee59c-1e9a-4fa3-81f4-8d525bbd127a', CURRENT_DATE, 1, 'Feeling extremely exhausted today.');


-- Employee C: Test Employee (Low Risk)
-- Attendance: Avg shift 9.0 hours (Over 8.5 but <= 9.5 limit -> 1 point)
INSERT INTO public.attendance (user_id, company_id, date, check_in, check_out, location_verified, status)
SELECT 
  '39a66252-bef3-423e-88f5-9349e279bfa5'::uuid, 
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b'::uuid,
  d::date::text,
  (d + TIME '09:00:00')::timestamp with time zone,
  (d + TIME '18:00:00')::timestamp with time zone, -- 9 hours shift
  true,
  'present'
FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') d;

-- Mood: Today reported 4/5 (Good) -> 0 points. Total points: 1 (Low Risk)
INSERT INTO public.employee_moods (company_id, user_id, date, score, note)
VALUES ('a4dce0e6-f11e-4054-9b55-4b94f7f5143b', '39a66252-bef3-423e-88f5-9349e279bfa5', CURRENT_DATE, 4, 'Progress is good on AWS tasks.');


-- Employee D: dj2 clips (No Risk)
-- Attendance: Avg shift 8.0 hours (Normal workload)
INSERT INTO public.attendance (user_id, company_id, date, check_in, check_out, location_verified, status)
SELECT 
  '0dc0a2a1-6bf3-4023-8100-1a9ca3beb9bb'::uuid, 
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b'::uuid,
  d::date::text,
  (d + TIME '09:00:00')::timestamp with time zone,
  (d + TIME '17:00:00')::timestamp with time zone, -- 8 hours shift
  true,
  'present'
FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') d;

-- Mood: Today reported 5/5 (Great) -> 0 points. Total points: 0
INSERT INTO public.employee_moods (company_id, user_id, date, score, note)
VALUES ('a4dce0e6-f11e-4054-9b55-4b94f7f5143b', '0dc0a2a1-6bf3-4023-8100-1a9ca3beb9bb', CURRENT_DATE, 5, 'Loving the team vibes!');


-- 5. INSERT DUMMY DATA FOR AUDIT LOGS
-- 5 sample entries matching configurations
INSERT INTO public.audit_logs (id, company_id, actor_id, actor_name, action, entity_type, entity_id, details, created_at)
VALUES 
(
  gen_random_uuid(),
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Aman Admin',
  'employee.approved',
  'profile',
  '39a66252-bef3-423e-88f5-9349e279bfa5',
  '{"email": "test-id@example.com", "role": "employee", "approved_by": "Aman Admin"}'::jsonb,
  (CURRENT_DATE - TIME '01:15:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Aman Admin',
  'leave.rejected',
  'leave_request',
  '7b8a9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
  '{"employee": "Anil Dhakar", "reason": "Insufficient resources during release window"}'::jsonb,
  (CURRENT_DATE - TIME '02:30:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Aman Admin',
  'feature.toggled',
  'company_features',
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  '{"feature": "wellbeing_enabled", "value": true}'::jsonb,
  (CURRENT_DATE - TIME '04:00:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Aman Admin',
  'attendance.corrected',
  'attendance',
  '9e8d7c6b-5a4f-3e2d-1c0b-9a8f7e6d5c4b',
  '{"employee": "Anil Dhakar", "date": "2026-05-20", "adjusted_check_in": "09:00:00", "adjusted_check_out": "18:00:00"}'::jsonb,
  (CURRENT_DATE - TIME '05:12:00')::timestamp with time zone
),
(
  gen_random_uuid(),
  'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
  'c29b7852-55b3-4068-ab19-6cffbf2295db', -- Admin
  'Aman Admin',
  'broadcast.sent',
  'admin_message',
  '5f4e3d2c-1b0a-9f8e-7d6c-5b4a3e2d1c0b',
  '{"title": "Important Safety Updates", "recipients": "All Staff"}'::jsonb,
  (CURRENT_DATE - TIME '08:45:00')::timestamp with time zone
);
