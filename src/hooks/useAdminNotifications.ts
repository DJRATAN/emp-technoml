import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationItem {
  id: string;
  kind: 'pending_employee' | 'pending_leave' | 'overdue_task';
  title: string;
  description: string;
  href: string;
  createdAt: string;
}

export function useAdminNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      setLoading(false); return;
    }
    let cancelled = false;

    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const [pendingEmp, pendingLeave, overdueTasks] = await Promise.all([
        supabase.from('profiles').select('id, full_name, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
        supabase.from('leave_requests').select('id, user_id, leave_type, days, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
        supabase.from('tasks').select('id, title, due_date, assigned_to').lt('due_date', today).neq('status', 'completed').limit(20),
      ]);

      // Names for leave + tasks
      const ids = new Set<string>();
      (pendingLeave.data ?? []).forEach((l) => ids.add(l.user_id));
      (overdueTasks.data ?? []).forEach((t) => t.assigned_to && ids.add(t.assigned_to));
      const profMap = new Map<string, string>();
      if (ids.size) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(ids));
        (profs ?? []).forEach((p) => profMap.set(p.id, p.full_name));
      }

      const next: NotificationItem[] = [];
      (pendingEmp.data ?? []).forEach((p) => next.push({
        id: `emp-${p.id}`, kind: 'pending_employee',
        title: 'Pending employee approval',
        description: p.full_name,
        href: '/admin/employees', createdAt: p.created_at,
      }));
      (pendingLeave.data ?? []).forEach((l) => next.push({
        id: `lv-${l.id}`, kind: 'pending_leave',
        title: `Leave request · ${l.leave_type} (${l.days}d)`,
        description: profMap.get(l.user_id) ?? 'Employee',
        href: '/admin/leave', createdAt: l.created_at,
      }));
      (overdueTasks.data ?? []).forEach((t) => next.push({
        id: `tk-${t.id}`, kind: 'overdue_task',
        title: 'Overdue task',
        description: `${t.title} · ${profMap.get(t.assigned_to ?? '') ?? 'Unassigned'}`,
        href: '/admin/tasks', createdAt: t.due_date ?? '',
      }));
      next.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      if (!cancelled) { setItems(next); setLoading(false); }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  return { items, count: items.length, loading };
}
