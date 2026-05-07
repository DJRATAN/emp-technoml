import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Shield, Search, Loader2, UserCheck, UserX, Key, Clock,
  CheckCircle2, XCircle, FileText, Settings, Megaphone, ToggleLeft, Download
} from 'lucide-react';

type AuditEntry = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
};

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  'employee.approved': { icon: UserCheck, color: 'text-success', label: 'Employee Approved' },
  'employee.rejected': { icon: UserX, color: 'text-destructive', label: 'Employee Rejected' },
  'employee.created': { icon: UserCheck, color: 'text-primary', label: 'Employee Created' },
  'employee.deleted': { icon: UserX, color: 'text-destructive', label: 'Employee Deleted' },
  'employee.updated': { icon: UserCheck, color: 'text-primary', label: 'Employee Updated' },
  'password.reset': { icon: Key, color: 'text-warning', label: 'Password Reset' },
  'attendance.corrected': { icon: Clock, color: 'text-primary', label: 'Attendance Corrected' },
  'attendance.modified': { icon: Clock, color: 'text-warning', label: 'Attendance Modified' },
  'leave.approved': { icon: CheckCircle2, color: 'text-success', label: 'Leave Approved' },
  'leave.rejected': { icon: XCircle, color: 'text-destructive', label: 'Leave Rejected' },
  'task.created': { icon: CheckCircle2, color: 'text-primary', label: 'Task Created' },
  'task.updated': { icon: CheckCircle2, color: 'text-primary', label: 'Task Updated' },
  'task.deleted': { icon: XCircle, color: 'text-destructive', label: 'Task Deleted' },
  'settings.updated': { icon: Settings, color: 'text-primary', label: 'Settings Changed' },
  'broadcast.sent': { icon: Megaphone, color: 'text-primary', label: 'Broadcast Sent' },
  'document.uploaded': { icon: FileText, color: 'text-primary', label: 'Document Uploaded' },
  'document.deleted': { icon: FileText, color: 'text-destructive', label: 'Document Deleted' },
  'feature.toggled': { icon: ToggleLeft, color: 'text-warning', label: 'Feature Toggled' },
};

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const loadLogs = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        // Table may not exist yet (migration pending) — swallow gracefully
        const isTableMissing =
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.message?.includes('audit_logs');

        if (!isTableMissing) {
          console.error('Failed to load audit logs:', error);
          toast.error('Failed to load audit logs');
        } else {
          console.warn('audit_logs table not found — migration may be pending.');
        }
        setEntries([]);
      } else {
        setEntries((data as any) ?? []);
      }
    } catch (e) {
      console.error('Unexpected error loading audit logs:', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = entries.filter(e => {
    const matchSearch = search === '' ||
      e.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      (e.entity_id || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || e.action === filterAction;
    return matchSearch && matchAction;
  });

  const uniqueActions = Array.from(new Set(entries.map(e => e.action)));

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function exportCSV() {
    const headers = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = entries.map(e => [
      new Date(e.created_at).toISOString(),
      e.actor_name,
      e.action,
      e.entity_type,
      e.entity_id || '-',
      JSON.stringify(e.details)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-amber-500" />
              Audit Trail
            </h1>
            <p className="text-muted-foreground">Immutable log of every administrative action.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, action..." className="pl-9" />
            </div>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background w-full sm:w-48"
              value={filterAction} onChange={e => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Activity Timeline</h3>
            <Badge variant="secondary">{filtered.length} entries</Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No audit entries found.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((entry, idx) => {
                const config = ACTION_CONFIG[entry.action] || { icon: Shield, color: 'text-muted-foreground', label: entry.action };
                const Icon = config.icon;
                const details = entry.details && Object.keys(entry.details).length > 0
                  ? Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                  : null;

                return (
                  <div key={entry.id} className="flex items-start gap-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors rounded-lg px-2 -mx-2">
                    <div className={`mt-0.5 p-2 rounded-xl bg-muted/50 shrink-0`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{entry.actor_name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{config.label}</Badge>
                      </div>
                      {details && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{details}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatTime(entry.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
