import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';

const FLAGS: { key: string; label: string; desc: string }[] = [
  { key: 'kudos_enabled', label: 'Kudos Wall', desc: 'Peer recognition wall' },
  { key: 'birthdays_enabled', label: 'Birthdays', desc: 'Birthday & anniversary alerts' },
  { key: 'chat_enabled', label: 'Team Chat', desc: 'Realtime tenant-scoped chat' },
  { key: 'helpdesk_enabled', label: 'Helpdesk', desc: 'Internal ticketing system' },
  { key: 'multi_level_approvals_enabled', label: 'Multi-Level Approvals', desc: 'Configure under Approval Chain' },
  { key: 'ip_whitelist_enabled', label: 'IP Whitelisting', desc: 'Restrict attendance by IP (coming soon)' },
  { key: 'mock_gps_detection_enabled', label: 'Mock GPS Detection', desc: 'Block fake location apps (coming soon)' },
];

export default function AdminFeatures() {
  const { user } = useAuth();
  const { features, refresh } = useCompanyFeatures();
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: string, value: boolean) => {
    if (!user?.companyId) return;
    setSaving(key);
    const { error } = await supabase.from('company_features' as any).upsert({ company_id: user.companyId, [key]: value });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Feature Flags</h1><p className="text-sm text-muted-foreground">Enable modules for your tenant</p></div>
      <div className="grid gap-4 max-w-3xl">
        {FLAGS.map(f => (
          <Card key={f.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">{f.label}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </div>
              <Switch
                checked={!!(features as any)?.[f.key]}
                disabled={saving === f.key}
                onCheckedChange={v => toggle(f.key, v)}
              />
            </CardHeader>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
