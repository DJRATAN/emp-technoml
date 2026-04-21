import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanySettings {
  company_id: string;
  company_name: string;
  office_latitude: number;
  office_longitude: number;
  geofence_radius_m: number;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
  casual_leave_quota: number;
}

export function useCompanySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.companyId) { setLoading(false); return; }
    const { data } = await supabase.from('company_settings').select('*').eq('company_id', user.companyId).maybeSingle();
    if (data) setSettings({
      ...data,
      office_latitude: Number(data.office_latitude),
      office_longitude: Number(data.office_longitude),
    } as CompanySettings);
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
}
