import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { CheckCircle, Clock, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

export default function EmployeePerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ taskRate: 0, attendanceRate: 0, completed: 0, onTime: 0 });
  const [taskBreakdown, setTaskBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [attByDay, setAttByDay] = useState<{ day: string; present: number; late: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('tasks').select('status').eq('assigned_to', user.id),
      supabase.from('attendance').select('date, status').eq('user_id', user.id).order('date', { ascending: true }).limit(30),
    ]).then(([tasks, atts]) => {
      const t = tasks.data ?? [];
      const completed = t.filter((x) => x.status === 'completed').length;
      const taskRate = t.length ? Math.round((completed / t.length) * 100) : 0;
      setTaskBreakdown([
        { name: 'Completed', value: completed },
        { name: 'In Progress', value: t.filter((x) => x.status === 'in_progress').length },
        { name: 'Pending', value: t.filter((x) => x.status === 'pending').length },
      ]);
      const a = atts.data ?? [];
      const onTime = a.filter((x) => x.status === 'present').length;
      const attendanceRate = a.length ? Math.round((onTime / a.length) * 100) : 0;
      setStats({ taskRate, attendanceRate, completed, onTime });
      const last7 = a.slice(-7);
      setAttByDay(last7.map((r) => ({
        day: new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' }),
        present: r.status === 'present' ? 1 : 0, late: r.status === 'late' ? 1 : 0,
      })));
    });
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Performance</h1>
          <p className="text-muted-foreground">Your productivity and attendance overview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Task Completion" value={`${stats.taskRate}%`} icon={TrendingUp} description={`${stats.completed} completed`} />
          <StatCard label="Attendance Rate" value={`${stats.attendanceRate}%`} icon={Clock} description="Last 30 days" />
          <StatCard label="Tasks Completed" value={stats.completed} icon={CheckCircle} />
          <StatCard label="On-Time Days" value={stats.onTime} icon={Award} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Task Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={taskBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {taskBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Recent Attendance</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="present" stackId="a" fill="hsl(var(--success))" name="Present" />
                <Bar dataKey="late" stackId="a" fill="hsl(var(--warning))" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
