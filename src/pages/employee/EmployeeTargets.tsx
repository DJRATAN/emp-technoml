import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TargetHistory } from '@/components/TargetHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';

type Row = {
  id: string;
  bank: string;
  target: number;
  achieved: number;
  month: string;
  notes: string | null;
  updated_at: string;
};

function monthInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthDbValue(input: string) {
  return `${input}-01`;
}
function monthLabel(iso: string) {
  const [y, m] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function EmployeeTargets() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthInputValue(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('loan_targets')
      .select('id, bank, target, achieved, month, notes, updated_at')
      .eq('user_id', user.id)
      .eq('month', monthDbValue(month))
      .order('bank');
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setDrafts({});
    setLoading(false);
  }, [user, month]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const target = rows.reduce((s, r) => s + r.target, 0);
    const achieved = rows.reduce((s, r) => s + r.achieved, 0);
    const pending = Math.max(0, target - achieved);
    const pct = target ? Math.round((achieved / target) * 100) : 0;
    return { target, achieved, pending, pct };
  }, [rows]);

  async function saveAchieved(row: Row) {
    const draft = drafts[row.id];
    const value = Math.max(0, Number(draft));
    if (Number.isNaN(value)) return toast.error('Enter a valid number');
    setSavingId(row.id);
    const { error } = await supabase.from('loan_targets').update({ achieved: value }).eq('id', row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${row.bank} updated`);
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">My Targets</h1>
            <p className="text-muted-foreground">Update your achieved numbers — admin sets your monthly target</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Month</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Target className="h-4 w-4" /> Total Target</div>
            <p className="text-3xl font-heading font-bold mt-2">{totals.target}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><CheckCircle2 className="h-4 w-4 text-success" /> Completed</div>
            <p className="text-3xl font-heading font-bold mt-2 text-success">{totals.achieved}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="h-4 w-4 text-warning" /> Pending</div>
            <p className="text-3xl font-heading font-bold mt-2 text-warning">{totals.pending}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Overall Progress — {monthLabel(month)}</h3>
            <span className="text-sm font-medium">{totals.pct}%</span>
          </div>
          <Progress value={totals.pct} className="h-3" />
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-semibold mb-4">Bank-wise Breakdown</h3>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No targets assigned for this month yet.</p>
              <p className="text-xs mt-1">Your admin will set your targets soon.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Bank</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Achieved</th>
                    <th className="py-2 pr-4">Pending</th>
                    <th className="py-2 pr-4 w-1/4">Progress</th>
                    <th className="py-2 pr-4">Last updated</th>
                    <th className="py-2 pr-4">Update</th>
                    <th className="py-2"></th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pending = Math.max(0, r.target - r.achieved);
                    const pct = r.target ? Math.round((r.achieved / r.target) * 100) : 0;
                    const draft = drafts[r.id] ?? String(r.achieved);
                    const dirty = Number(draft) !== r.achieved;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium uppercase">{r.bank}</td>
                        <td className="py-3 pr-4">{r.target}</td>
                        <td className="py-3 pr-4 text-success font-medium">{r.achieved}</td>
                        <td className="py-3 pr-4">
                          {pending === 0
                            ? <Badge variant="secondary" className="bg-success/15 text-success">Done</Badge>
                            : <Badge variant="secondary" className="bg-warning/15 text-warning">{pending}</Badge>}
                        </td>
                        <td className="py-3 pr-4"><Progress value={pct} className="h-2" /></td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {new Date(r.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          <Input
                            type="number"
                            min={0}
                            value={draft}
                            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                            className="w-24 h-8"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <Button size="sm" disabled={!dirty || savingId === r.id} onClick={() => saveAchieved(r)}>
                            {savingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                        </td>
                        <td className="py-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" aria-label="History"><History className="h-3.5 w-3.5" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>{r.bank} · history</DialogTitle></DialogHeader>
                              <TargetHistory loanTargetId={r.id} />
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-3 pr-4">TOTAL</td>
                    <td className="py-3 pr-4">{totals.target}</td>
                    <td className="py-3 pr-4 text-success">{totals.achieved}</td>
                    <td className="py-3 pr-4 text-warning">{totals.pending}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
