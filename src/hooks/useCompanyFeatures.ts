import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyFeatures {
  company_id: string;
  // Basic
  tasks_enabled: boolean;
  birthdays_enabled: boolean;
  // Pro
  chat_enabled: boolean;
  kudos_enabled: boolean;
  helpdesk_enabled: boolean;
  multi_level_approvals_enabled: boolean;
  // Enterprise
  ai_analytics_enabled: boolean;
  payroll_export_enabled: boolean;
  ip_whitelist_enabled: boolean;
  mock_gps_detection_enabled: boolean;
  wellbeing_enabled: boolean;
  feature_visibility?: Record<string, 'all' | 'admin' | 'employee'> | null;
}

export function gateFeaturesByRole(
  features: CompanyFeatures,
  role: string,
  isOwner?: boolean
): CompanyFeatures {
  // Admins, owners, and super admins are never restricted by feature visibility settings
  if (role === 'super_admin' || role === 'admin' || isOwner) return features;

  const gated = { ...features };
  const visibility = (features.feature_visibility as Record<string, 'all' | 'admin' | 'employee'>) || {};

  const allKeys: (keyof Omit<CompanyFeatures, 'company_id' | 'feature_visibility'>)[] = [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled',
    'helpdesk_enabled', 'multi_level_approvals_enabled', 'ai_analytics_enabled',
    'payroll_export_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled',
    'wellbeing_enabled'
  ];

  allKeys.forEach(k => {
    const rule = visibility[k] || 'all';

    if (role === 'employee') {
      // Employees are blocked from admin-only features
      if (rule === 'admin') {
        gated[k] = false;
      }
    }
  });

  return gated;
}

const PLAN_DEFAULTS: Record<'basic' | 'pro' | 'enterprise', (keyof Omit<CompanyFeatures, 'company_id'>)[]> = {
  basic: ['tasks_enabled', 'birthdays_enabled'],
  pro: ['tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled', 'helpdesk_enabled', 'multi_level_approvals_enabled'],
  enterprise: [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled',
    'helpdesk_enabled', 'multi_level_approvals_enabled', 'ai_analytics_enabled',
    'payroll_export_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled',
    'wellbeing_enabled'
  ]
};

export function getDefaultsForPlan(plan: string): Omit<CompanyFeatures, 'company_id'> {
  const normPlan = (plan === 'pro' || plan === 'enterprise') ? plan : 'basic';
  const enabledKeys = PLAN_DEFAULTS[normPlan];
  const defaults: any = {};
  
  const allKeys: (keyof Omit<CompanyFeatures, 'company_id'>)[] = [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled',
    'helpdesk_enabled', 'multi_level_approvals_enabled', 'ai_analytics_enabled',
    'payroll_export_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled',
    'wellbeing_enabled'
  ];

  allKeys.forEach(k => {
    defaults[k] = enabledKeys.includes(k);
  });

  return defaults;
}


export function gateFeaturesByPlan(features: CompanyFeatures, plan: string): CompanyFeatures {
  const normPlan = (plan === 'pro' || plan === 'enterprise') ? plan : 'basic';
  const allowedKeys = PLAN_DEFAULTS[normPlan];
  const gated = { ...features };
  
  const allKeys: (keyof Omit<CompanyFeatures, 'company_id'>)[] = [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled',
    'helpdesk_enabled', 'multi_level_approvals_enabled', 'ai_analytics_enabled',
    'payroll_export_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled',
    'wellbeing_enabled'
  ];

  allKeys.forEach(k => {
    // If the database has it enabled, keep it enabled (super-admin override).
    // Otherwise, if it is not in the plan, force it to false.
    if (!allowedKeys.includes(k) && !features[k]) {
      gated[k] = false;
    }
  });

  return gated;
}

let cachedFeatures: CompanyFeatures | null = null;
let activeFetchPromise: Promise<any> | null = null;
const subscribers = new Set<(f: CompanyFeatures | null) => void>();

// Module-level singleton channel — only one per company across all components
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeCompanyId: string | null = null;

function notifyAll(f: CompanyFeatures | null) {
  subscribers.forEach(sub => sub(f));
}

function ensureRealtimeChannel(companyId: string, onRefresh: () => void) {
  if (realtimeChannel && realtimeCompanyId === companyId) return; // already set up

  const channelName = `company-features-${companyId}`;

  // Clean up old channel if company changed
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('Error removing channel:', e);
    }
    realtimeChannel = null;
  }

  // Force-remove any pre-existing channel with this name in Supabase's client cache
  // to avoid adding callbacks to already subscribed channels after HMR resets module variables.
  try {
    const existing = supabase.channel(channelName);
    if (existing) {
      supabase.removeChannel(existing);
    }
  } catch (e) {
    console.warn('Error cleaning up existing channel cache:', e);
  }

  realtimeCompanyId = companyId;
  realtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'company_features', filter: `company_id=eq.${companyId}` },
      () => {
        cachedFeatures = null; // Bust cache
        onRefresh();           // Force re-fetch for all subscribers
      }
    )
    .subscribe();
}

export function useCompanyFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<CompanyFeatures | null>(cachedFeatures);
  const [loading, setLoading] = useState(cachedFeatures === null);

  const plan = user?.company?.planType || 'basic';
  const defaults = getDefaultsForPlan(plan);
  const fallbackFeatures = { company_id: user?.companyId || '', ...defaults } as CompanyFeatures;

  const fetchFeatures = useCallback(async (force = false) => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }

    if (cachedFeatures && !force) {
      setFeatures(cachedFeatures);
      setLoading(false);
      return;
    }

    if (!cachedFeatures) setLoading(true);

    if (activeFetchPromise && !force) {
      try {
        await activeFetchPromise;
        setFeatures(cachedFeatures);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
      return;
    }

    activeFetchPromise = supabase
      .from('company_features' as any)
      .select('*')
      .eq('company_id', user.companyId)
      .maybeSingle();

    try {
      const { data, error } = await activeFetchPromise;
      if (error) throw error;
      const plan = user?.company?.planType || 'basic';
      const resolvedDb = data
        ? (data as CompanyFeatures)
        : ({ company_id: user.companyId, ...getDefaultsForPlan(plan) } as CompanyFeatures);
      const resolved = gateFeaturesByPlan(resolvedDb, plan);

      const changed = JSON.stringify(cachedFeatures) !== JSON.stringify(resolved);
      cachedFeatures = resolved;

      if (changed || force) {
        setFeatures(resolved);
        notifyAll(resolved);
      }
    } catch (e) {
      console.error('useCompanyFeatures fetch error:', e);
    } finally {
      activeFetchPromise = null;
      setLoading(false);
    }
  }, [user?.companyId, user?.company?.planType]);

  useEffect(() => {
    if (!user?.companyId) return;

    // Clear cache if company changed
    if (cachedFeatures && cachedFeatures.company_id !== user.companyId) {
      cachedFeatures = null;
      setFeatures(null);
      setLoading(true);
    }

    const handleUpdate = (f: CompanyFeatures | null) => {
      setFeatures(f);
      setLoading(false);
    };

    subscribers.add(handleUpdate);
    fetchFeatures();

    // Set up singleton Realtime channel (safe to call multiple times — only creates once)
    ensureRealtimeChannel(user.companyId, () => fetchFeatures(true));

    return () => {
      subscribers.delete(handleUpdate);
      // Don't remove the channel here — it's shared across all components
    };
  }, [fetchFeatures, user?.companyId]);

  const resolvedFeatures = (features || fallbackFeatures) as CompanyFeatures;
  const roleGatedFeatures = gateFeaturesByRole(resolvedFeatures, user?.role || 'employee', user?.isOwner);

  return {
    features: roleGatedFeatures,
    rawFeatures: resolvedFeatures,
    loading,
    refresh: () => fetchFeatures(true),
  };
}
