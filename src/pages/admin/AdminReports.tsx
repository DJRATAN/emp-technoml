import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

export default function AdminReports() {
  const [perEmp, setPerEmp] = useState<{ name: string; completed: number; pending: number }[]>([]);
  const [attBreakdown, setAttBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [deptDist, setDeptDist] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('status, profiles!tasks_assigned_to_fkey(full_name)'),
      supabase.from('attendance').select('status').gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
      supabase.from('profiles').select('department').eq('status', 'approved'),
    ]).then(([t, a, d]) => {
      const map: Record<string, { name: string; completed: number; pending: number }> = {};
      ((t.data ?? []) as any[]).forEach((r) => {
        const name = r.profiles?.full_name ?? 'Unassigned';
        map[name] = map[name] ?? { name, completed: 0, pending: 0 };
        if (r.status === 'completed') map[name].completed++; else map[name].pending++;
      });
      setPerEmp(Object.values(map).slice(0, 8));

      const ab = { Present: 0, Late: 0, Absent: 0 };
      (a.data ?? []).forEach((r) => {
        if (r.status === 'late') ab.Late++; else if (r.status === 'absent') ab.Absent++; else ab.Present++;
      });
      setAttBreakdown([
        { name: 'Present', value: ab.Present }, { name: 'Late', value: ab.Late }, { name: 'Absent', value: ab.Absent },
      ]);

      const dm: Record<string, number> = {};
      (d.data ?? []).forEach((r: any) => { const k = r.department ?? 'Unassigned'; dm[k] = (dm[k] ?? 0) + 1; });
      setDeptDist(Object.entries(dm).map(([name, value]) => ({ name, value })));
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Productivity, attendance, and team distribution</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Tasks by Employee</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perEmp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" height={70} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" stackId="a" fill="hsl(var(--success))" name="Completed" />
                <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Attendance (last 30 days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={attBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {attBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-heading font-semibold mb-4">Department Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Employees" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
