import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: number;
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
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('company_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings({
        ...data,
        office_latitude: Number(data.office_latitude),
        office_longitude: Number(data.office_longitude),
      });
      setLoading(false);
    });
  }, []);

  return { settings, loading, refresh: async () => {
    const { data } = await supabase.from('company_settings').select('*').eq('id', 1).maybeSingle();
    if (data) setSettings({
      ...data,
      office_latitude: Number(data.office_latitude),
      office_longitude: Number(data.office_longitude),
    });
  }};
}
