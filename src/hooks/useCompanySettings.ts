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
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}


export function useCompanySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.companyId) { setLoading(false); return; }
    
    // Fetch both settings and company branding (including name, email, phone, address)
    const [settingsRes, companyRes] = await Promise.all([
      supabase.from('company_settings').select('*').eq('company_id', user.companyId).maybeSingle(),
      supabase.from('companies').select('name, logo_url, theme_color, address, email, phone' as any).eq('id', user.companyId).maybeSingle()
    ]);

    if (settingsRes.data) {
      setSettings({
        ...settingsRes.data,
        office_latitude: Number(settingsRes.data.office_latitude),
        office_longitude: Number(settingsRes.data.office_longitude),
        logo_url: (companyRes.data as any)?.logo_url,
        theme_color: (companyRes.data as any)?.theme_color,
        address: (companyRes.data as any)?.address,
        email: (companyRes.data as any)?.email,
        phone: (companyRes.data as any)?.phone,
      } as CompanySettings);
    } else {
      // Fallback: use data from company table if settings row is missing
      setSettings({
        company_id: user?.companyId ?? '',
        company_name: (companyRes.data as any)?.name || '',
        office_latitude: 0,
        office_longitude: 0,
        geofence_radius_m: 200,
        work_start_time: '09:00',
        work_end_time: '18:00',
        late_threshold_minutes: 15,
        annual_leave_quota: 21,
        sick_leave_quota: 10,
        casual_leave_quota: 7,
        leave_approval_sla_hours: 48,
        face_recognition_sensitivity: 50,
        logo_url: (companyRes.data as any)?.logo_url || null,
        theme_color: (companyRes.data as any)?.theme_color || null,
        address: (companyRes.data as any)?.address || null,
        email: (companyRes.data as any)?.email || null,
        phone: (companyRes.data as any)?.phone || null,
      } as CompanySettings);
    }
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
}
