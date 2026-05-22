import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, ShieldCheck, ShieldAlert, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


type AdminWithPermissions = {
  id: string;
  full_name: string;
  email: string;
  permissions: {
    can_reset_passwords: boolean;
    can_view_chat_history: boolean;
    can_manage_payroll: boolean;
    can_manage_settings: boolean;
    can_approve_leaves: boolean;
  } | null;
};

export default function AdminPermissions() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    setLoading(true);

    // 1. Get all users with 'admin' role in this company
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    
    if (!roles) return setLoading(false);
    const adminIds = roles.map(r => r.user_id);

    // 2. Get profiles and their permissions
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', adminIds);

    const { data: perms, error: permError } = await supabase
      .from('admin_permissions' as any)
      .select('*')
      .eq('company_id', user.companyId);

    // If table is missing, we still show the list but warn
    if (permError && (permError.code === '42P01' || permError.message.includes('cache'))) {
      console.warn('admin_permissions table missing from schema cache');
      toast.error('Permission matrix table missing. Please run the SQL migration.');
    }

    const merged = (profiles || []).map(p => ({
      ...p,
      permissions: (perms as any[])?.find((pr: any) => pr.admin_id === p.id) || null
    })) as unknown as AdminWithPermissions[];

    setAdmins(merged.filter(a => a.id !== user.id)); // Don't manage self here for safety
    setLoading(false);
  }, [user?.companyId, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function togglePermission(adminId: string, field: keyof AdminWithPermissions['permissions'], value: boolean) {
    const admin = admins.find(a => a.id === adminId);
    if (!admin || !user?.companyId) return;

    setSaving(adminId);
    
    const newPerms = {
      ...(admin.permissions || {
        can_reset_passwords: false,
        can_view_chat_history: false,
        can_manage_payroll: false,
        can_manage_settings: false,
        can_approve_leaves: true,
      }),
      [field]: value
    };

    // Check if a record exists for this admin — id column may be NULL so match on admin_id+company_id
    const { data: existing } = await supabase
      .from('admin_permissions' as any)
      .select('admin_id')
      .eq('company_id', user.companyId)
      .eq('admin_id', adminId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update by admin_id + company_id (id column has no default and may be NULL)
      const result = await supabase
        .from('admin_permissions' as any)
        .update({ ...newPerms, updated_at: new Date().toISOString() })
        .eq('company_id', user.companyId)
        .eq('admin_id', adminId);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('admin_permissions' as any)
        .insert({
          admin_id: adminId,
          company_id: user.companyId,
          ...newPerms,
          updated_at: new Date().toISOString()
        });
      error = result.error;
    }

    setSaving(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Permission updated');
    load();
  }

  if (loading) return <DashboardLayout><div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Admin Permission Matrix
          </h1>
          <p className="text-muted-foreground">Define granular access for other administrators in your company.</p>
        </div>

        <div className="grid gap-6">
          {admins.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No other administrators found in your company.</p>
            </Card>
          ) : (
            admins.map(admin => (
              <Card key={admin.id} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-semibold text-lg">{admin.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  {saving === admin.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <PermissionToggle 
                    label="Reset Passwords" 
                    description="Allow admin to reset employee passwords"
                    checked={admin.permissions?.can_reset_passwords || false}
                    onChange={(v) => togglePermission(admin.id, 'can_reset_passwords', v)}
                    disabled={saving === admin.id}
                  />
                  <PermissionToggle 
                    label="Manage Payroll" 
                    description="Access to salary and payroll management"
                    checked={admin.permissions?.can_manage_payroll || false}
                    onChange={(v) => togglePermission(admin.id, 'can_manage_payroll', v)}
                    disabled={saving === admin.id}
                  />
                  <PermissionToggle 
                    label="View Chat History" 
                    description="Read all employee group chat history"
                    checked={admin.permissions?.can_view_chat_history || false}
                    onChange={(v) => togglePermission(admin.id, 'can_view_chat_history', v)}
                    disabled={saving === admin.id}
                  />
                  <PermissionToggle 
                    label="Manage Settings" 
                    description="Modify geofencing and company rules"
                    checked={admin.permissions?.can_manage_settings || false}
                    onChange={(v) => togglePermission(admin.id, 'can_manage_settings', v)}
                    disabled={saving === admin.id}
                  />
                  <PermissionToggle 
                    label="Approve Leaves" 
                    description="Can approve or reject leave requests"
                    checked={admin.permissions?.can_approve_leaves ?? true}
                    onChange={(v) => togglePermission(admin.id, 'can_approve_leaves', v)}
                    disabled={saving === admin.id}
                  />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function PermissionToggle({ label, description, checked, onChange, disabled }: { label: string, description: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
