import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyFeatures {
  company_id: string;
  kudos_enabled: boolean;
  birthdays_enabled: boolean;
  chat_enabled: boolean;
  helpdesk_enabled: boolean;
  multi_level_approvals_enabled: boolean;
  ip_whitelist_enabled: boolean;
  mock_gps_detection_enabled: boolean;
  ai_analytics_enabled: boolean;
  payroll_export_enabled: boolean;
  tasks_enabled: boolean;
}

const DEFAULTS: Omit<CompanyFeatures, 'company_id'> = {
  kudos_enabled: true,
  birthdays_enabled: true,
  chat_enabled: true,
  helpdesk_enabled: true,
  multi_level_approvals_enabled: false,
  ip_whitelist_enabled: false,
  mock_gps_detection_enabled: false,
  ai_analytics_enabled: false,
  payroll_export_enabled: false,
  tasks_enabled: true,
};

export function useCompanyFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<CompanyFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    if (!user?.companyId) { setLoading(false); return; }
    const { data } = await supabase
      .from('company_features' as any)
      .select('*')
      .eq('company_id', user.companyId)
      .maybeSingle();
    if (data) setFeatures(data as any);
    else setFeatures({ company_id: user.companyId, ...DEFAULTS });
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  return { features, loading, refresh: fetchFeatures };
}
