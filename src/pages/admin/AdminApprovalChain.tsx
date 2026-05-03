import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export default function AdminApprovalChain() {
  const { user } = useAuth();
  const { features, refresh } = useCompanyFeatures();
  const [chain, setChain] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roleLabel, setRoleLabel] = useState('Team Lead');
  const [approver, setApprover] = useState('');

  const load = async () => {
    if (!user?.companyId) return;
    const [c, e] = await Promise.all([
      supabase.from('approval_chains' as any).select('*').eq('company_id', user.companyId).order('step_order'),
      supabase.from('profiles').select('id, full_name, job_title').eq('company_id', user.companyId),
    ]);
    setChain((c.data ?? []) as any[]);
    setEmployees(e.data ?? []);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const toggleEnabled = async (v: boolean) => {
    if (!user?.companyId) return;
    await supabase.from('company_features' as any).upsert({ company_id: user.companyId, multi_level_approvals_enabled: v });
    toast.success(v ? 'Multi-level approvals enabled' : 'Disabled');
    refresh();
  };

  const addStep = async () => {
    if (!approver || !roleLabel.trim() || !user?.companyId) return;
    const next = (chain[chain.length - 1]?.step_order ?? 0) + 1;
    const { error } = await supabase.from('approval_chains' as any).insert({
      company_id: user.companyId, leave_type: 'all', step_order: next,
      role_label: roleLabel.trim(), approver_user_id: approver,
    });
    if (error) return toast.error(error.message);
    setApprover('');
    load();
  };

  const removeStep = async (id: string) => {
    await supabase.from('approval_chains' as any).delete().eq('id', id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Approval Chain</h1><p className="text-sm text-muted-foreground">Configure multi-level leave approvals</p></div>
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Level Approvals</CardTitle>
            <CardDescription>When enabled, leave requests route through these steps in order.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Switch checked={!!features?.multi_level_approvals_enabled} onCheckedChange={toggleEnabled} />
            <Label>Enable for this company</Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Approval Steps</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {chain.length === 0 && <p className="text-sm text-muted-foreground">No steps yet — leave requests go straight to admin.</p>}
            <div className="flex flex-wrap items-center gap-2">
              {chain.map((s, i) => {
                const emp = employees.find(e => e.id === s.approver_user_id);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-2xl border bg-card">
                      <p className="text-xs text-muted-foreground">{s.role_label}</p>
                      <p className="text-sm font-medium">{emp?.full_name ?? '...'}</p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => removeStep(s.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    {i < chain.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 grid gap-2 sm:grid-cols-3">
              <Input placeholder="Role label (e.g. Team Lead)" value={roleLabel} onChange={e => setRoleLabel(e.target.value)} />
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger><SelectValue placeholder="Approver" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={addStep} disabled={!approver}><Plus className="h-4 w-4 mr-2" />Add Step</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
