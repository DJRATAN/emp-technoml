import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Task = { id: string; title: string; description: string | null; priority: 'low'|'medium'|'high';
  status: 'pending'|'in_progress'|'completed'; due_date: string | null; };

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive', medium: 'default', low: 'secondary',
};

export default function EmployeeTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('tasks').select('*').eq('assigned_to', user.id).order('due_date', { ascending: true });
    if (error) toast.error(error.message);
    setTasks((data as Task[]) ?? []); setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Task['status']) {
    setUpdatingId(id);
    const update: any = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    const { error } = await supabase.from('tasks').update(update).eq('id', id);
    setUpdatingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Task marked ${status.replace('_', ' ')}`);
    load();
  }

  const counts = {
    all: tasks.length, pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length, completed: tasks.filter((t) => t.status === 'completed').length,
  };

  function filter(status?: string) { return status ? tasks.filter((t) => t.status === status) : tasks; }

  function TaskCard({ t }: { t: Task }) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h4 className="font-semibold">{t.title}</h4>
          <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
        </div>
        {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {t.due_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Due {t.due_date}</span>}
            <StatusBadge status={t.status === 'in_progress' ? 'in-progress' : t.status === 'completed' ? 'completed' : 'pending'} />
          </div>
          <div className="flex gap-2">
            {t.status !== 'in_progress' && t.status !== 'completed' && (
              <Button size="sm" variant="outline" disabled={updatingId === t.id} onClick={() => setStatus(t.id, 'in_progress')}>Start</Button>
            )}
            {t.status !== 'completed' && (
              <Button size="sm" disabled={updatingId === t.id} onClick={() => setStatus(t.id, 'completed')}>
                {updatingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Complete'}
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
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
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
