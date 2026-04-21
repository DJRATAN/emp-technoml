import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, X, Loader2, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

type Profile = {
  id: string; full_name: string; email: string; phone: string | null;
  department: string | null; job_title: string | null; status: 'pending'|'approved'|'rejected'|'suspended';
};

export default function AdminEmployees() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, phone, department, job_title, status').order('created_at', { ascending: false });
    setProfiles((data as Profile[]) ?? []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: Profile['status']) {
    setBusyId(id);
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`Employee ${status}`);
    load();
  }

  const filtered = profiles.filter((p) => {
    const s = q.toLowerCase();
    return !s || p.full_name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || (p.department ?? '').toLowerCase().includes(s);
  });

  const pending = profiles.filter((p) => p.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Employees</h1>
          <p className="text-muted-foreground">Approve new accounts and manage your workforce</p>
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
                  <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Status</th><th className="py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{p.full_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.email}</td>
                      <td className="py-3 pr-4">{p.department ?? '—'}</td>
                      <td className="py-3 pr-4">{p.job_title ?? '—'}</td>
                      <td className="py-3 pr-4"><StatusBadge status={p.status === 'approved' ? 'Active' : p.status === 'pending' ? 'Pending' : p.status === 'suspended' ? 'Suspended' : 'Rejected'} /></td>
                      <td className="py-3">
                        {p.status === 'approved' ? (
                          <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'suspended')}>
                            <UserMinus className="h-3 w-3 mr-1" />Suspend
                          </Button>
                        ) : p.status === 'suspended' || p.status === 'rejected' ? (
                          <Button size="sm" disabled={busyId === p.id} onClick={() => changeStatus(p.id, 'approved')}>
                            <Check className="h-3 w-3 mr-1" />Reactivate
                          </Button>
                        ) : null}
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
