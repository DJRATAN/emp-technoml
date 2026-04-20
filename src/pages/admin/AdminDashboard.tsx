import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Users, UserCheck, CalendarDays, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, pendingLeave: 0, activeTasks: 0 });
  const [trend, setTrend] = useState<any[]>([]);
  const [taskTrend, setTaskTrend] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
      supabase.from('attendance').select('date, status').gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      supabase.from('tasks').select('status, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]).then(([emp, att, leave, tasks, trendData, taskData]) => {
      setStats({ total: emp.count ?? 0, present: att.count ?? 0, pendingLeave: leave.count ?? 0, activeTasks: tasks.count ?? 0 });
      const map: Record<string, { date: string; present: number; late: number }> = {};
      (trendData.data ?? []).forEach((r) => {
        const d = r.date; map[d] = map[d] ?? { date: d.slice(5), present: 0, late: 0 };
        if (r.status === 'late') map[d].late++; else map[d].present++;
      });
      setTrend(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
      const tmap: Record<string, { day: string; created: number; completed: number }> = {};
      (taskData.data ?? []).forEach((r) => {
        const d = r.created_at.split('T')[0];
        tmap[d] = tmap[d] ?? { day: d.slice(5), created: 0, completed: 0 };
        tmap[d].created++; if (r.status === 'completed') tmap[d].completed++;
      });
      setTaskTrend(Object.values(tmap).sort((a, b) => a.day.localeCompare(b.day)));
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Company-wide overview and insights</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={stats.total} icon={Users} description="Approved accounts" />
          <StatCard label="Present Today" value={stats.present} icon={UserCheck} description={stats.total ? `${Math.round((stats.present / stats.total) * 100)}% attendance` : ''} />
          <StatCard label="Pending Leaves" value={stats.pendingLeave} icon={CalendarDays} description="Awaiting your approval" />
          <StatCard label="Active Tasks" value={stats.activeTasks} icon={CheckSquare} description="Not yet completed" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Attendance Trend (7 days)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="present" stackId="a" fill="hsl(var(--success))" name="Present" />
                <Bar dataKey="late" stackId="a" fill="hsl(var(--warning))" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Task Activity (7 days)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={taskTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" name="Created" />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--success))" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
