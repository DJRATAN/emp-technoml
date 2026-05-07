import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckSquare, CalendarDays, TrendingUp, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatTime } from '@/lib/helpers';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { EmployeeIdCard } from '@/components/EmployeeIdCard';
import { BirthdaysCard } from '@/components/BirthdaysCard';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const [todayAtt, setTodayAtt] = useState<any>(null);
  const [taskCounts, setTaskCounts] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [leaveBalance, setLeaveBalance] = useState({ used: 0, total: 26 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [streak, setStreak] = useState({ count: 0, isActive: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('tasks').select('id, status').eq('assigned_to', user.id),
      supabase.from('leave_requests').select('days, status').eq('user_id', user.id).eq('status', 'approved'),
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('attendance').select('date').eq('user_id', user.id).gte('date', thirtyDaysAgoStr).order('date', { ascending: false }),
    ]).then(([att, tasks, leaves, recent, history]) => {
      setTodayAtt(att.data);
      const t = tasks.data ?? [];
      setTaskCounts({
        total: t.length,
        completed: t.filter((x) => x.status === 'completed').length,
        inProgress: t.filter((x) => x.status === 'in_progress').length,
      });
      const used = (leaves.data ?? []).reduce((s, l) => s + (l.days ?? 0), 0);
      setLeaveBalance((b) => ({ ...b, used }));
      setRecentTasks(recent.data ?? []);

      // Calculate Streak
      let currentStreak = 0;
      let isActive = !!att.data; // Active if checked in today
      const dates = (history.data ?? []).map((h: any) => h.date);
      
      const checkDate = new Date();
      if (!isActive) {
        checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday if not checked in today
      }

      for (let i = 0; i < 30; i++) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(dStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Ignore weekends (Saturday=6, Sunday=0) for streak calculation
          const day = checkDate.getDay();
          if (day === 0 || day === 6) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break; // Missed a workday
        }
      }
      setStreak({ count: currentStreak, isActive: isActive || currentStreak > 0 });

      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (settings) setLeaveBalance((b) => ({ ...b, total: settings.annual_leave_quota + settings.sick_leave_quota + settings.casual_leave_quota }));
  }, [settings]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-muted-foreground">Here's your day at a glance</p>
          </div>
          
          {/* Streak Widget */}
          {streak.count > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border bg-card shadow-sm ${streak.isActive ? 'border-orange-500/30' : 'opacity-70'}`}>
              <div className="bg-orange-500/10 p-2 rounded-xl">
                <Flame className={`h-6 w-6 ${streak.isActive ? 'text-orange-500 animate-pulse' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Streak</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-heading">{streak.count}</span>
                  <span className="text-sm font-medium">Days</span>
                  {streak.count >= 5 && <Badge variant="secondary" className="ml-2 bg-orange-500/10 text-orange-600 border-none">Early Bird</Badge>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><EmployeeIdCard /></div>
          <BirthdaysCard />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Attendance" value={todayAtt ? (todayAtt.status === 'late' ? 'Late' : 'Present') : 'Not marked'} icon={Clock} description={todayAtt?.check_in ? `Checked in at ${formatTime(todayAtt.check_in)}` : 'Mark your attendance'} />
          <StatCard label="Total Tasks" value={loading ? '…' : taskCounts.total} icon={CheckSquare} description={`${taskCounts.inProgress} in progress`} />
          <StatCard label="Completed" value={loading ? '…' : taskCounts.completed} icon={TrendingUp} description={taskCounts.total ? `${Math.round((taskCounts.completed / taskCounts.total) * 100)}% completion rate` : 'No tasks yet'} />
          <StatCard label="Leave Balance" value={`${leaveBalance.total - leaveBalance.used}/${leaveBalance.total}`} icon={CalendarDays} description="days remaining this year" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold">Recent Tasks</h3>
              <Button variant="ghost" size="sm" asChild><Link to="/employee/tasks">View all</Link></Button>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No tasks assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">Due {t.due_date ?? '—'}</p>
                    </div>
                    <StatusBadge status={t.status === 'in_progress' ? 'In Progress' : t.status === 'completed' ? 'Completed' : 'Pending'} />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button className="w-full justify-start" asChild><Link to="/employee/attendance"><Clock className="h-4 w-4 mr-2" />Mark Attendance</Link></Button>
              <Button variant="outline" className="w-full justify-start" asChild><Link to="/employee/leave"><CalendarDays className="h-4 w-4 mr-2" />Apply for Leave</Link></Button>
              <Button variant="outline" className="w-full justify-start" asChild><Link to="/employee/tasks"><CheckSquare className="h-4 w-4 mr-2" />View My Tasks</Link></Button>
              <Button variant="outline" className="w-full justify-start" asChild><Link to="/employee/performance"><TrendingUp className="h-4 w-4 mr-2" />Performance Stats</Link></Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
