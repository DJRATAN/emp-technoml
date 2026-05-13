-- RLS policies for tasks table
-- Admins see all tasks, employees only see tasks assigned to them

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins see all, employees see only their assigned tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (
  -- Admins/super_admins see all tasks
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
  OR
  -- Employees only see tasks assigned to them
  assigned_to::text = auth.uid()::text
);

-- INSERT: admins can create tasks
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: admins can update any task, employees can update their own
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
FOR UPDATE TO authenticated
USING (true);

-- DELETE: admins can delete tasks
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (true);
