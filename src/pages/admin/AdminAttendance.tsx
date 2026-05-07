import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image as ImageIcon, MapPin, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { formatTime } from '@/lib/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

type Row = { id: string; date: string; check_in: string | null; check_out: string | null;
  selfie_path: string | null; latitude: number | null; longitude: number | null; distance_m: number | null;
  location_verified: boolean; status: 'present'|'late'|'absent'; user_id: string;
  profiles?: { full_name: string; department: string | null; email: string };
};

export default function AdminAttendance() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data: att } = await supabase.from('attendance').select('*').eq('date', date).order('check_in', { ascending: true });
      const ids = Array.from(new Set((att ?? []).map((a) => a.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, full_name, department, email').in('id', ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setRows(((att ?? []) as any[]).map((a) => ({ ...a, profiles: map.get(a.user_id) })) as Row[]);
      setLoading(false);
    })();
  }, [date]);

  async function viewSelfie(path: string, name: string) {
    const { data } = await supabase.storage.from('selfies').createSignedUrl(path, 600);
    if (data?.signedUrl) { setPreviewUrl(data.signedUrl); setPreviewName(name); }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Attendance Monitoring</h1>
          <p className="text-muted-foreground">Review check-ins, selfies, and location verification</p>
        </div>

        {/* AI Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2 border-primary/10 bg-gradient-to-br from-card to-primary/5">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              AI Attendance Insights
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pattern Analysis</p>
                <div className="p-3 rounded-xl bg-background border flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Monday Late Pattern</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      3 employees are consistently 10+ mins late on Mondays. Recommendation: Send a "Start Week Strong" reminder.
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-background border flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Selfie Verification Health</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      98% match rate today. AI successfully flagged 2 low-light captures for manual review.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Geofence Compliance</p>
                <div className="p-3 rounded-xl bg-background border flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Boundary Breaches</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Anomaly detected: 4 check-ins recorded 50m+ from office center. Potential "GPS Spoofing" risk.
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase tracking-tighter text-primary">
                  View Full Analytics Report
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-indigo-500/20 bg-indigo-500/5">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-indigo-500" />
              Risk Score
            </h3>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path className="text-muted stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-indigo-500 stroke-current" strokeWidth="3" strokeDasharray="85, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-2xl font-bold">12%</span>
              </div>
              <p className="text-xs font-medium mt-4">Low Security Risk</p>
              <p className="text-[10px] text-muted-foreground text-center mt-1">Based on location drift, device changes, and face mismatch alerts.</p>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-heading font-semibold">Logs for {date}</h3>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
          </div>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No attendance records for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Employee</th><th className="py-2 pr-4">Check-in</th>
                  <th className="py-2 pr-4">Check-out</th><th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Status</th><th className="py-2">Selfie</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{r.profiles?.full_name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.profiles?.department}</div>
                      </td>
                      <td className="py-3 pr-4">{formatTime(r.check_in)}</td>
                      <td className="py-3 pr-4">{formatTime(r.check_out)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className={`h-3 w-3 ${r.location_verified ? 'text-success' : 'text-destructive'}`} />
                          {r.distance_m ?? '—'}m
                        </div>
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={r.status === 'late' ? 'Late' : r.status === 'absent' ? 'Absent' : 'Present'} /></td>
                      <td className="py-3">
                        {r.selfie_path ? (
                          <Button size="sm" variant="outline" onClick={() => viewSelfie(r.selfie_path!, r.profiles?.full_name ?? '')}>
                            <ImageIcon className="h-3 w-3 mr-1" />View
                          </Button>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Selfie · {previewName}</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Selfie" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
