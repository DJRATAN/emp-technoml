import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Building2, Users, Clock, Shield, UserCog, UserCheck, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  status: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  created_at: string;
  employee_count?: number;
  owner_name?: string;
}

const ALL_FEATURES = [
  { key: 'chat_enabled', label: 'Team Chat', description: 'Enable realtime chat between employees' },
  { key: 'tasks_enabled', label: 'Tasks Management', description: 'Assign and track tasks' },
  { key: 'kudos_enabled', label: 'Kudos Wall', description: 'Employee recognition platform' },
  { key: 'birthdays_enabled', label: 'Birthdays & Events', description: 'Celebrate team milestones' },
  { key: 'helpdesk_enabled', label: 'IT Helpdesk', description: 'Ticketing system for internal support' },
  { key: 'ai_analytics_enabled', label: 'AI Analytics', description: 'Smart insights and predictions' },
  { key: 'payroll_export_enabled', label: 'Payroll Export', description: 'Export attendance to payroll formats' },
  { key: 'multi_level_approvals_enabled', label: 'Multi-Level Approvals', description: 'Advanced approval workflows' },
  { key: 'ip_whitelist_enabled', label: 'IP Whitelisting', description: 'Restrict access by IP address' },
  { key: 'mock_gps_detection_enabled', label: 'Mock GPS Detection', description: 'Prevent fake location check-ins' },
];

const PLAN_DEFAULTS: Record<string, string[]> = {
  basic: ['tasks_enabled', 'birthdays_enabled'],
  pro: ['tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled', 'helpdesk_enabled'],
  enterprise: [
    'tasks_enabled', 'birthdays_enabled', 'chat_enabled', 'kudos_enabled', 
    'helpdesk_enabled', 'ai_analytics_enabled', 'payroll_export_enabled', 
    'multi_level_approvals_enabled', 'ip_whitelist_enabled', 'mock_gps_detection_enabled'
  ]
};

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [usersOpen, setUsersOpen] = useState(false);
  const [managingCompany, setManagingCompany] = useState<CompanyRow | null>(null);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [configuringCompany, setConfiguringCompany] = useState<CompanyRow | null>(null);
  const [currentFeatures, setCurrentFeatures] = useState<any>({});
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const loadCompanyUsers = async (company: CompanyRow) => {
    setManagingCompany(company);
    setUsersOpen(true);
    setUsersLoading(true);
    
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, job_title, status')
      .eq('company_id', company.id);
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', (profs ?? []).map(p => p.id));
    
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
    setCompanyUsers((profs ?? []).map(p => ({
      ...p,
      role: roleMap.get(p.id) || 'employee'
    })));
    setUsersLoading(false);
  };

  async function promoteToAdmin(userId: string) {
    const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
    if (error) return toast.error(error.message);
    toast.success('User promoted to Admin');
    if (managingCompany) loadCompanyUsers(managingCompany);
  }

  async function demoteToEmployee(userId: string) {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    if (error) return toast.error(error.message);
    toast.success('User demoted to Employee');
    if (managingCompany) loadCompanyUsers(managingCompany);
  }

  async function makeOwner(userId: string) {
    if (!managingCompany) return;
    const { error } = await supabase.from('companies').update({ owner_id: userId }).eq('id', managingCompany.id);
    if (error) return toast.error(error.message);
    
    // Also ensure they are an admin
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
    
    toast.success('Company owner updated');
    load(); // Refresh global list
    setUsersOpen(false);
  }

  async function handleUserPasswordReset() {
    if (!resettingUserId || resetPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
        body: { 
          userId: resettingUserId, 
          newPassword: resetPassword,
          action: 'password'
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to reset password');
      toast.success('Password updated successfully');
      setResettingUserId(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  }

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, companies:company_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingUsers(data ?? []);
    setPendingLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cs } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      
      // Efficiently count employees per company using a single query if possible, 
      // or map them if the list is small enough. For now, let's use the count feature.
      const companiesWithCounts = await Promise.all((cs ?? []).map(async (c) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', c.id);
        
        // Also get owner name
        let ownerName = 'Not Set';
        if (c.owner_id) {
          const { data: owner } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', c.owner_id)
            .maybeSingle();
          if (owner) ownerName = owner.full_name;
        }

        return { 
          ...c, 
          employee_count: count ?? 0,
          owner_name: ownerName
        };
      }));
      
      setCompanies(companiesWithCounts);
    } catch (err) {
      console.error('Error loading companies:', err);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
      loadPending();
    }
  }, [loadPending]);

  async function approveUser(id: string) {
    const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('User approved');
    load();
  }

  const loadFeatures = async (company: CompanyRow) => {
    setConfiguringCompany(company);
    setFeaturesOpen(true);
    setFeaturesLoading(true);
    const { data } = await supabase.from('company_features' as any).select('*').eq('company_id', company.id).maybeSingle();
    setCurrentFeatures(data || {});
    setFeaturesLoading(false);
  };

  const updateFeature = async (key: string, value: boolean) => {
    if (!configuringCompany) return;
    setCurrentFeatures(prev => ({ ...prev, [key]: value }));
  };

  const applyPlanDefaults = (plan: string) => {
    if (!configuringCompany) return;
    const defaults = PLAN_DEFAULTS[plan] || [];
    const newFeatures: any = {};
    ALL_FEATURES.forEach(f => {
      newFeatures[f.key] = defaults.includes(f.key);
    });
    setCurrentFeatures(newFeatures);
    setConfiguringCompany({ ...configuringCompany, plan_type: plan as any });
  };

  const saveAllFeatures = async () => {
    if (!configuringCompany) return;
    setSavingFeatures(true);
    const { error } = await supabase.from('company_features' as any).upsert({
      company_id: configuringCompany.id,
      ...currentFeatures
    });
    
    // Also update plan type
    await supabase.from('companies').update({ plan_type: configuringCompany.plan_type }).eq('id', configuringCompany.id);
    
    setSavingFeatures(false);
    if (error) return toast.error(error.message);
    toast.success('Features updated');
    setFeaturesOpen(false);
    load();
  };

  useEffect(() => { load(); }, [load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !ownerEmail.trim() || !ownerName.trim() || ownerPassword.length < 6) {
      toast.error('Fill all fields (password ≥ 6 chars)'); return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-company', {
        body: {
          company: { name: name.trim(), slug: slug.trim().toLowerCase() },
          owner: { email: ownerEmail.trim(), full_name: ownerName.trim(), password: ownerPassword },
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error ?? error?.message ?? 'Failed to create company');
      }
      toast.success(`Company "${name}" created with admin ${ownerEmail}`);
      setName(''); setSlug(''); setOwnerEmail(''); setOwnerName(''); setOwnerPassword('');
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany || !editName.trim() || !editSlug.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('companies').update({
      name: editName.trim(),
      slug: editSlug.trim().toLowerCase(),
    }).eq('id', editingCompany.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Company updated');
    setEditOpen(false);
    load();
  }

  async function toggleStatus(c: CompanyRow) {
    const next = c.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('companies').update({ status: next }).eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success(`Company ${next}`);
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Platform Administration</h1>
            <p className="text-muted-foreground">Global control for {companies.length} tenant organizations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" />New Organization</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Provision New Company
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={createCompany} className="space-y-4 pt-2">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input required placeholder="e.g. Acme Corp" value={name} onChange={(e) => {
                        const v = e.target.value;
                        setName(v);
                        setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40));
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Slug / Code</Label>
                      <div className="relative">
                        <Input readOnly value={slug} className="bg-muted font-mono pr-10" />
                        <Lock className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">This unique code is used by employees to sign in.</p>
                    </div>
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Administrator</Label>
                      <div className="space-y-2">
                        <Label className="text-xs">Full Name</Label>
                        <Input required placeholder="John Doe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Work Email</Label>
                        <Input type="email" required placeholder="admin@company.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Initial Password</Label>
                        <Input type="password" required minLength={6} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Provision Organization'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-primary/5 border-primary/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tenants</p>
              <p className="text-2xl font-bold">{companies.length}</p>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Platform Users</p>
              <p className="text-2xl font-bold">{companies.reduce((acc, c) => acc + (c.employee_count || 0), 0)}</p>
            </div>
          </Card>
          <Card className="p-4 bg-amber-500/5 border-amber-500/10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Status</p>
              <p className="text-2xl font-bold">Healthy</p>
            </div>
          </Card>
        </div>

        {pendingUsers.length > 0 && (
          <Card className="p-6 border-warning/50 bg-warning/5">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2 text-warning">
              <Clock className="h-4 w-4" /> Pending Platform Accounts ({pendingUsers.length})
            </h3>
            <p className="text-xs text-muted-foreground mb-4 font-body">Users who signed up or were created and are awaiting global approval.</p>
            <div className="space-y-2">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-sm">
                  <div>
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.email} · <span className="text-primary">{u.companies?.name || 'No Company'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveUser(u.id)}>Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
            <form onSubmit={updateCompany} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Company code (slug)</Label>
                <Input required value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="font-mono" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Management Dialog */}
        <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" /> 
                Manage Users - {managingCompany?.name}
              </DialogTitle>
            </DialogHeader>
            {usersLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {companyUsers.map((u) => {
                    const isOwner = managingCompany?.owner_id === u.id;
                    return (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                        <div className="min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            {u.full_name} 
                            {isOwner && <Badge className="bg-amber-500 hover:bg-amber-600 border-none flex items-center gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email} · {u.job_title}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="capitalize">
                              {u.role}
                            </Badge>
                            
                            {!isOwner && (
                              <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => makeOwner(u.id)}>
                                <UserCheck className="h-3 w-3 mr-1" /> Make Owner
                              </Button>
                            )}
                            
                            {u.role === 'employee' ? (
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => promoteToAdmin(u.id)}>
                                Promote to Admin
                              </Button>
                            ) : (
                              !isOwner && (
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => demoteToEmployee(u.id)}>
                                  Demote to Employee
                                </Button>
                              )
                            )}
                            
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setResettingUserId(resettingUserId === u.id ? null : u.id)}>
                              <Lock className="h-3 w-3 mr-1" /> Reset
                            </Button>
                          </div>

                          {resettingUserId === u.id && (
                            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                              <Input 
                                size={1} 
                                className="h-8 text-xs w-32" 
                                placeholder="New password" 
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                              />
                              <Button size="sm" className="h-8 text-xs" onClick={handleUserPasswordReset} disabled={isResetting}>
                                {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Features Management Dialog */}
        <Dialog open={featuresOpen} onOpenChange={setFeaturesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Feature Gating - {configuringCompany?.name}
              </DialogTitle>
            </DialogHeader>
            
            {featuresLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="space-y-6 pt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Subscription Tier</Label>
                    <div className="flex gap-2">
                      {['basic', 'pro', 'enterprise'].map((t) => (
                        <Button 
                          key={t}
                          type="button"
                          variant={configuringCompany?.plan_type === t ? 'default' : 'outline'}
                          className="flex-1 capitalize"
                          onClick={() => applyPlanDefaults(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Enabled Modules</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {ALL_FEATURES.map((f) => (
                        <div key={f.key} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                          <div className="min-w-0 pr-2">
                            <p className="text-sm font-semibold">{f.label}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{f.description}</p>
                          </div>
                          <div 
                            className={`h-5 w-10 rounded-full cursor-pointer transition-colors relative ${currentFeatures[f.key] ? 'bg-primary' : 'bg-muted'}`}
                            onClick={() => updateFeature(f.key, !currentFeatures[f.key])}
                          >
                            <div className={`absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-transform ${currentFeatures[f.key] ? 'translate-x-5' : ''}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button className="w-full" onClick={saveAllFeatures} disabled={savingFeatures}>
                  {savingFeatures ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Configuration'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No companies yet.</p>
          ) : (
            <div className="space-y-4">
              {companies.map((c) => (
                <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/50 hover:border-primary/20 transition-colors shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-lg truncate leading-tight flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-[10px] uppercase py-0 px-1.5 h-4 font-bold border-primary/20 text-primary bg-primary/5">
                          {c.plan_type || 'basic'}
                        </Badge>
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">{c.slug}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-amber-500" /> 
                          <span className="font-medium text-foreground">{c.owner_name}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 mr-2">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary/60" />{c.employee_count}
                      </span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="rounded-md uppercase text-[10px] tracking-wider">
                        {c.status}
                      </Badge>
                    </div>
                    
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadFeatures(c)}>
                      <Shield className="h-4 w-4" /> Features
                    </Button>

                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadCompanyUsers(c)}>
                      <UserCog className="h-4 w-4" /> Users
                    </Button>
                    
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingCompany(c);
                      setEditName(c.name);
                      setEditSlug(c.slug);
                      setEditOpen(true);
                    }}>Edit</Button>
                    
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </DashboardLayout>
  );
}
