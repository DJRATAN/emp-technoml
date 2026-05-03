import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TicketIcon, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const priorityColor = (p: string) => p === 'urgent' ? 'destructive' : p === 'high' ? 'default' : 'secondary';

export default function AdminHelpdesk() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    if (!user?.companyId) return;
    let q = supabase.from('helpdesk_tickets' as any).select('*').eq('company_id', user.companyId).order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    const list = (data ?? []) as any[];
    const ids = Array.from(new Set(list.flatMap(t => [t.created_by, t.assignee_id]).filter(Boolean)));
    const { data: profs } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] };
    const map = new Map((profs ?? []).map(p => [p.id, p.full_name]));
    setTickets(list.map(t => ({ ...t, creatorName: map.get(t.created_by), assigneeName: t.assignee_id ? map.get(t.assignee_id) : null })));

    const { data: emps } = await supabase.from('profiles').select('id, full_name').eq('company_id', user.companyId);
    setEmployees(emps ?? []);
  };

  const loadComments = async (id: string) => {
    const { data } = await supabase.from('helpdesk_comments' as any).select('*').eq('ticket_id', id).order('created_at');
    setComments((data ?? []) as any[]);
  };

  useEffect(() => { load(); }, [user?.companyId, filter]);
  useEffect(() => { if (active) loadComments(active.id); }, [active?.id]);

  const updateTicket = async (id: string, patch: any) => {
    if (patch.status && (patch.status === 'resolved' || patch.status === 'closed')) {
      patch.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('helpdesk_tickets' as any).update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    load();
    if (active?.id === id) setActive({ ...active, ...patch });
  };

  const addComment = async () => {
    if (!newComment.trim() || !active || !user?.companyId) return;
    const { error } = await supabase.from('helpdesk_comments' as any).insert({
      ticket_id: active.id, company_id: user.companyId, author_id: user.id, body: newComment.trim().slice(0, 1000),
    });
    if (error) return toast.error(error.message);
    setNewComment('');
    loadComments(active.id);
  };

  const overdue = (t: any) => t.status !== 'resolved' && t.status !== 'closed' && new Date(t.due_at) < new Date();

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-heading font-semibold">Helpdesk</h1><p className="text-sm text-muted-foreground">Manage employee tickets</p></div>
      <div className="flex justify-end mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tickets ({tickets.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-auto">
            {tickets.map(t => (
              <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-2xl border ${active?.id === t.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm flex-1 truncate">{t.title}</span>
                  {overdue(t) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <Badge variant={priorityColor(t.priority) as any}>{t.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge className="text-[10px]" variant="outline">{t.status}</Badge>
                  <span>by {t.creatorName ?? '...'}</span>
                  <Clock className="h-3 w-3 ml-auto" /><span className={overdue(t) ? 'text-destructive font-medium' : ''}>Due {formatDate(t.due_at)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TicketIcon className="h-5 w-5" />{active?.title ?? 'Select a ticket'}</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-auto">
            {!active && <p className="text-sm text-muted-foreground">Pick a ticket from the list.</p>}
            {active && (
              <>
                <p className="text-sm whitespace-pre-wrap">{active.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={active.status} onValueChange={v => updateTicket(active.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={active.assignee_id ?? 'unassigned'} onValueChange={v => updateTicket(active.id, { assignee_id: v === 'unassigned' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-3 space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className="text-sm p-2 rounded-xl bg-muted">
                      <p className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</p>
                      {c.body}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Reply…" maxLength={1000} />
                    <Button onClick={addComment}>Post</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
