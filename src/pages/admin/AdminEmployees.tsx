import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, X, Loader2, UserMinus, Eye, UserPlus, Mail, Link as LinkIcon, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Profile = {
  id: string; full_name: string; email: string; phone: string | null;
  department: string | null; job_title: string | null; status: 'pending'|'approved'|'rejected'|'suspended';
  employee_internal_id: string | null;
};

export default function AdminEmployees() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDept, setInviteDept] = useState('General');
  const [inviteTitle, setInviteTitle] = useState('Employee');
  const [isInviting, setIsInviting] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Get admin's company ID
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData?.user?.id;
    if (!adminId) return setLoading(false);

    const { data: adminProf } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', adminId)
      .single() as any;
    const companyId = adminProf?.company_id;

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone, department, job_title, status, employee_internal_id');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);



  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: Profile['status']) {
    setBusyId(id);
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    setBusyId(null);
    if (error) return toast.error(error.message);

    // Audit log
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      log(
        status === 'approved' ? 'employee.approved' : status === 'rejected' ? 'employee.rejected' : 'employee.updated',
        'employee',
        id,
        { name: profile.full_name, email: profile.email, new_status: status }
      );
    }

    toast.success(`Employee ${status}`);
    load();
  }

  const filtered = profiles.filter((p) => {
    const s = q.toLowerCase();
    return !s || p.full_name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || (p.department ?? '').toLowerCase().includes(s);
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const { data: adminData } = await supabase.auth.getUser();
    if (!adminData?.user?.id) return;

    // Get company_id from admin profile
    const { data: adminProf } = await supabase.from('profiles').select('company_id').eq('id', adminData.user.id).single() as any;
    if (!adminProf?.company_id) return toast.error('Admin company not found');

    setIsInviting(true);
    try {
      const { data, error } = await supabase.from('invitations' as any).insert({
        company_id: adminProf.company_id,
        email: inviteEmail,
        full_name: inviteName,
        department: inviteDept,
        job_title: inviteTitle
      } as any).select().single() as any;

      if (error) throw error;
      
      setLastToken(data.token);
      log('employee.created', 'employee', null, { email: inviteEmail, name: inviteName, type: 'invitation' });
      toast.success('Invitation created');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInviting(false);
    }
  }

  const pending = profiles.filter((p) => p.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Employees</h1>
            <p className="text-muted-foreground">Approve new accounts and manage your workforce</p>
          </div>
          <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) setLastToken(null); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Invite Employee</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Employee</DialogTitle>
                <DialogDescription>
                  Pre-approve an employee and generate a secure onboarding link.
                </DialogDescription>
              </DialogHeader>
              {!lastToken ? (
                <form onSubmit={handleInvite} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="inv-name">Full Name</Label>
                    <Input id="inv-name" required value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-email">Email Address</Label>
                    <Input id="inv-email" type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="john@company.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={inviteDept} onChange={e => setInviteDept(e.target.value)} placeholder="IT, Sales, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input value={inviteTitle} onChange={e => setInviteTitle(e.target.value)} placeholder="Manager, Developer..." />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isInviting}>
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Invite Link'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="p-4 bg-muted rounded-xl border border-dashed text-center">
                    <p className="text-sm font-medium mb-2">Onboarding Link Generated</p>
                    <div className="flex items-center gap-2 bg-background border p-2 rounded-lg">
                      <code className="text-[10px] flex-1 truncate">{window.location.origin}/onboarding?token={lastToken}</code>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/onboarding?token=${lastToken}`);
                        toast.success('Link copied');
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground">Share this link with {inviteEmail}. It expires in 7 days.</p>
                  <Button variant="outline" className="w-full" onClick={() => { setShowInvite(false); setLastToken(null); }}>Close</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {pending.length > 0 && (
          <Card className="p-6 border-warning/50 bg-warning/5">
            <h3 className="font-heading font-semibold mb-3">Pending Approvals ({pending.length})</h3>
            <div className="space-y-2">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-card border">
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email} · {p.department}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'approved')}>
                      {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Approve</>}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'rejected')}>
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 gap-3">
            <h3 className="font-heading font-semibold">All Employees ({profiles.length})</h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Status</th><th className="py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono text-[10px] text-muted-foreground">{p.employee_internal_id ?? '—'}</td>
                      <td className="py-3 pr-4 font-medium">{p.full_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.email}</td>
                      <td className="py-3 pr-4">{p.department ?? '—'}</td>
                      <td className="py-3 pr-4"><StatusBadge status={p.status === 'approved' ? 'Active' : p.status === 'pending' ? 'Pending' : p.status === 'suspended' ? 'Suspended' : 'Rejected'} /></td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/employees/${p.id}`)}>
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                          {p.status === 'pending' ? (
                            <div className="flex gap-1">
                              <Button size="sm" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'approved')}>
                                {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Approve</>}
                              </Button>
                              <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'rejected')}>
                                <X className="h-3 w-3 mr-1" />Reject
                              </Button>
                            </div>
                          ) : p.status === 'approved' ? (
                            <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'suspended')}>
                              <UserMinus className="h-3 w-3 mr-1" />Suspend
                            </Button>
                          ) : p.status === 'suspended' || p.status === 'rejected' ? (
                            <Button size="sm" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'approved')}>
                              <Check className="h-3 w-3 mr-1" />Reactivate
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
