
DROP POLICY IF EXISTS "service insert login logs" ON public.login_logs;

CREATE POLICY "self insert login log"
  ON public.login_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
