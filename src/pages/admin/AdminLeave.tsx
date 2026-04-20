import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Leave = { id: string; user_id: string; leave_type: string; start_date: string; end_date: string;
  days: number; reason: string; status: 'pending'|'approved'|'rejected'; admin_notes: string | null;
  profiles?: { full_name: string; department: string | null; email: string };
};

export default function AdminLeave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('leave_requests').select('*, profiles(full_name, department, email)').order('created_at', { ascending: false });
    setLeaves((data as any as Leave[]) ?? []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, status: 'approved'|'rejected') {
    if (!user) return;
    setBusyId(id);
    const { error } = await supabase.from('leave_requests').update({
      status, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`Leave ${status}`);
    load();
  }

  function filtered(s?: string) { return s ? leaves.filter((l) => l.status === s) : leaves; }

  function Row({ l }: { l: Leave }) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div>
            <p className="font-semibold">{l.profiles?.full_name ?? l.user_id}</p>
            <p className="text-xs text-muted-foreground">{l.profiles?.department} · {l.profiles?.email}</p>
          </div>
          <StatusBadge status={l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'pending'} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-2">
          <div><span className="text-muted-foreground text-xs">Type</span><p className="capitalize">{l.leave_type}</p></div>
          <div><span className="text-muted-foreground text-xs">Days</span><p>{l.days}</p></div>
          <div><span className="text-muted-foreground text-xs">Start</span><p>{l.start_date}</p></div>
          <div><span className="text-muted-foreground text-xs">End</span><p>{l.end_date}</p></div>
        </div>
        <p className="text-sm mb-3"><span className="text-muted-foreground text-xs">Reason:</span> {l.reason}</p>
        {l.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" disabled={busyId === l.id} onClick={() => review(l.id, 'approved')}>
              {busyId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Approve</>}
            </Button>
            <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => review(l.id, 'rejected')}>
              <X className="h-3 w-3 mr-1" />Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  function List({ items }: { items: Leave[] }) {
    if (loading) return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">No leave requests.</p>;
    return <div className="space-y-3">{items.map((l) => <Row key={l.id} l={l} />)}</div>;
  }

  const counts = {
    all: leaves.length, pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length, rejected: leaves.filter((l) => l.status === 'rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Review and approve employee leave applications</p>
        </div>
        <Card className="p-6">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4"><List items={filtered('pending')} /></TabsContent>
            <TabsContent value="approved" className="mt-4"><List items={filtered('approved')} /></TabsContent>
            <TabsContent value="rejected" className="mt-4"><List items={filtered('rejected')} /></TabsContent>
            <TabsContent value="all" className="mt-4"><List items={filtered()} /></TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
