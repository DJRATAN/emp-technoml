import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Task = { id: string; title: string; description: string | null; priority: 'low'|'medium'|'high';
  status: 'pending'|'in_progress'|'completed'; due_date: string | null; assigned_to: string | null;
  profiles?: { full_name: string } };
type Emp = { id: string; full_name: string };

const priorityVariant: Record<string, 'destructive'|'default'|'secondary'> = { high: 'destructive', medium: 'default', low: 'secondary' };

export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState(''); const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState(''); const [assignee, setAssignee] = useState<string>('');

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([
      supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('status', 'approved').order('full_name'),
    ]);
    setTasks((t.data as any as Task[]) ?? []); setEmployees((p.data as any as Emp[]) ?? []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !assignee) return;
    setSubmitting(true);
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(), description: desc.trim() || null, priority, status: 'pending',
      due_date: dueDate || null, assigned_to: assignee, assigned_by: user.id,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Task created');
    setTitle(''); setDesc(''); setPriority('medium'); setDueDate(''); setAssignee('');
    setOpen(false); load();
  }

  async function remove(id: string) {
    setBusyId(id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success('Task deleted'); load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Tasks</h1>
            <p className="text-muted-foreground">Assign and track tasks across your team</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={1000} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Assign to</Label>
                  <Select value={assignee} onValueChange={setAssignee} required>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No tasks yet. Create the first one.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold">{t.title}</h4>
                      <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
                      <StatusBadge status={t.status === 'in_progress' ? 'in-progress' : t.status === 'completed' ? 'completed' : 'pending'} />
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mb-1">{t.description}</p>}
                    <p className="text-xs text-muted-foreground">Assigned to <span className="font-medium text-foreground">{t.profiles?.full_name ?? 'Unassigned'}</span> · Due {t.due_date ?? '—'}</p>
                  </div>
                  <Button size="sm" variant="ghost" disabled={busyId === t.id} onClick={() => remove(t.id)} className="text-destructive hover:text-destructive">
                    {busyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
