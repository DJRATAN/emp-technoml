import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';
import { Lock, Users, Shield, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FEATURE_TIERS: Record<string, { tier: 'basic' | 'pro' | 'enterprise'; label: string }> = {
  tasks_enabled: { tier: 'basic', label: 'Basic' },
  birthdays_enabled: { tier: 'basic', label: 'Basic' },
  chat_enabled: { tier: 'pro', label: 'Pro' },
  kudos_enabled: { tier: 'pro', label: 'Pro' },
  helpdesk_enabled: { tier: 'pro', label: 'Pro' },
  multi_level_approvals_enabled: { tier: 'pro', label: 'Pro' },
  wellbeing_enabled: { tier: 'enterprise', label: 'Enterprise' },
  payroll_export_enabled: { tier: 'enterprise', label: 'Enterprise' },
  ai_analytics_enabled: { tier: 'enterprise', label: 'Enterprise' },
  ip_whitelist_enabled: { tier: 'enterprise', label: 'Enterprise' },
  mock_gps_detection_enabled: { tier: 'enterprise', label: 'Enterprise' },
};

const PLAN_LEVELS = {
  basic: 1,
  pro: 2,
  enterprise: 3,
};

const FLAGS: { key: string; label: string; desc: string }[] = [
  { key: 'tasks_enabled', label: 'Tasks Management', desc: 'Assign and track employee tasks' },
  { key: 'birthdays_enabled', label: 'Birthdays & Events', desc: 'Birthday & work anniversary alerts' },
  { key: 'chat_enabled', label: 'Team Chat', desc: 'Realtime chat communication for employees' },
  { key: 'kudos_enabled', label: 'Kudos Wall', desc: 'Peer recognition wall' },
  { key: 'helpdesk_enabled', label: 'IT Helpdesk', desc: 'Internal ticketing and support system' },
  { key: 'multi_level_approvals_enabled', label: 'Multi-Level Approvals', desc: 'Advanced approval flows' },
  { key: 'wellbeing_enabled', label: 'Wellbeing Hub', desc: 'Employee wellbeing and burnout analytics' },
  { key: 'payroll_export_enabled', label: 'Payroll Export', desc: 'Export attendance & timesheets' },
  { key: 'ai_analytics_enabled', label: 'AI Analytics', desc: 'Smart insights and predictions' },
  { key: 'ip_whitelist_enabled', label: 'IP Whitelisting', desc: 'Restrict check-ins to authorized networks' },
  { key: 'mock_gps_detection_enabled', label: 'Mock GPS Detection', desc: 'Prevent check-ins using fake locations' },
];

export default function AdminFeatures() {
  const { user } = useAuth();
  const { rawFeatures: features, refresh } = useCompanyFeatures();
  const [saving, setSaving] = useState<string | null>(null);
  const [savingVisibility, setSavingVisibility] = useState<string | null>(null);

  const plan = user?.company?.planType || 'basic';

  const toggle = async (key: string, value: boolean) => {
    if (!user?.companyId) return;
    setSaving(key);
    const { error } = await supabase.from('company_features' as any).upsert({ company_id: user.companyId, [key]: value });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    refresh();
  };

  const updateVisibility = async (key: string, visibility: 'all' | 'admin' | 'employee') => {
    if (!user?.companyId) return;
    setSavingVisibility(key);
    const currentVisibility = (features?.feature_visibility as Record<string, any>) || {};
    const updatedVisibility = { ...currentVisibility, [key]: visibility };

    const { error } = await supabase
      .from('company_features' as any)
      .upsert({ 
        company_id: user.companyId, 
        feature_visibility: updatedVisibility 
      });

    setSavingVisibility(null);
    if (error) return toast.error(error.message);
    toast.success('Audience updated');
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">Enable modules for your organization</p>
      </div>

      {/* Subscription Plan Status Card */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 text-white rounded-xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            Subscription Plan
          </span>
          <h2 className="text-xl font-bold font-heading mt-2">
            {user?.company?.name || 'Your Organization'} is on the <span className="capitalize text-indigo-400">{plan}</span> Plan
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {plan === 'basic' && "You have access to core tracking and features. Upgrade to Pro to enable communication, kudos, and helpdesk features."}
            {plan === 'pro' && "You have access to communication and cooperation modules. Upgrade to Enterprise to unlock AI analytics, GPS spoof protection, and custom payroll exports."}
            {plan === 'enterprise' && "Complete enterprise capability. All advanced analytics, integrations, and compliance tools are available."}
          </p>
        </div>
        
        {plan !== 'enterprise' && (
          <Button 
            size="sm" 
            className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md shadow-indigo-600/20 px-5 shrink-0"
            onClick={() => toast.info("Please contact support or your account manager to upgrade your subscription.")}
          >
            Upgrade Plan
          </Button>
        )}
      </div>

      {/* Feature Flags Cards */}
      <div className="grid gap-4 max-w-3xl">
        {FLAGS.map(f => {
          const isChecked = !!(features as any)?.[f.key];
          const isSaving = saving === f.key;
          const tierInfo = FEATURE_TIERS[f.key] || { tier: 'basic', label: 'Basic' };
          const isAllowed = PLAN_LEVELS[plan] >= PLAN_LEVELS[tierInfo.tier];
          
          // Switch is disabled if it's currently saving OR if the feature is not allowed in their plan
          const isDisabled = isSaving || !isAllowed;

          return (
            <Card 
              key={f.key} 
              className={`transition-all duration-200 border-slate-200 dark:border-slate-800 ${
                !isAllowed ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/10' : 'hover:border-primary/20'
              }`}
            >
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base tracking-tight">{f.label}</span>
                    
                    {/* Plan Badge */}
                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                      tierInfo.tier === 'enterprise'
                        ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-400/10 dark:text-purple-400 dark:border-purple-400/20'
                        : tierInfo.tier === 'pro'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-400/10 dark:text-slate-400 dark:border-slate-400/20'
                    }`}>
                      {tierInfo.label}
                    </span>

                    {/* Locked Notice */}
                    {!isAllowed && (
                      <span className="text-[10px] text-amber-500 flex items-center gap-1 font-medium bg-amber-50/50 dark:bg-amber-950/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>

                <div className="flex items-center gap-4">
                  {isChecked && isAllowed && (
                    <div className="w-[160px] shrink-0">
                      <Select 
                        value={(features?.feature_visibility as any)?.[f.key] || 'all'} 
                        disabled={savingVisibility === f.key}
                        onValueChange={v => updateVisibility(f.key, v as any)}
                      >
                        <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:ring-1 focus:ring-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="all" className="rounded-lg text-xs cursor-pointer">
                            <span className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-slate-500" /> Everyone
                            </span>
                          </SelectItem>
                          <SelectItem value="admin" className="rounded-lg text-xs cursor-pointer">
                            <span className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-indigo-500" /> Admins Only
                            </span>
                          </SelectItem>
                          <SelectItem value="employee" className="rounded-lg text-xs cursor-pointer">
                            <span className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-emerald-500" /> Employees Only
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Switch
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={v => toggle(f.key, v)}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
