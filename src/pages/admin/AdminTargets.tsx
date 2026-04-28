import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { CsvBulkUpload } from '@/components/CsvBulkUpload';
import { TargetHistory } from '@/components/TargetHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_BANKS = ['SBI', 'INDUS', 'HSBC', 'HDFC', 'YES', 'AXIS'];

type Profile = { id: string; full_name: string; email: string };
type Row = { id: string; user_id: string; bank: string; target: number; achieved: number; month: string };

function monthInputValue(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function monthDb(input: string) { return `${input}-01`; }

export default function AdminTargets() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthInputValue(new Date()));
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // form
  const [fEmp, setFEmp] = useState<string>('');
  const [fBank, setFBank] = useState(DEFAULT_BANKS[0]);
  const [customBank, setCustomBank] = useState('');
  const [fTarget, setFTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: emps }, { data: tgts }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('status', 'approved').order('full_name'),
      supabase.from('loan_targets').select('id, user_id, bank, target, achieved, month').eq('month', monthDb(month)),
    ]);
    setEmployees((emps as Profile[]) ?? []);
    setRows((tgts as Row[]) ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const byEmp = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const list = map.get(r.user_id) ?? [];
      list.push(r);
      map.set(r.user_id, list);
    });
    return map;
  }, [rows]);

  async function addTarget() {
    if (!user?.companyId) return;
    if (!fEmp) return toast.error('Select an employee');
    const bank = (fBank === '__custom__' ? customBank : fBank).trim().toUpperCase();
    if (!bank) return toast.error('Enter a bank name');
    const t = Number(fTarget);
    if (!t || t < 0) return toast.error('Enter a valid target');
    setSaving(true);
    const { error } = await supabase.from('loan_targets').upsert({
      company_id: user.companyId,
      user_id: fEmp,
      bank,
      month: monthDb(month),
      target: t,
    }, { onConflict: 'user_id,month,bank' });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Target assigned');
    setOpen(false);
    setFEmp(''); setFBank(DEFAULT_BANKS[0]); setCustomBank(''); setFTarget('');
    load();
  }

  async function removeTarget(id: string) {
    const { error } = await supabase.from('loan_targets').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Target removed');
    load();
  }

  async function updateTargetValue(id: string, value: number) {
    const { error } = await supabase.from('loan_targets').update({ target: value }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Employee Targets</h1>
            <p className="text-muted-foreground">Assign monthly loan targets per bank</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
            </div>
            {user?.companyId && (
              <CsvBulkUpload
                employees={employees}
                companyId={user.companyId}
                month={month}
                onSaved={load}
              />
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline"><History className="h-4 w-4 mr-1" />Audit log</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Target changes · {month}</DialogTitle></DialogHeader>
                <TargetHistory companyId={user?.companyId ?? undefined} month={`${month}-01`} limit={100} />
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Assign Target</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign monthly target</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={fEmp} onValueChange={setFEmp}>
                      <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bank / Product</Label>
                    <Select value={fBank} onValueChange={setFBank}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        <SelectItem value="__custom__">Other (custom)…</SelectItem>
                      </SelectContent>
                    </Select>
                    {fBank === '__custom__' && (
                      <Input className="mt-2" placeholder="Custom name" value={customBank} onChange={(e) => setCustomBank(e.target.value)} />
                    )}
                  </div>
                  <div>
                    <Label>Target count</Label>
                    <Input type="number" min={0} value={fTarget} onChange={(e) => setFTarget(e.target.value)} placeholder="e.g. 25" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button disabled={saving} onClick={addTarget}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></Card>
        ) : employees.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No approved employees yet.</Card>
        ) : (
          <div className="space-y-4">
            {employees.map((e) => {
              const list = byEmp.get(e.id) ?? [];
              const tot = list.reduce((s, r) => s + r.target, 0);
              const ach = list.reduce((s, r) => s + r.achieved, 0);
              const pend = Math.max(0, tot - ach);
              return (
                <Card key={e.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-heading font-semibold">{e.full_name}</p>
                      <p className="text-xs text-muted-foreground">{e.email}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">Total: <strong className="text-foreground">{tot}</strong></span>
                      <span className="text-success">Done: <strong>{ach}</strong></span>
                      <span className="text-warning">Pending: <strong>{pend}</strong></span>
                    </div>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No targets assigned yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="py-2 pr-4">Bank</th>
                            <th className="py-2 pr-4">Target</th>
                            <th className="py-2 pr-4">Achieved</th>
                            <th className="py-2 pr-4">Pending</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium uppercase">{r.bank}</td>
                              <td className="py-2 pr-4">
                                <Input
                                  type="number" min={0} defaultValue={r.target}
                                  className="w-20 h-8"
                                  onBlur={(ev) => {
                                    const v = Number(ev.target.value);
                                    if (v !== r.target) updateTargetValue(r.id, v);
                                  }}
                                />
                              </td>
                              <td className="py-2 pr-4 text-success">{r.achieved}</td>
                              <td className="py-2 pr-4 text-warning">{Math.max(0, r.target - r.achieved)}</td>
                              <td className="py-2">
                                <Button size="sm" variant="ghost" onClick={() => removeTarget(r.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
