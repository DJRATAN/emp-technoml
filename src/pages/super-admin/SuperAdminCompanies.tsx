import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Building2, Users, Clock, Shield, UserCog, UserCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  status: string;
  created_at: string;
  employee_count?: number;
  owner_name?: string;
}

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
    const { data: cs } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    const { data: profs } = await supabase.from('profiles').select('id, full_name, company_id');
    
    const counts = new Map<string, number>();
    const names = new Map<string, string>();
    
    (profs ?? []).forEach((p) => {
      counts.set(p.company_id, (counts.get(p.company_id) ?? 0) + 1);
      names.set(p.id, p.full_name);
    });
    
    setCompanies((cs ?? []).map((c) => ({ 
      ...c, 
      employee_count: counts.get(c.id) ?? 0,
      owner_name: names.get(c.owner_id) || 'Not Set'
    })));
    setLoading(false);
    loadPending();
  }, [loadPending]);

  async function approveUser(id: string) {
    const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('User approved');
    load();
  }

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
            <h1 className="text-2xl font-heading font-bold">Companies</h1>
            <p className="text-muted-foreground">Manage all tenant organizations on the platform</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Company</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create company + admin owner</DialogTitle></DialogHeader>
                <form onSubmit={createCompany} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Company name</Label>
                    <Input required value={name} onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40));
                    }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company code (auto)</Label>
                    <Input readOnly value={slug} className="bg-muted font-mono" placeholder="auto-generated from name" />
                    <p className="text-xs text-muted-foreground">Auto-generated from the company name. Employees use this code to sign in.</p>
                  </div>
                  <div className="border-t pt-3 space-y-1.5">
                    <Label>Owner / Admin name</Label>
                    <Input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner email</Label>
                    <Input type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Initial password (min 6)</Label>
                    <Input type="password" required minLength={6} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
                      <h4 className="font-heading font-bold text-lg truncate leading-tight">{c.name}</h4>
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
