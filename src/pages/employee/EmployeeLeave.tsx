import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { daysBetween } from '@/lib/helpers';
import { leaveDeadlineMs, formatRemaining, deadlineSeverity } from '@/lib/sla';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

type Leave = { id: string; leave_type: 'casual'|'sick'|'annual'|'unpaid'; start_date: string;
  end_date: string; days: number; reason: string; status: 'pending'|'approved'|'rejected'; admin_notes: string | null; created_at: string; };

export default function EmployeeLeave() {
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<Leave['leave_type']>('casual');
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('leave_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setLeaves((data as Leave[]) ?? []); setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.companyId || !start || !end || !reason.trim()) return;
    if (end < start) return toast.error('End date cannot be before start date');
    setSubmitting(true);
    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id, company_id: user.companyId, leave_type: type, start_date: start, end_date: end,
      days: daysBetween(start, end), reason: reason.trim(), status: 'pending',
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Leave request submitted');
    setStart(''); setEnd(''); setReason(''); setType('casual'); load();
  }

  function balance(t: Leave['leave_type']) {
    const quotaMap: Record<string, number> = {
      annual: settings?.annual_leave_quota ?? 12, sick: settings?.sick_leave_quota ?? 8,
      casual: settings?.casual_leave_quota ?? 6, unpaid: 999,
    };
    const quota = quotaMap[t];
    const used = leaves.filter((l) => l.leave_type === t && l.status === 'approved').reduce((s, l) => s + l.days, 0);
    return { used, quota, pct: t === 'unpaid' ? 0 : Math.min(100, (used / quota) * 100) };
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Apply for leave and track your requests</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(['annual', 'sick', 'casual'] as const).map((t) => {
            const b = balance(t);
            return (
              <Card key={t} className="p-5">
                <div className="flex justify-between mb-2">
                  <h4 className="font-semibold capitalize">{t} Leave</h4>
                  <span className="text-sm text-muted-foreground">{b.used}/{b.quota}</span>
                </div>
                <Progress value={b.pct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{b.quota - b.used} days remaining</p>
              </Card>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Apply for Leave</h3>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Leave['leave_type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Start Date</Label><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div className="space-y-2"><Label>End Date</Label><Input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} min={start} /></div>
              </div>
              {start && end && end >= start && <p className="text-sm text-muted-foreground">{daysBetween(start, end)} day(s)</p>}
              <div className="space-y-2"><Label>Reason</Label><Textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
              </Button>
            </form>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-semibold mb-4">Leave Status Tracker</h3>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
            ) : leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No leave requests yet.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {leaves.map((l) => {
                  const sla = settings?.leave_approval_sla_hours ?? 48;
                  const showCountdown = l.status === 'pending' && l.created_at;
                  const deadline = showCountdown ? leaveDeadlineMs(l.created_at, sla) : 0;
                  const severity = showCountdown ? deadlineSeverity(deadline) : 'safe';
                  const sevClass = severity === 'overdue' ? 'text-destructive' : severity === 'soon' ? 'text-warning' : 'text-muted-foreground';
                  
                  const steps = [
                    { label: 'Submitted', done: true },
                    { label: 'Under Review', done: l.status !== 'pending' || true },
                    { label: l.status === 'rejected' ? 'Rejected' : 'Approved', done: l.status !== 'pending' },
                  ];
                  const activeStep = l.status === 'pending' ? 1 : 2;
                  
                  return (
                    <div key={l.id} className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-semibold capitalize">{l.leave_type} Leave</span>
                          <span className="text-muted-foreground text-sm ml-2">· {l.days} day(s)</span>
                        </div>
                        <StatusBadge status={l.status === 'approved' ? 'Approved' : l.status === 'rejected' ? 'Rejected' : 'Pending'} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{l.start_date} → {l.end_date}</p>
                      
                      {/* Visual Pipeline */}
                      <div className="flex items-center gap-0 mb-3">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex items-center flex-1">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${
                              idx < activeStep
                                ? (l.status === 'rejected' && idx === 2 ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground')
                                : idx === activeStep
                                ? 'bg-primary/20 text-primary border-2 border-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {idx < activeStep ? '✓' : idx + 1}
                            </div>
                            <span className={`text-[11px] ml-1.5 ${idx <= activeStep ? 'font-medium' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                            {idx < steps.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-2 rounded ${idx < activeStep ? 'bg-primary' : 'bg-muted'}`} />
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-foreground/80">{l.reason}</p>
                      {showCountdown && (
                        <p className={`text-xs flex items-center gap-1 mt-2 ${sevClass}`}>
                          <Clock className="h-3 w-3" /> Approval {formatRemaining(deadline)}
                        </p>
                      )}
                      {l.admin_notes && <p className="text-xs italic text-muted-foreground mt-2 p-2 bg-muted/30 rounded-lg">💬 Admin: {l.admin_notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
