import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2, Target, Lock } from 'lucide-react';
import { toast } from 'sonner';

type Task = { id: string; title: string; description: string | null; priority: 'low'|'medium'|'high';
  status: 'pending'|'in_progress'|'completed'; due_date: string | null;
  is_target: boolean; target_month: string | null; target_count: number | null; progress_count: number;
  parent_task_id: string | null;
  parent_task?: { title: string; status: string } | null;
};

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive', medium: 'default', low: 'secondary',
};

export default function EmployeeTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAction, setUpdatingAction] = useState<{id: string, action: string} | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    // Step 1: fetch tasks without the broken self-referential join
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true });

    if (error) { toast.error(error.message); setLoading(false); return; }

    const rows = (data ?? []) as unknown as Task[];

    // Step 2: fetch parent task info for any sub-tasks (single round-trip)
    const parentIds = [...new Set(rows.map(t => t.parent_task_id).filter(Boolean))] as string[];
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from('tasks')
        .select('id, title, status')
        .in('id', parentIds);

      const parentMap = Object.fromEntries((parents ?? []).map(p => [p.id, p]));
      rows.forEach(t => {
        if (t.parent_task_id && parentMap[t.parent_task_id]) {
          t.parent_task = parentMap[t.parent_task_id] as { title: string; status: string };
        }
      });
    }

    setTasks(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Task['status']) {
    setUpdatingAction({ id, action: status === 'in_progress' ? 'start' : 'complete' });
    const update: any = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from('tasks').update(update).eq('id', id).select();
    setUpdatingAction(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error('Update failed. Access denied or task not found.');
    toast.success(`Task marked ${status.replace('_', ' ')}`);
    load();
  }

  const counts = {
    all: tasks.length, pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length, completed: tasks.filter((t) => t.status === 'completed').length,
  };

  function filter(status?: string) { return status ? tasks.filter((t) => t.status === status) : tasks; }

  async function saveProgress(t: Task, value: number) {
    setUpdatingAction({ id: t.id, action: 'progress' });
    const total = t.target_count ?? 0;
    const v = Math.max(0, Math.min(total || value, value));
    const update: any = { progress_count: v };
    if (total && v >= total) { update.status = 'completed'; update.completed_at = new Date().toISOString(); }
    else if (v > 0) { update.status = 'in_progress'; }
    const { data, error } = await supabase.from('tasks').update(update).eq('id', t.id).select();
    setUpdatingAction(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error('Update failed. Access denied or task not found.');
    toast.success('Progress updated'); load();
  }

  function TargetTaskCard({ t }: { t: Task }) {
    const [draft, setDraft] = useState(String(t.progress_count ?? 0));
    const total = t.target_count ?? 0;
    const pct = total ? Math.min(100, Math.round((t.progress_count / total) * 100)) : 0;
    const monthLabel = t.target_month
      ? new Date(t.target_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';
    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">{t.title}</h4>
              <Badge variant="secondary">{monthLabel}</Badge>
              <StatusBadge status={t.status === 'in_progress' ? 'Ongoing' : t.status === 'completed' ? 'Finished' : 'Not Started'} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.progress_count}/{total} completed</p>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-end gap-2">
          <Input type="number" min={0} max={total || undefined} value={draft}
            onChange={(e) => setDraft(e.target.value)} className="w-28 h-9" />
          <Button size="sm" disabled={updatingAction?.id === t.id || Number(draft) === t.progress_count}
            onClick={() => saveProgress(t, Number(draft))}>
            {updatingAction?.id === t.id && updatingAction.action === 'progress' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
          </Button>
        </div>
      </Card>
    );
  }

  function TaskCard({ t }: { t: Task }) {
    if (t.is_target) return <TargetTaskCard t={t} />;
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h4 className="font-semibold">{t.title}</h4>
          <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
        </div>
        {t.parent_task && t.parent_task.status !== 'completed' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs mb-3">
            <Lock className="h-3 w-3" />
            <span>Locked until <strong>{t.parent_task.title}</strong> is finished.</span>
          </div>
        )}
        {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {t.due_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Due {t.due_date}</span>}
            <StatusBadge status={t.status === 'in_progress' ? 'Ongoing' : t.status === 'completed' ? 'Finished' : 'Not Started'} />
          </div>
          <div className="flex gap-2">
            {t.status !== 'in_progress' && t.status !== 'completed' && (
              <Button size="sm" variant="outline" disabled={updatingAction?.id === t.id || (t.parent_task && t.parent_task.status !== 'completed')} onClick={() => setStatus(t.id, 'in_progress')}>
                {updatingAction?.id === t.id && updatingAction.action === 'start' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Start
              </Button>
            )}
            {t.status !== 'completed' && (
              <Button size="sm" disabled={updatingAction?.id === t.id || (t.parent_task && t.parent_task.status !== 'completed')} onClick={() => setStatus(t.id, 'completed')}>
                {updatingAction?.id === t.id && updatingAction.action === 'complete' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Finish
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  function List({ items }: { items: Task[] }) {
    if (loading) return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;
    if (items.length === 0) return <p className="text-sm text-muted-foreground py-12 text-center">No tasks here.</p>;
    return <div className="space-y-3">{items.map((t) => <TaskCard key={t.id} t={t} />)}</div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Tasks</h1>
          <p className="text-muted-foreground">Track and update your assigned tasks</p>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">Not Started ({counts.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">Ongoing ({counts.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">Finished ({counts.completed})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4"><List items={filter()} /></TabsContent>
          <TabsContent value="pending" className="mt-4"><List items={filter('pending')} /></TabsContent>
          <TabsContent value="in_progress" className="mt-4"><List items={filter('in_progress')} /></TabsContent>
          <TabsContent value="completed" className="mt-4"><List items={filter('completed')} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
