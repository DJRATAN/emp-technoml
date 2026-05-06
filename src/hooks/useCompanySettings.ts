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
  leave_approval_sla_hours: number;
  face_recognition_sensitivity: number;
  logo_url?: string | null;
  theme_color?: string | null;
}

export function useCompanySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.companyId) { setLoading(false); return; }
    
    // Fetch both settings and company branding
    const [settingsRes, companyRes] = await Promise.all([
      supabase.from('company_settings').select('*').eq('company_id', user.companyId).maybeSingle(),
      supabase.from('companies').select('logo_url, theme_color' as any).eq('id', user.companyId).maybeSingle()
    ]);

    if (settingsRes.data) {
      setSettings({
        ...settingsRes.data,
        office_latitude: Number(settingsRes.data.office_latitude),
        office_longitude: Number(settingsRes.data.office_longitude),
        logo_url: (companyRes.data as any)?.logo_url,
        theme_color: (companyRes.data as any)?.theme_color,
      } as CompanySettings);
    }
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
}
