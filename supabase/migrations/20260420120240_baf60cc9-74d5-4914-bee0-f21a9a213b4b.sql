-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.leave_type AS ENUM ('casual', 'sick', 'annual', 'unpaid');

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  job_title TEXT,
  avatar_url TEXT,
  status public.account_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- ============ COMPANY SETTINGS (single row) ============
CREATE TABLE public.company_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name TEXT NOT NULL DEFAULT 'TechnoML',
  office_latitude NUMERIC NOT NULL DEFAULT 26.3050,
  office_longitude NUMERIC NOT NULL DEFAULT 77.6160,
  geofence_radius_m INT NOT NULL DEFAULT 200,
  work_start_time TIME NOT NULL DEFAULT '09:00',
  work_end_time TIME NOT NULL DEFAULT '18:00',
  late_threshold_minutes INT NOT NULL DEFAULT 15,
  annual_leave_quota INT NOT NULL DEFAULT 12,
  sick_leave_quota INT NOT NULL DEFAULT 8,
  casual_leave_quota INT NOT NULL DEFAULT 6,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT only_one_settings CHECK (id = 1)
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.company_settings (id) VALUES (1);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  selfie_path TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_m NUMERIC,
  location_verified BOOLEAN NOT NULL DEFAULT false,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attendance_user_date ON public.attendance(user_id, date DESC);

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

-- ============ LEAVE REQUESTS ============
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL,
  reason TEXT NOT NULL,
  status public.leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leave_updated BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leave_user ON public.leave_requests(user_id);

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
-- profiles inserted via trigger only (no insert policy needed for users)

-- user_roles (admin-only writes; users can read their own)
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "admins view all roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- company_settings
CREATE POLICY "anyone authed reads settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update settings" ON public.company_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- attendance
CREATE POLICY "users view own attendance" ON public.attendance FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "admins view all attendance" ON public.attendance FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "approved users insert own attendance" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "users update own attendance" ON public.attendance FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "admins update any attendance" ON public.attendance FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- tasks
CREATE POLICY "users view assigned tasks" ON public.tasks FOR SELECT TO authenticated
USING (auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins create tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own task status" ON public.tasks FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete tasks" ON public.tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- leave
CREATE POLICY "users view own leave" ON public.leave_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "admins view all leave" ON public.leave_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "approved users create leave" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "admins update leave" ON public.leave_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, department, job_title, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
    COALESCE(NEW.raw_user_meta_data->>'job_title', 'Employee'),
    'pending'
  );
  -- Default role employee
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE: SELFIES BUCKET (private) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own selfies" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users view own selfies" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "admins view all selfies" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'selfies' AND public.has_role(auth.uid(), 'admin'));

-- ============ AVATARS BUCKET (public) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "users upload own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);